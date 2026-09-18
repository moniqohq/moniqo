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
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/storage"
	"github.com/moniqohq/moniqo/apps/backend/internal/storage/local"
)

// Repository is the persistence contract required by Svc.
type Repository interface {
	Create(ctx context.Context, p CreateParams) (models.User, error)
	GetByID(ctx context.Context, id int64) (models.User, error)
	UpdateProfile(ctx context.Context, p UpdateProfileParams) (models.User, error)
	UpdatePassword(ctx context.Context, id int64, hash string) error
	SoftDelete(ctx context.Context, id int64) error
	GetHashByID(ctx context.Context, id int64) (string, error)
	Activate(ctx context.Context, id int64) error
	GetAvatarMeta(ctx context.Context, id int64) (AvatarMeta, string, error)
	SetAvatar(ctx context.Context, p SetAvatarParams) (models.User, error)
	ClearAvatar(ctx context.Context, id int64) (models.User, error)
}

const (
	verificationTokenTTL = 24 * time.Hour
	tokenPartsCount      = 2
	payloadFieldsCount   = 3

	// avatarKeySuffixBytes is the length, in random bytes, of the unique
	// suffix in a minted avatar storage key (see newAvatarKey).
	avatarKeySuffixBytes = 8
	// avatarKeyShardModulus buckets avatar keys into 256 shard directories
	// (see the key layout convention documented in internal/storage/storage.go).
	avatarKeyShardModulus = 256
)

// Svc implements the business logic for user operations.
type Svc struct {
	repo        Repository
	mailer      email.Enqueuer
	bcryptCost  int
	appBaseURL  string
	tokenSecret []byte
	log         *zap.Logger
	store       storage.Storage
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

// SetStorage wires the object store used for uploaded avatars. When unset,
// the picture upload/get/delete endpoints return an internal error rather
// than failing at startup — this mirrors how OIDC provider registration
// degrades when a provider is unconfigured.
func (s *Svc) SetStorage(store storage.Storage) {
	s.store = store
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
			s.log.Debug(
				"registration rejected: username or email already taken",
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
// Absent name becomes nil. picture is server-managed (see PictureUpload /
// SetPicture) and is never accepted from the request body — the current
// value is always carried forward, so a PUT can never desync users.picture
// from a stored avatar or blank one out from under it.
func (s *Svc) ReplaceProfile(ctx context.Context, id int64, req ReplaceProfileRequest) (models.User, error) {
	s.log.Info("replacing user profile", zap.Int64("user_id", id))

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}

	u, err := s.repo.UpdateProfile(ctx, UpdateProfileParams{
		ID:       id,
		Name:     req.Name,
		Username: req.Username,
		Email:    req.Email,
		Picture:  current.Picture,
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
// and returns an UpdateProfileParams ready for the repository. picture is
// server-managed (see PictureUpload / SetPicture) and is never taken from
// req — the validator rejects a non-nil req.Picture before this is reached,
// but the current value is carried forward here regardless, defense in depth
// against picture ever desyncing from a stored avatar.
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
	return UpdateProfileParams{
		ID:       id,
		Name:     name,
		Username: username,
		Email:    emailAddr,
		Picture:  current.Picture,
	}
}

// Delete soft-deletes the user. It is idempotent. If the user has a stored
// avatar, its DB reference is cleared before the soft delete (so ClearAvatar's
// deleted_at IS NULL guard still matches) and the underlying object is
// removed on a best-effort basis afterward — the avatar GET endpoint is
// public, so leaving bytes reachable after account deletion would be a real
// (if minor) data-retention issue.
//
//nolint:revive // the avatar cleanup steps are sequential and read more clearly inline than split up
func (s *Svc) Delete(ctx context.Context, id int64) error {
	s.log.Info("soft-deleting user", zap.Int64("user_id", id))

	meta, _, metaErr := s.repo.GetAvatarMeta(ctx, id)
	hasAvatar := metaErr == nil && meta.Key != ""
	if hasAvatar {
		if _, err := s.repo.ClearAvatar(ctx, id); err != nil {
			s.log.Error("failed to clear avatar before delete", zap.Int64("user_id", id), zap.Error(err))
		}
	}

	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}

	if hasAvatar && s.store != nil {
		if err := s.store.Delete(ctx, meta.Key); err != nil {
			s.log.Error("failed to delete avatar object after soft delete", zap.Int64("user_id", id), zap.Error(err))
		}
	}
	return nil
}

// SetPicture validates the caller's provided image bytes are already
// sniffed/allowlisted (see the handler layer) and stores them, replacing any
// existing avatar. Ordering matters for crash-safety: the new object is
// written before the DB is updated, and the old object is only removed after
// the DB commit succeeds — so a crash can leave an orphaned file, but never a
// users.picture URL that fails to resolve.
//
//nolint:revive // the write-then-commit-then-cleanup ordering is the point of this function and is clearer inline
func (s *Svc) SetPicture(ctx context.Context, id int64, in PictureUpload) (models.User, error) {
	if s.store == nil {
		return models.User{}, ErrStorageUnavailable
	}

	oldMeta, _, err := s.repo.GetAvatarMeta(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("get avatar meta: %w", err)
	}

	// Re-uploading identical bytes is a no-op: skip the write and deletion churn.
	if oldMeta.Key != "" && oldMeta.ETag == in.ETag {
		u, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return models.User{}, fmt.Errorf("get user by id: %w", err)
		}
		return u, nil
	}

	newKey, err := newAvatarKey(id, in.ContentType)
	if err != nil {
		return models.User{}, fmt.Errorf("generate avatar key: %w", err)
	}

	if err := s.store.Put(ctx, newKey, bytes.NewReader(in.Data), storage.ObjectMeta{
		ContentType: in.ContentType,
		Size:        int64(len(in.Data)),
		ETag:        in.ETag,
	}); err != nil {
		return models.User{}, fmt.Errorf("put avatar: %w", err)
	}

	updated, err := s.repo.SetAvatar(ctx, SetAvatarParams{
		ID:          id,
		Key:         newKey,
		ContentType: in.ContentType,
		ETag:        in.ETag,
		Size:        int64(len(in.Data)),
		PublicURL:   picturePublicURL(id),
	})
	if err != nil {
		if delErr := s.store.Delete(ctx, newKey); delErr != nil {
			s.log.Error("failed to clean up new avatar object after DB failure", zap.Int64("user_id", id), zap.Error(delErr))
		}
		return models.User{}, fmt.Errorf("set avatar: %w", err)
	}

	if oldMeta.Key != "" && oldMeta.Key != newKey {
		if err := s.store.Delete(ctx, oldMeta.Key); err != nil {
			s.log.Error("failed to delete replaced avatar object", zap.Int64("user_id", id), zap.Error(err))
		}
	}

	return updated, nil
}

// DeletePicture clears the user's avatar (both the stored file, if any, and
// an inherited OIDC picture URL). It is idempotent. The DB is cleared before
// the object is deleted, so a crash never leaves users.picture pointing at
// bytes that were removed.
func (s *Svc) DeletePicture(ctx context.Context, id int64) (models.User, error) {
	oldMeta, _, err := s.repo.GetAvatarMeta(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("get avatar meta: %w", err)
	}

	updated, err := s.repo.ClearAvatar(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("clear avatar: %w", err)
	}

	if oldMeta.Key != "" && s.store != nil {
		if err := s.store.Delete(ctx, oldMeta.Key); err != nil {
			s.log.Error("failed to delete avatar object", zap.Int64("user_id", id), zap.Error(err))
		}
	}

	return updated, nil
}

// OpenPicture resolves how (and whether) to serve the user's profile
// picture: a stored file to stream, an external URL to redirect to, or
// ErrNoPicture. Returns ErrNotFound if the user is gone or soft-deleted.
//
//nolint:revive // the stored/external/none decision tree is clearer as one function than split up
func (s *Svc) OpenPicture(ctx context.Context, id int64) (PictureResult, error) {
	meta, pictureURL, err := s.repo.GetAvatarMeta(ctx, id)
	if err != nil {
		return PictureResult{}, fmt.Errorf("get avatar meta: %w", err)
	}

	if meta.Key != "" {
		if s.store == nil {
			return PictureResult{}, ErrStorageUnavailable
		}
		body, _, err := s.store.Get(ctx, meta.Key)
		if err != nil {
			if errors.Is(err, storage.ErrNotFound) {
				// The DB references a key the store no longer has — treat as
				// absent rather than surfacing a 500 to the client.
				s.log.Error("avatar key referenced in DB but missing from storage",
					zap.Int64("user_id", id), zap.String("key", meta.Key))
				return PictureResult{}, ErrNoPicture
			}
			return PictureResult{}, fmt.Errorf("open avatar: %w", err)
		}
		return PictureResult{Kind: PictureStored, Body: body, Meta: meta}, nil
	}

	if pictureURL != "" {
		return PictureResult{Kind: PictureExternal, ExternalURL: pictureURL}, nil
	}

	return PictureResult{}, ErrNoPicture
}

// picturePublicURL returns the stable, server-relative URL clients should
// use to fetch a user's profile picture, regardless of whether it is backed
// by local storage, a future S3 backend, or (indirectly, via redirect) an
// external OIDC provider.
func picturePublicURL(id int64) string {
	return fmt.Sprintf("/api/v1/users/%d/picture", id)
}

// newAvatarKey mints a fresh, collision-resistant storage key for a new
// avatar upload. Keys are never reused across uploads (even for the same
// user), which is what makes replacing an avatar safe: the new object is
// written under a new key before the old one is deleted.
func newAvatarKey(id int64, contentType string) (string, error) {
	suffix, err := local.RandomKeySuffix(avatarKeySuffixBytes)
	if err != nil {
		return "", fmt.Errorf("generate avatar key suffix: %w", err)
	}
	shard := uint8(id % avatarKeyShardModulus) //nolint:gosec // id is always non-negative
	return fmt.Sprintf("avatars/%02x/%d/%s.%s", shard, id, suffix, avatarExtension(contentType)), nil
}

// avatarExtension returns a human-debuggable file extension for an
// allowlisted content type. It is never used to determine what gets served
// back to the client — that always comes from the stored ContentType.
func avatarExtension(contentType string) string {
	switch contentType {
	case "image/jpeg":
		return "jpg"
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "bin"
	}
}

// VerifyEmail validates the token from the verification email and, if valid,
// activates the user account.
func (s *Svc) VerifyEmail(ctx context.Context, token string) error {
	userID, err := s.parseVerificationToken(token)
	if err != nil {
		return err
	}
	if err := s.repo.Activate(ctx, userID); err != nil {
		return fmt.Errorf("activate user: %w", err)
	}
	return nil
}

// parseVerificationToken decodes and validates a verification token, returning
// the embedded user ID on success.
func (s *Svc) parseVerificationToken(token string) (int64, error) {
	parts := strings.SplitN(token, ".", tokenPartsCount)
	if len(parts) != tokenPartsCount {
		return 0, ErrInvalidVerificationToken
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return 0, ErrInvalidVerificationToken
	}
	sigBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return 0, ErrInvalidVerificationToken
	}

	mac := hmac.New(sha256.New, s.tokenSecret)
	_, _ = mac.Write(payloadBytes)
	if !hmac.Equal(mac.Sum(nil), sigBytes) {
		return 0, ErrInvalidVerificationToken
	}

	return parseVerificationPayload(string(payloadBytes))
}

// parseVerificationPayload decodes "verify:<userID>:<expiryUnix>" and checks
// the expiry, returning the user ID on success.
func parseVerificationPayload(payload string) (int64, error) {
	fields := strings.SplitN(payload, ":", payloadFieldsCount)
	if len(fields) != payloadFieldsCount || fields[0] != "verify" {
		return 0, ErrInvalidVerificationToken
	}

	userID, err := strconv.ParseInt(fields[1], 10, 64)
	if err != nil {
		return 0, ErrInvalidVerificationToken
	}
	expiry, err := strconv.ParseInt(fields[2], 10, 64)
	if err != nil {
		return 0, ErrInvalidVerificationToken
	}
	if time.Now().Unix() > expiry {
		return 0, ErrInvalidVerificationToken
	}
	return userID, nil
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
// matches, replaces it with a bcrypt hash of newPwd. This also invalidates
// every existing session for the user (see Repository.UpdatePassword), so the
// caller's own access token stops working once it expires and its refresh
// token is revoked — the client must treat a successful change as a logout.
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
	verURL := fmt.Sprintf("%s/api/v1/users/verify?token=%s", s.appBaseURL, token)

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
		s.log.Error(
			"failed to enqueue verification email",
			zap.Int64("user_id", u.ID),
			zap.Error(err),
		)
	}
}
