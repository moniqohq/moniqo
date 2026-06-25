/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package user

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repository is the persistence contract required by Svc.
type Repository interface {
	Create(ctx context.Context, p CreateParams) (models.User, error)
	GetByID(ctx context.Context, id int64) (models.User, error)
	UpdateProfile(ctx context.Context, p UpdateProfileParams) (models.User, error)
	UpdatePassword(ctx context.Context, id int64, hash string) error
	SoftDelete(ctx context.Context, id int64) error
	GetHashByID(ctx context.Context, id int64) (string, error)
}

const verificationTokenTTL = 24 * time.Hour

// Svc implements the business logic for user operations.
type Svc struct {
	repo        Repository
	mailer      email.Enqueuer
	bcryptCost  int
	appBaseURL  string
	tokenSecret []byte
	log         *zap.Logger
}

// NewSvc returns a Svc wired to the given repository, mailer, and configuration.
func NewSvc(repo Repository, mailer email.Enqueuer, bcryptCost int, appBaseURL string, tokenSecret []byte, log *zap.Logger) *Svc {
	return &Svc{
		repo:        repo,
		mailer:      mailer,
		bcryptCost:  bcryptCost,
		appBaseURL:  appBaseURL,
		tokenSecret: tokenSecret,
		log:         log,
	}
}

// Register hashes the password, persists the new user, and enqueues a
// verification email.  The 201 response is returned before the email is sent;
// failures to enqueue are logged but do not fail registration.
func (s *Svc) Register(ctx context.Context, req RegisterRequest) (models.User, error) {
	s.log.Info("registering new user", zap.String("username", req.Username), zap.String("email", req.Email))

	s.log.Debug("hashing password", zap.String("username", req.Username), zap.Int("bcrypt_cost", s.bcryptCost))
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), s.bcryptCost)
	if err != nil {
		s.log.Error("failed to hash password", zap.String("username", req.Username), zap.Error(err))
		return models.User{}, fmt.Errorf("hash password: %w", err)
	}

	s.log.Debug("persisting user via repo", zap.String("username", req.Username))
	pub, err := s.repo.Create(ctx, CreateParams{
		Username: req.Username,
		Email:    req.Email,
		Hash:     string(hash),
		Name:     req.Name,
	})
	if err != nil {
		if errors.Is(err, ErrConflict) {
			s.log.Debug("registration rejected: username or email already taken",
				zap.String("username", req.Username),
				zap.String("email", req.Email),
			)
		} else {
			s.log.Error("failed to persist user", zap.String("username", req.Username), zap.Error(err))
		}
		return models.User{}, fmt.Errorf("create user: %w", err)
	}

	s.log.Info("user registered successfully", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	s.enqueueVerification(ctx, pub)
	return pub, nil
}

// GetByID returns the public-safe profile for the given user id.
func (s *Svc) GetByID(ctx context.Context, id int64) (models.User, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

// ReplaceProfile performs a full profile replacement (PUT semantics).
// Absent name becomes nil; absent picture becomes "".
func (s *Svc) ReplaceProfile(ctx context.Context, id int64, req ReplaceProfileRequest) (models.User, error) {
	s.log.Info("replacing user profile", zap.Int64("user_id", id))
	u, err := s.repo.UpdateProfile(ctx, UpdateProfileParams{
		ID:       id,
		Name:     req.Name,
		Username: req.Username,
		Email:    req.Email,
		Picture:  req.Picture,
	})
	if err != nil {
		return models.User{}, fmt.Errorf("update profile: %w", err)
	}
	return u, nil
}

// PatchProfile applies only the non-nil fields from req to the current profile.
// If both CurrentPassword and NewPassword are set, it also changes the password
// after verifying the current one.
func (s *Svc) PatchProfile(ctx context.Context, id int64, req PatchProfileRequest) (models.User, error) {
	s.log.Info("patching user profile", zap.Int64("user_id", id))

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}

	updated, err := s.repo.UpdateProfile(ctx, mergeProfileFields(id, current, req))
	if err != nil {
		return models.User{}, fmt.Errorf("update profile: %w", err)
	}

	if req.CurrentPassword != nil && req.NewPassword != nil {
		if err := s.changePassword(ctx, id, *req.CurrentPassword, *req.NewPassword); err != nil {
			return models.User{}, err
		}
	}

	return updated, nil
}

// mergeProfileFields overlays the non-nil patch fields onto the current profile
// and returns an UpdateProfileParams ready for the repository.
func mergeProfileFields(id int64, current models.User, req PatchProfileRequest) UpdateProfileParams {
	name := current.Name
	if req.Name != nil {
		name = req.Name
	}
	username := current.Username
	if req.Username != nil {
		username = *req.Username
	}
	emailAddr := current.Email
	if req.Email != nil {
		emailAddr = *req.Email
	}
	picture := current.Picture
	if req.Picture != nil {
		picture = *req.Picture
	}
	return UpdateProfileParams{
		ID:       id,
		Name:     name,
		Username: username,
		Email:    emailAddr,
		Picture:  picture,
	}
}

// Delete soft-deletes the user. It is idempotent.
func (s *Svc) Delete(ctx context.Context, id int64) error {
	s.log.Info("soft-deleting user", zap.Int64("user_id", id))
	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}
	return nil
}

// verificationToken returns a time-limited HMAC-SHA256 token that encodes the
// user ID and a 24-hour expiry.  The token is self-verifying: the verification
// endpoint can decode and validate it without a DB lookup.
//
// Format: base64url(payload) "." base64url(sig)
// where payload = "verify:<userID>:<expiryUnix>"
func (s *Svc) verificationToken(userID int64) string {
	expirySec := time.Now().Add(verificationTokenTTL).Unix()
	payload := fmt.Sprintf("verify:%d:%d", userID, expirySec)
	mac := hmac.New(sha256.New, s.tokenSecret)
	_, _ = mac.Write([]byte(payload))
	sig := mac.Sum(nil)
	return base64.RawURLEncoding.EncodeToString([]byte(payload)) +
		"." +
		base64.RawURLEncoding.EncodeToString(sig)
}

// changePassword verifies currentPwd against the stored hash and, if it
// matches, replaces it with a bcrypt hash of newPwd.
func (s *Svc) changePassword(ctx context.Context, id int64, currentPwd, newPwd string) error {
	hash, err := s.repo.GetHashByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get hash by id: %w", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(currentPwd)); err != nil {
		return ErrWrongPassword
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPwd), s.bcryptCost)
	if err != nil {
		s.log.Error("failed to hash new password", zap.Int64("user_id", id), zap.Error(err))
		return fmt.Errorf("hash new password: %w", err)
	}
	if err := s.repo.UpdatePassword(ctx, id, string(newHash)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (s *Svc) enqueueVerification(ctx context.Context, u models.User) {
	name := ""
	if u.Name != nil {
		name = *u.Name
	}
	token := s.verificationToken(u.ID)
	verURL := fmt.Sprintf("%s/verify?token=%s", s.appBaseURL, token)

	err := s.mailer.Enqueue(ctx, email.EnqueueParams{
		IdempotencyKey: fmt.Sprintf("verification:%d", u.ID),
		Template:       email.TemplateVerification,
		To:             u.Email,
		ToName:         name,
		Payload: map[string]any{
			"Name":            name,
			"VerificationURL": verURL,
			"ExpiresIn":       "24 hours",
		},
	})
	if err != nil {
		s.log.Error("failed to enqueue verification email",
			zap.Int64("user_id", u.ID),
			zap.Error(err),
		)
	}
}
