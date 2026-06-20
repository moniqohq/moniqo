package user

import (
	"context"
	"crypto/hmac"
	"errors"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// UserRepository is the persistence contract required by UserSvc.
type UserRepository interface {
	Create(ctx context.Context, p CreateParams) (models.User, error)
	GetByID(ctx context.Context, id int64) (models.User, error)
	UpdateProfile(ctx context.Context, p UpdateProfileParams) (models.User, error)
	UpdatePassword(ctx context.Context, id int64, hash string) error
	SoftDelete(ctx context.Context, id int64) error
	GetHashByID(ctx context.Context, id int64) (string, error)
}

// UserSvc implements the business logic for user operations.
type UserSvc struct {
	repo        UserRepository
	mailer      email.Enqueuer
	bcryptCost  int
	appBaseURL  string
	tokenSecret []byte
	log         *zap.Logger
}

func NewUserSvc(repo UserRepository, mailer email.Enqueuer, bcryptCost int, appBaseURL string, tokenSecret []byte, log *zap.Logger) *UserSvc {
	return &UserSvc{
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
func (s *UserSvc) Register(ctx context.Context, req RegisterRequest) (models.User, error) {
	s.log.Info("registering new user", zap.String("username", req.Username), zap.String("email", req.Email))

	s.log.Debug("hashing password", zap.String("username", req.Username), zap.Int("bcrypt_cost", s.bcryptCost))
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), s.bcryptCost)
	if err != nil {
		s.log.Error("failed to hash password", zap.String("username", req.Username), zap.Error(err))
		return models.User{}, err
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
			s.log.Debug("registration rejected: username or email already taken", zap.String("username", req.Username), zap.String("email", req.Email))
		} else {
			s.log.Error("failed to persist user", zap.String("username", req.Username), zap.Error(err))
		}
		return models.User{}, err
	}

	s.log.Info("user registered successfully", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	s.enqueueVerification(ctx, pub)
	return pub, nil
}

// verificationToken returns a time-limited HMAC-SHA256 token that encodes the
// user ID and a 24-hour expiry.  The token is self-verifying: the verification
// endpoint can decode and validate it without a DB lookup.
//
// Format: base64url(payload) "." base64url(sig)
// where payload = "verify:<userID>:<expiryUnix>"
func (s *UserSvc) verificationToken(userID int64) string {
	expiry := time.Now().Add(24 * time.Hour).Unix()
	payload := fmt.Sprintf("verify:%d:%d", userID, expiry)
	mac := hmac.New(sha256.New, s.tokenSecret)
	mac.Write([]byte(payload))
	sig := mac.Sum(nil)
	return base64.RawURLEncoding.EncodeToString([]byte(payload)) +
		"." +
		base64.RawURLEncoding.EncodeToString(sig)
}

// GetByID returns the public-safe profile for the given user id.
func (s *UserSvc) GetByID(ctx context.Context, id int64) (models.User, error) {
	return s.repo.GetByID(ctx, id)
}

// ReplaceProfile performs a full profile replacement (PUT semantics).
// Absent name becomes nil; absent picture becomes "".
func (s *UserSvc) ReplaceProfile(ctx context.Context, id int64, req ReplaceProfileRequest) (models.User, error) {
	s.log.Info("replacing user profile", zap.Int64("user_id", id))
	return s.repo.UpdateProfile(ctx, UpdateProfileParams{
		ID:       id,
		Name:     req.Name,
		Username: req.Username,
		Email:    req.Email,
		Picture:  req.Picture,
	})
}

// PatchProfile applies only the non-nil fields from req to the current profile.
// If both CurrentPassword and NewPassword are set, it also changes the password
// after verifying the current one.
func (s *UserSvc) PatchProfile(ctx context.Context, id int64, req PatchProfileRequest) (models.User, error) {
	s.log.Info("patching user profile", zap.Int64("user_id", id))

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.User{}, err
	}

	// Merge only present fields onto current values.
	name := current.Name
	if req.Name != nil {
		name = req.Name
	}
	username := current.Username
	if req.Username != nil {
		username = *req.Username
	}
	email := current.Email
	if req.Email != nil {
		email = *req.Email
	}
	picture := current.Picture
	if req.Picture != nil {
		picture = *req.Picture
	}

	updated, err := s.repo.UpdateProfile(ctx, UpdateProfileParams{
		ID:       id,
		Name:     name,
		Username: username,
		Email:    email,
		Picture:  picture,
	})
	if err != nil {
		return models.User{}, err
	}

	if req.CurrentPassword != nil && req.NewPassword != nil {
		hash, err := s.repo.GetHashByID(ctx, id)
		if err != nil {
			return models.User{}, err
		}
		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(*req.CurrentPassword)); err != nil {
			return models.User{}, ErrWrongPassword
		}
		newHash, err := bcrypt.GenerateFromPassword([]byte(*req.NewPassword), s.bcryptCost)
		if err != nil {
			s.log.Error("failed to hash new password", zap.Int64("user_id", id), zap.Error(err))
			return models.User{}, err
		}
		if err := s.repo.UpdatePassword(ctx, id, string(newHash)); err != nil {
			return models.User{}, err
		}
	}

	return updated, nil
}

// Delete soft-deletes the user. It is idempotent.
func (s *UserSvc) Delete(ctx context.Context, id int64) error {
	s.log.Info("soft-deleting user", zap.Int64("user_id", id))
	return s.repo.SoftDelete(ctx, id)
}

func (s *UserSvc) enqueueVerification(ctx context.Context, u models.User) {
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
