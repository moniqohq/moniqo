package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
)

// PasswordResetRepository is the persistence contract for password reset operations.
type PasswordResetRepository interface {
	GetUserForPasswordReset(ctx context.Context, emailAddr string) (PasswordResetUserInfo, error)
	InvalidateUserPasswordResetTokens(ctx context.Context, userID int64) error
	InsertPasswordResetToken(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error
	GetPasswordResetTokenByHash(ctx context.Context, tokenHash string) (PasswordResetTokenRow, error)
	ConfirmResetTransaction(ctx context.Context, p ConfirmResetTxParams) error
}

// PasswordResetTokenRow is the internal representation of a password_reset_tokens row.
type PasswordResetTokenRow struct {
	ID        [16]byte
	UserID    int64
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// ConfirmResetTxParams carries everything needed to atomically confirm a password reset.
type ConfirmResetTxParams struct {
	TokenID     [16]byte
	UserID      int64
	NewHash     string
	InvalidatAt time.Time
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
