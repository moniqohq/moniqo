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

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repo implements Repository using PostgreSQL.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewRepo returns a Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// GetUserByEmail fetches a user's public fields and password hash by email address.
func (r *Repo) GetUserByEmail(ctx context.Context, email string) (UserCredentials, error) {
	q := db.New(r.pool)
	row, err := q.GetUserByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		return UserCredentials{}, ErrUserNotFound
	}
	if err != nil {
		r.log.Error("GetUserByEmail query failed", zap.String("email", email), zap.Error(err))
		return UserCredentials{}, fmt.Errorf("get user by email: %w", err)
	}
	return UserCredentials{
		User: rowToPublic(row),
		Hash: row.Hash,
	}, nil
}

// UpdateLastLogin records the current timestamp as the user's last successful login.
func (r *Repo) UpdateLastLogin(ctx context.Context, userID int64) error {
	q := db.New(r.pool)
	if err := q.UpdateLastLogin(ctx, userID); err != nil {
		r.log.Error("UpdateLastLogin query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("update last login: %w", err)
	}
	return nil
}

// LogoutTransaction atomically blocklists the access token JTI and, if
// p.RefreshTokenHash is non-empty, revokes that refresh token with reason "logout".
func (r *Repo) LogoutTransaction(ctx context.Context, p LogoutParams) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.InsertRevokedAccessToken(ctx, db.InsertRevokedAccessTokenParams{
		Jti:       pgtype.UUID{Bytes: p.JTI, Valid: true},
		UserID:    p.UserID,
		ExpiresAt: pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
	}); err != nil {
		r.log.Error("LogoutTransaction: insert revoked access token failed", zap.Error(err))
		return fmt.Errorf("insert revoked token: %w", err)
	}

	if p.RefreshTokenHash != "" {
		reason := "logout"
		if err := q.RevokeRefreshToken(ctx, db.RevokeRefreshTokenParams{
			TokenHash:     p.RefreshTokenHash,
			RevokedReason: &reason,
		}); err != nil {
			r.log.Error("LogoutTransaction: revoke refresh token failed", zap.Error(err))
			return fmt.Errorf("revoke refresh token: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

// DeleteExpiredRevokedTokens removes access token blocklist entries whose TTL
// has passed. Called periodically by the cleanup goroutine in main.
func (r *Repo) DeleteExpiredRevokedTokens(ctx context.Context) error {
	q := db.New(r.pool)
	if err := q.DeleteExpiredRevokedAccessTokens(ctx); err != nil {
		r.log.Error("DeleteExpiredRevokedTokens query failed", zap.Error(err))
		return fmt.Errorf("delete expired revoked tokens: %w", err)
	}
	return nil
}

// IsAccessTokenRevoked reports whether the given JTI appears in the revocation list.
func (r *Repo) IsAccessTokenRevoked(ctx context.Context, jti pgtype.UUID) (bool, error) {
	q := db.New(r.pool)
	revoked, err := q.IsAccessTokenRevoked(ctx, jti)
	if err != nil {
		r.log.Error("IsAccessTokenRevoked query failed", zap.Error(err))
		return false, fmt.Errorf("check token revoked: %w", err)
	}
	return revoked, nil
}

// GetUserByID fetches a user's public fields by ID. The underlying query filters
// out soft-deleted rows, so a soft-deleted user yields ErrUserNotFound.
func (r *Repo) GetUserByID(ctx context.Context, userID int64) (models.User, error) {
	q := db.New(r.pool)
	row, err := q.GetUserByID(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, ErrUserNotFound
	}
	if err != nil {
		r.log.Error("GetUserByID query failed", zap.Int64("user_id", userID), zap.Error(err))
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}
	return userByIDRowToPublic(row), nil
}

// InsertRefreshToken persists a new refresh token row and returns its family ID.
func (r *Repo) InsertRefreshToken(ctx context.Context, p InsertRefreshTokenRepoParams) ([16]byte, error) {
	q := db.New(r.pool)
	id, err := q.InsertRefreshToken(ctx, db.InsertRefreshTokenParams{
		FamilyID:          pgtype.UUID{Bytes: p.FamilyID, Valid: true},
		UserID:            p.UserID,
		TokenHash:         p.TokenHash,
		ExpiresAt:         pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
		AbsoluteExpiresAt: pgtype.Timestamptz{Time: p.AbsoluteExpiresAt, Valid: true},
	})
	if err != nil {
		r.log.Error("InsertRefreshToken query failed", zap.Error(err))
		return [16]byte{}, fmt.Errorf("insert refresh token: %w", err)
	}
	return id.Bytes, nil
}

// GetRefreshTokenByHash looks up a refresh token by its SHA-256 hash.
func (r *Repo) GetRefreshTokenByHash(ctx context.Context, hash string) (db.RefreshToken, error) {
	q := db.New(r.pool)
	row, err := q.GetRefreshTokenByHash(ctx, hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.RefreshToken{}, ErrRefreshTokenInvalid
	}
	if err != nil {
		r.log.Error("GetRefreshTokenByHash query failed", zap.Error(err))
		return db.RefreshToken{}, fmt.Errorf("get refresh token by hash: %w", err)
	}
	return row, nil
}

// MarkRefreshTokenUsed flags the token as consumed so it cannot be reused.
func (r *Repo) MarkRefreshTokenUsed(ctx context.Context, id [16]byte) error {
	q := db.New(r.pool)
	if err := q.MarkRefreshTokenUsed(ctx, pgtype.UUID{Bytes: id, Valid: true}); err != nil {
		r.log.Error("MarkRefreshTokenUsed query failed", zap.Error(err))
		return fmt.Errorf("mark refresh token used: %w", err)
	}
	return nil
}

// RevokeRefreshTokenFamily invalidates every token that shares the given family ID.
func (r *Repo) RevokeRefreshTokenFamily(ctx context.Context, familyID [16]byte, reason string) error {
	q := db.New(r.pool)
	if err := q.RevokeRefreshTokenFamily(ctx, db.RevokeRefreshTokenFamilyParams{
		FamilyID:      pgtype.UUID{Bytes: familyID, Valid: true},
		RevokedReason: &reason,
	}); err != nil {
		r.log.Error("RevokeRefreshTokenFamily query failed", zap.Error(err))
		return fmt.Errorf("revoke refresh token family: %w", err)
	}
	return nil
}

// RotateRefreshToken atomically marks oldID as used and inserts a new token row.
func (r *Repo) RotateRefreshToken(ctx context.Context, oldID [16]byte, p InsertRefreshTokenRepoParams) ([16]byte, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return [16]byte{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.MarkRefreshTokenUsed(ctx, pgtype.UUID{Bytes: oldID, Valid: true}); err != nil {
		return [16]byte{}, fmt.Errorf("mark refresh token used: %w", err)
	}

	newID, err := q.InsertRefreshToken(ctx, db.InsertRefreshTokenParams{
		FamilyID:          pgtype.UUID{Bytes: p.FamilyID, Valid: true},
		UserID:            p.UserID,
		TokenHash:         p.TokenHash,
		ExpiresAt:         pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
		AbsoluteExpiresAt: pgtype.Timestamptz{Time: p.AbsoluteExpiresAt, Valid: true},
	})
	if err != nil {
		return [16]byte{}, fmt.Errorf("insert refresh token: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return [16]byte{}, fmt.Errorf("commit transaction: %w", err)
	}
	return newID.Bytes, nil
}

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

func userByIDRowToPublic(row db.GetUserByIDRow) models.User {
	var lastLogin *time.Time
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		lastLogin = &t
	}
	var tokensInvalidBefore *time.Time
	if row.TokensInvalidBefore.Valid {
		t := row.TokensInvalidBefore.Time
		tokensInvalidBefore = &t
	}
	return models.User{
		ID:                  row.ID,
		Name:                row.Name,
		Username:            row.Username,
		Email:               row.Email,
		Picture:             row.Picture,
		Status:              models.UserStatus(row.Status),
		LastLogin:           lastLogin,
		CreatedAt:           row.CreatedAt.Time,
		TokensInvalidBefore: tokensInvalidBefore,
	}
}

func rowToPublic(row db.GetUserByEmailRow) models.User {
	var lastLogin *time.Time
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		lastLogin = &t
	}
	return models.User{
		ID:        row.ID,
		Name:      row.Name,
		Username:  row.Username,
		Email:     row.Email,
		Picture:   row.Picture,
		Status:    models.UserStatus(row.Status),
		LastLogin: lastLogin,
		CreatedAt: row.CreatedAt.Time,
	}
}
