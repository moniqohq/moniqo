package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
)

// GetUserForPasswordReset fetches the minimal user fields needed for password
// reset token issuance. Returns ErrUserNotFound when no non-deleted row matches.
func (r *Repo) GetUserForPasswordReset(ctx context.Context, emailAddr string) (PasswordResetUserInfo, error) {
	q := db.New(r.pool)
	row, err := q.GetUserForPasswordReset(ctx, emailAddr)
	if errors.Is(err, pgx.ErrNoRows) {
		return PasswordResetUserInfo{}, ErrUserNotFound
	}
	if err != nil {
		r.log.Error("GetUserForPasswordReset query failed", zap.String("email", emailAddr), zap.Error(err))
		return PasswordResetUserInfo{}, fmt.Errorf("get user for password reset: %w", err)
	}
	return PasswordResetUserInfo{ID: row.ID, Name: row.Name, Email: row.Email}, nil
}

// InvalidateUserPasswordResetTokens marks all active (unused, unexpired) reset
// tokens for the user as used, so a new token can be issued cleanly.
func (r *Repo) InvalidateUserPasswordResetTokens(ctx context.Context, userID int64) error {
	q := db.New(r.pool)
	if err := q.InvalidateUserPasswordResetTokens(ctx, userID); err != nil {
		r.log.Error("InvalidateUserPasswordResetTokens query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("invalidate password reset tokens: %w", err)
	}
	return nil
}

// InsertPasswordResetToken persists a new password reset token row.
func (r *Repo) InsertPasswordResetToken(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error {
	q := db.New(r.pool)
	if _, err := q.InsertPasswordResetToken(ctx, db.InsertPasswordResetTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	}); err != nil {
		r.log.Error("InsertPasswordResetToken query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("insert password reset token: %w", err)
	}
	return nil
}

// GetPasswordResetTokenByHash looks up a password reset token by its SHA-256 hash.
// Returns ErrInvalidResetToken when no row matches.
func (r *Repo) GetPasswordResetTokenByHash(ctx context.Context, tokenHash string) (PasswordResetTokenRow, error) {
	q := db.New(r.pool)
	row, err := q.GetPasswordResetTokenByHash(ctx, tokenHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return PasswordResetTokenRow{}, ErrInvalidResetToken
	}
	if err != nil {
		r.log.Error("GetPasswordResetTokenByHash query failed", zap.Error(err))
		return PasswordResetTokenRow{}, fmt.Errorf("get password reset token: %w", err)
	}
	result := PasswordResetTokenRow{
		ID:        row.ID.Bytes,
		UserID:    row.UserID,
		ExpiresAt: row.ExpiresAt.Time,
	}
	if row.UsedAt.Valid {
		t := row.UsedAt.Time
		result.UsedAt = &t
	}
	return result, nil
}

// ConfirmResetTransaction atomically marks the reset token as used, updates the
// user's password hash, sets the token-invalid-before epoch, and revokes all
// active refresh tokens for the user.
func (r *Repo) ConfirmResetTransaction(ctx context.Context, p ConfirmResetTxParams) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.MarkPasswordResetTokenUsed(ctx, pgtype.UUID{Bytes: p.TokenID, Valid: true}); err != nil {
		r.log.Error("ConfirmResetTransaction: mark token used failed", zap.Error(err))
		return fmt.Errorf("mark token used: %w", err)
	}

	if err := q.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
		ID:   p.UserID,
		Hash: p.NewHash,
	}); err != nil {
		r.log.Error("ConfirmResetTransaction: update password failed", zap.Int64("user_id", p.UserID), zap.Error(err))
		return fmt.Errorf("update password: %w", err)
	}

	if err := q.SetTokensInvalidBefore(ctx, db.SetTokensInvalidBeforeParams{
		ID:                  p.UserID,
		TokensInvalidBefore: pgtype.Timestamptz{Time: p.InvalidatAt, Valid: true},
	}); err != nil {
		r.log.Error("ConfirmResetTransaction: set tokens_invalid_before failed", zap.Int64("user_id", p.UserID), zap.Error(err))
		return fmt.Errorf("set token epoch: %w", err)
	}

	reason := "password_reset"
	if err := q.RevokeAllUserRefreshTokens(ctx, db.RevokeAllUserRefreshTokensParams{
		UserID:        p.UserID,
		RevokedReason: &reason,
	}); err != nil {
		r.log.Error("ConfirmResetTransaction: revoke refresh tokens failed", zap.Int64("user_id", p.UserID), zap.Error(err))
		return fmt.Errorf("revoke refresh tokens: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

// DeleteExpiredPasswordResetTokens removes password reset token rows whose TTL
// has passed. Called periodically by the cleanup goroutine in main.
func (r *Repo) DeleteExpiredPasswordResetTokens(ctx context.Context) error {
	q := db.New(r.pool)
	if err := q.DeleteExpiredPasswordResetTokens(ctx); err != nil {
		r.log.Error("DeleteExpiredPasswordResetTokens query failed", zap.Error(err))
		return fmt.Errorf("delete expired password reset tokens: %w", err)
	}
	return nil
}
