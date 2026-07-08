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

package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repository is the persistence contract for authentication operations.
type Repository interface {
	GetUserByEmail(ctx context.Context, emailAddr string) (UserCredentials, error)
	UpdateLastLogin(ctx context.Context, userID int64) error
	IsAccessTokenRevoked(ctx context.Context, jti pgtype.UUID) (bool, error)
	GetUserByID(ctx context.Context, userID int64) (models.User, error)
	LogoutTransaction(ctx context.Context, p LogoutParams) error

	InsertRefreshToken(ctx context.Context, p InsertRefreshTokenRepoParams) ([16]byte, error)
	GetRefreshTokenByHash(ctx context.Context, hash string) (db.RefreshToken, error)
	MarkRefreshTokenUsed(ctx context.Context, id [16]byte) error
	RevokeRefreshTokenFamily(ctx context.Context, familyID [16]byte, reason string) error
	RotateRefreshToken(ctx context.Context, oldID [16]byte, p InsertRefreshTokenRepoParams) ([16]byte, error)
}

// Svc implements authentication business logic.
type Svc struct {
	repo               Repository
	jwtSecret          []byte
	accessTokenTTL     time.Duration
	refreshTokenTTL    time.Duration
	refreshTokenMaxAge time.Duration
	log                *zap.Logger
}

// NewSvc returns an Svc wired to the given repository and JWT configuration.
func NewSvc(
	repo Repository,
	jwtSecret []byte,
	accessTokenTTL time.Duration,
	refreshTokenTTL time.Duration,
	refreshTokenMaxAge time.Duration,
	log *zap.Logger,
) *Svc {
	return &Svc{
		repo:               repo,
		jwtSecret:          jwtSecret,
		accessTokenTTL:     accessTokenTTL,
		refreshTokenTTL:    refreshTokenTTL,
		refreshTokenMaxAge: refreshTokenMaxAge,
		log:                log,
	}
}

// Login verifies credentials, enforces account status, issues an access token,
// and updates last_login on success.
func (s *Svc) Login(ctx context.Context, req LoginRequest) (LoginResult, error) {
	s.log.Info("processing login", zap.String("email", req.Email))

	creds, err := s.repo.GetUserByEmail(ctx, req.Email)
	if errors.Is(err, ErrUserNotFound) {
		s.log.Debug("login rejected: user not found", zap.String("email", req.Email))
		return LoginResult{}, ErrInvalidCredentials
	}
	if err != nil {
		s.log.Error("login: repo error on GetUserByEmail", zap.String("email", req.Email), zap.Error(err))
		return LoginResult{}, fmt.Errorf("get user by email: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(creds.Hash), []byte(req.Password)); err != nil {
		s.log.Debug("login rejected: password mismatch", zap.String("email", req.Email))
		return LoginResult{}, ErrInvalidCredentials
	}

	if creds.User.Status == models.UserStatusPendingVerification {
		s.log.Debug("login rejected: account pending verification", zap.String("email", req.Email))
		return LoginResult{}, ErrPendingVerification
	}

	tokenString, _, err := GenerateAccessToken(creds.User.ID, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		s.log.Error("login: JWT generation failed", zap.String("email", req.Email), zap.Error(err))
		return LoginResult{}, err
	}

	refreshIssue, err := s.IssueRefreshToken(ctx, creds.User.ID)
	if err != nil {
		s.log.Error("login: refresh token issuance failed", zap.String("email", req.Email), zap.Error(err))
		return LoginResult{}, err
	}

	if err := s.repo.UpdateLastLogin(ctx, creds.User.ID); err != nil {
		s.log.Error("login: failed to update last_login", zap.Int64("user_id", creds.User.ID), zap.Error(err))
		return LoginResult{}, fmt.Errorf("update last login: %w", err)
	}

	s.log.Info("login successful", zap.Int64("user_id", creds.User.ID))
	return LoginResult{
		AccessToken:           tokenString,
		TokenType:             "Bearer",
		RefreshToken:          refreshIssue.RawToken,
		RefreshTokenExpiresAt: refreshIssue.ExpiresAt,
	}, nil
}

// IssueRefreshToken creates a new token family and inserts the first refresh
// token row. Returns the raw token (sent to the client) and its expiry.
func (s *Svc) IssueRefreshToken(ctx context.Context, userID int64) (RefreshIssue, error) {
	raw, hash, err := GenerateRefreshToken()
	if err != nil {
		return RefreshIssue{}, err
	}

	familyID := uuid.New()
	now := time.Now()
	expiresAt := now.Add(s.refreshTokenTTL)
	absoluteExpiresAt := now.Add(s.refreshTokenMaxAge)

	if _, err := s.repo.InsertRefreshToken(ctx, InsertRefreshTokenRepoParams{
		FamilyID:          familyID,
		UserID:            userID,
		TokenHash:         hash,
		ExpiresAt:         expiresAt,
		AbsoluteExpiresAt: absoluteExpiresAt,
	}); err != nil {
		return RefreshIssue{}, fmt.Errorf("insert refresh token: %w", err)
	}

	return RefreshIssue{RawToken: raw, ExpiresAt: expiresAt}, nil
}

// RefreshAccessToken validates rawToken, detects reuse, rotates the token, and
// mints a new access token. Returns ErrRefreshTokenInvalid for all invalid/
// rejected states so the handler never leaks the specific failure reason.
func (s *Svc) RefreshAccessToken(ctx context.Context, rawToken string) (RefreshResult, error) {
	hash := HashRefreshToken(rawToken)

	row, err := s.repo.GetRefreshTokenByHash(ctx, hash)
	if errors.Is(err, ErrRefreshTokenInvalid) {
		return RefreshResult{}, ErrRefreshTokenInvalid
	}
	if err != nil {
		return RefreshResult{}, fmt.Errorf("get refresh token by hash: %w", err)
	}

	now := time.Now()

	if err := s.validateRefreshTokenState(ctx, row, now); err != nil {
		return RefreshResult{}, err
	}

	newRaw, newHash, err := GenerateRefreshToken()
	if err != nil {
		return RefreshResult{}, err
	}

	newExpiresAt := clampExpiry(now.Add(s.refreshTokenTTL), row.AbsoluteExpiresAt)

	if _, err := s.repo.RotateRefreshToken(ctx, row.ID.Bytes, InsertRefreshTokenRepoParams{
		FamilyID:          row.FamilyID.Bytes,
		UserID:            row.UserID,
		TokenHash:         newHash,
		ExpiresAt:         newExpiresAt,
		AbsoluteExpiresAt: row.AbsoluteExpiresAt.Time,
	}); err != nil {
		return RefreshResult{}, fmt.Errorf("rotate refresh token: %w", err)
	}

	accessToken, _, err := GenerateAccessToken(row.UserID, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		return RefreshResult{}, err
	}

	return RefreshResult{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		Refresh:     RefreshIssue{RawToken: newRaw, ExpiresAt: newExpiresAt},
	}, nil
}

// Logout atomically blocklists the access token JTI and, if a refresh token
// hash is provided, marks that refresh token as revoked with reason "logout".
func (s *Svc) Logout(ctx context.Context, params LogoutParams) error {
	s.log.Info("processing logout", zap.Int64("user_id", params.UserID))

	if err := s.repo.LogoutTransaction(ctx, params); err != nil {
		s.log.Error("logout: transaction failed", zap.Int64("user_id", params.UserID), zap.Error(err))
		return fmt.Errorf("logout transaction: %w", err)
	}

	s.log.Info("logout successful", zap.Int64("user_id", params.UserID))
	return nil
}

// validateRefreshTokenState checks the token's state and revokes the family on
// reuse detection. All invalid states return ErrRefreshTokenInvalid.
func (s *Svc) validateRefreshTokenState(ctx context.Context, row db.RefreshToken, now time.Time) error {
	if row.RevokedAt.Valid {
		return ErrRefreshTokenInvalid
	}
	if row.UsedAt.Valid {
		s.log.Warn("refresh token reuse detected — revoking family",
			zap.String("family_id", row.FamilyID.String()))
		_ = s.repo.RevokeRefreshTokenFamily(ctx, row.FamilyID.Bytes, "reuse_detected")
		return ErrRefreshTokenInvalid
	}
	if row.ExpiresAt.Valid && now.After(row.ExpiresAt.Time) {
		return ErrRefreshTokenInvalid
	}
	if row.AbsoluteExpiresAt.Valid && now.After(row.AbsoluteExpiresAt.Time) {
		return ErrRefreshTokenInvalid
	}
	return nil
}

// clampExpiry returns proposed unless abs is valid and comes sooner.
func clampExpiry(proposed time.Time, abs pgtype.Timestamptz) time.Time {
	if abs.Valid && proposed.After(abs.Time) {
		return abs.Time
	}
	return proposed
}

// PasswordResetSvc handles the password reset flow.
type PasswordResetSvc struct {
	repo       PasswordResetRepository
	mailer     email.Enqueuer
	bcryptCost int
	tokenTTL   time.Duration
	appBaseURL string
	log        *zap.Logger
}

// NewPasswordResetSvc returns a PasswordResetSvc wired to the given dependencies.
func NewPasswordResetSvc(
	repo PasswordResetRepository,
	mailer email.Enqueuer,
	bcryptCost int,
	tokenTTL time.Duration,
	appBaseURL string,
	log *zap.Logger,
) *PasswordResetSvc {
	return &PasswordResetSvc{
		repo:       repo,
		mailer:     mailer,
		bcryptCost: bcryptCost,
		tokenTTL:   tokenTTL,
		appBaseURL: appBaseURL,
		log:        log,
	}
}

// RequestReset initiates a password reset for the given email address.
// It always returns nil — even when the email does not exist — to prevent
// user enumeration. Send failures are logged but do not affect the response.
func (s *PasswordResetSvc) RequestReset(ctx context.Context, req RequestResetRequest) error {
	user, err := s.repo.GetUserForPasswordReset(ctx, req.Email)
	if errors.Is(err, ErrUserNotFound) {
		s.log.Debug("password reset: email not found — no-op", zap.String("email", req.Email))
		return nil
	}
	if err != nil {
		s.log.Error("password reset: failed to look up user", zap.String("email", req.Email), zap.Error(err))
		return fmt.Errorf("look up user: %w", err)
	}

	if err := s.repo.InvalidateUserPasswordResetTokens(ctx, user.ID); err != nil {
		s.log.Error("password reset: failed to invalidate existing tokens", zap.Int64("user_id", user.ID), zap.Error(err))
		return fmt.Errorf("invalidate existing tokens: %w", err)
	}

	raw, hash, err := GeneratePasswordResetToken()
	if err != nil {
		s.log.Error("password reset: token generation failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return fmt.Errorf("generate token: %w", err)
	}

	expiresAt := time.Now().Add(s.tokenTTL)
	if err := s.repo.InsertPasswordResetToken(ctx, user.ID, hash, expiresAt); err != nil {
		s.log.Error("password reset: failed to insert token", zap.Int64("user_id", user.ID), zap.Error(err))
		return fmt.Errorf("insert token: %w", err)
	}

	s.enqueueResetEmail(ctx, user, raw)
	return nil
}

// ConfirmReset validates the reset token, updates the password, and invalidates
// all active tokens for the user. Returns ErrInvalidResetToken for any token
// validation failure (not found, used, expired) — the caller must not reveal
// which condition triggered the error.
func (s *PasswordResetSvc) ConfirmReset(ctx context.Context, req ConfirmResetRequest) error {
	hash := HashRefreshToken(req.Token)

	row, err := s.repo.GetPasswordResetTokenByHash(ctx, hash)
	if errors.Is(err, ErrInvalidResetToken) {
		return ErrInvalidResetToken
	}
	if err != nil {
		s.log.Error("password reset confirm: repo error", zap.Error(err))
		return fmt.Errorf("get reset token: %w", err)
	}

	now := time.Now()

	if row.UsedAt != nil {
		s.log.Debug("password reset confirm: token already used", zap.Int64("user_id", row.UserID))
		return ErrInvalidResetToken
	}
	if now.After(row.ExpiresAt) {
		s.log.Debug("password reset confirm: token expired", zap.Int64("user_id", row.UserID))
		return ErrInvalidResetToken
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), s.bcryptCost)
	if err != nil {
		s.log.Error("password reset confirm: failed to hash password", zap.Int64("user_id", row.UserID), zap.Error(err))
		return fmt.Errorf("hash password: %w", err)
	}

	if err := s.repo.ConfirmResetTransaction(ctx, ConfirmResetTxParams{
		TokenID:     row.ID,
		UserID:      row.UserID,
		NewHash:     string(newHash),
		InvalidatAt: now,
	}); err != nil {
		s.log.Error("password reset confirm: transaction failed", zap.Int64("user_id", row.UserID), zap.Error(err))
		return fmt.Errorf("confirm reset transaction: %w", err)
	}

	s.log.Info("password reset confirmed", zap.Int64("user_id", row.UserID))
	return nil
}

func (s *PasswordResetSvc) enqueueResetEmail(ctx context.Context, user PasswordResetUserInfo, rawToken string) {
	name := ""
	if user.Name != nil {
		name = *user.Name
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.appBaseURL, rawToken)

	ttlHours := int(s.tokenTTL.Hours())
	expiresIn := fmt.Sprintf("%d hour", ttlHours)
	if ttlHours != 1 {
		expiresIn += "s"
	}

	err := s.mailer.Enqueue(ctx, email.EnqueueParams{
		IdempotencyKey: fmt.Sprintf("password_reset:%d:%d", user.ID, time.Now().UnixMilli()),
		Template:       email.TemplatePasswordReset,
		To:             user.Email,
		ToName:         name,
		Payload: map[string]any{
			"Name":      name,
			"ResetURL":  resetURL,
			"ExpiresIn": expiresIn,
		},
	})
	if err != nil {
		s.log.Error("password reset: failed to enqueue email", zap.Int64("user_id", user.ID), zap.Error(err))
	}
}
