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
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repo wraps sqlc queries for the users table.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewRepo returns a user Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// publicUserRow holds the common set of scanned columns shared by
// CreateUserRow, GetUserByIDRow, and UpdateUserProfileRow, so toPublicUser can
// be reused across all three without an unwieldy positional-argument list.
type publicUserRow struct {
	ID                    int64
	Name                  *string
	Username              string
	Email                 string
	Picture               string
	Status                db.UserStatus
	Currency              *string
	Timezone              *string
	DateFormat            *string
	OnboardingCompletedAt pgtype.Timestamptz
	LastLogin             pgtype.Timestamptz
	CreatedAt             pgtype.Timestamptz
	HasPassword           bool
}

// toPublicUser converts a scanned row into a public-safe model.
func toPublicUser(row publicUserRow) models.User {
	var ll *time.Time
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		ll = &t
	}
	var oc *time.Time
	if row.OnboardingCompletedAt.Valid {
		t := row.OnboardingCompletedAt.Time
		oc = &t
	}
	return models.User{
		ID:                    row.ID,
		Name:                  row.Name,
		Username:              row.Username,
		Email:                 row.Email,
		Picture:               row.Picture,
		Status:                models.UserStatus(row.Status),
		Currency:              row.Currency,
		Timezone:              row.Timezone,
		DateFormat:            row.DateFormat,
		OnboardingCompletedAt: oc,
		LastLogin:             ll,
		CreatedAt:             row.CreatedAt.Time,
		HasPassword:           row.HasPassword,
	}
}

// Create opens a transaction, inserts the user, and commits. Any failure rolls
// back and returns the original error (or ErrConflict for unique violations).
func (r *Repo) Create(ctx context.Context, p CreateParams) (models.User, error) {
	r.log.Debug("beginning transaction for user insert")

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		r.log.Error("failed to begin transaction", zap.Error(err))
		return models.User{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	pub, err := r.insertWithTx(ctx, tx, p)
	if err != nil {
		return models.User{}, err
	}

	r.log.Debug("committing transaction", zap.Int64("user_id", pub.ID))
	if err := tx.Commit(ctx); err != nil {
		r.log.Error("failed to commit user insert transaction", zap.Int64("user_id", pub.ID), zap.Error(err))
		return models.User{}, fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("user row committed to database", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	return pub, nil
}

func rowToPublic(row db.CreateUserRow) models.User {
	return toPublicUser(publicUserRow{
		ID: row.ID, Name: row.Name, Username: row.Username, Email: row.Email, Picture: row.Picture,
		Status: row.Status, Currency: row.Currency, Timezone: row.Timezone, DateFormat: row.DateFormat,
		OnboardingCompletedAt: row.OnboardingCompletedAt, LastLogin: row.LastLogin, CreatedAt: row.CreatedAt,
		HasPassword: row.HasPassword,
	})
}

// GetByID returns the public-safe user model for the given id.
// Returns ErrNotFound if the user does not exist or has been soft-deleted.
func (r *Repo) GetByID(ctx context.Context, id int64) (models.User, error) {
	r.log.Debug("executing GetUserByID query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	row, err := q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrNotFound
		}
		r.log.Error("GetUserByID query failed", zap.Int64("user_id", id), zap.Error(err))
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}
	return toPublicUser(publicUserRow{
		ID: row.ID, Name: row.Name, Username: row.Username, Email: row.Email, Picture: row.Picture,
		Status: row.Status, Currency: row.Currency, Timezone: row.Timezone, DateFormat: row.DateFormat,
		OnboardingCompletedAt: row.OnboardingCompletedAt, LastLogin: row.LastLogin, CreatedAt: row.CreatedAt,
		HasPassword: row.HasPassword,
	}), nil
}

// UpdateProfile updates name, username, email, picture, and display
// preferences (currency, timezone, date format) for the given user.
// Returns ErrNotFound if the user is gone, ErrConflict on a unique violation.
func (r *Repo) UpdateProfile(ctx context.Context, p UpdateProfileParams) (models.User, error) {
	r.log.Debug("executing UpdateUserProfile query", zap.Int64("user_id", p.ID))
	q := db.New(r.pool)
	row, err := q.UpdateUserProfile(ctx, db.UpdateUserProfileParams{
		ID:         p.ID,
		Name:       p.Name,
		Username:   p.Username,
		Email:      p.Email,
		Picture:    p.Picture,
		Currency:   p.Currency,
		Timezone:   p.Timezone,
		DateFormat: p.DateFormat,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrNotFound
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			r.log.Debug("unique constraint violation on profile update", zap.Int64("user_id", p.ID))
			return models.User{}, ErrConflict
		}
		r.log.Error("UpdateUserProfile query failed", zap.Int64("user_id", p.ID), zap.Error(err))
		return models.User{}, fmt.Errorf("update user profile: %w", err)
	}
	return toPublicUser(publicUserRow{
		ID: row.ID, Name: row.Name, Username: row.Username, Email: row.Email, Picture: row.Picture,
		Status: row.Status, Currency: row.Currency, Timezone: row.Timezone, DateFormat: row.DateFormat,
		OnboardingCompletedAt: row.OnboardingCompletedAt, LastLogin: row.LastLogin, CreatedAt: row.CreatedAt,
		HasPassword: row.HasPassword,
	}), nil
}

// EmailTaken reports whether emailAddr is already in use, case-insensitively,
// including by a soft-deleted account — this matches the scope of the
// underlying users_email_key unique index, so a caller relying on this check
// to avoid a doomed insert/update never gets a false negative.
func (r *Repo) EmailTaken(ctx context.Context, emailAddr string) (bool, error) {
	q := db.New(r.pool)
	count, err := q.CountUsersByEmail(ctx, emailAddr)
	if err != nil {
		r.log.Error("CountUsersByEmail query failed", zap.Error(err))
		return false, fmt.Errorf("count users by email: %w", err)
	}
	return count > 0, nil
}

// UpdatePassword replaces the bcrypt hash for the given user and, in the same
// transaction, invalidates every existing session (access tokens issued
// before now, and all refresh tokens) with reason "password_changed" — an
// authenticated password change must not leave other devices signed in.
func (r *Repo) UpdatePassword(ctx context.Context, id int64, hash string) error {
	r.log.Debug("beginning password update transaction", zap.Int64("user_id", id))

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{ID: id, Hash: &hash}); err != nil {
		r.log.Error("UpdateUserPassword query failed", zap.Int64("user_id", id), zap.Error(err))
		return fmt.Errorf("update user password: %w", err)
	}

	if err := q.SetTokensInvalidBefore(ctx, db.SetTokensInvalidBeforeParams{
		ID:                  id,
		TokensInvalidBefore: pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}); err != nil {
		r.log.Error("SetTokensInvalidBefore query failed", zap.Int64("user_id", id), zap.Error(err))
		return fmt.Errorf("set tokens invalid before: %w", err)
	}

	reason := "password_changed"
	if err := q.RevokeAllUserRefreshTokens(ctx, db.RevokeAllUserRefreshTokensParams{
		UserID:        id,
		RevokedReason: &reason,
	}); err != nil {
		r.log.Error("RevokeAllUserRefreshTokens query failed", zap.Int64("user_id", id), zap.Error(err))
		return fmt.Errorf("revoke user refresh tokens: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

// DeleteAccount soft-deletes the user and, in the same transaction: blocks the
// operation if the user is the sole OWNER of a budget that still has other
// active members (ErrLastOwner, wrapped in *LastOwnerError with the offending
// budgets); revokes all refresh tokens and blocklists the caller's live
// access token; invalidates pending password-reset tokens; hard-deletes OIDC
// identity links (so a future re-signup with the same provider account
// creates a fresh user rather than resolving to this soft-deleted row);
// cascade-soft-deletes budgets the user solely owns (with their memberships);
// and soft-deletes the user's remaining memberships in budgets that survive.
//
// Idempotent — re-deleting an already-deleted user matches zero rows at every
// step and commits cleanly with no error.
func (r *Repo) DeleteAccount(ctx context.Context, p DeleteAccountParams) error {
	r.log.Debug("beginning account-deletion transaction", zap.Int64("user_id", p.UserID))

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := checkNotLastOwner(ctx, q, p.UserID); err != nil {
		return err
	}
	if err := softDeleteUserAndCredentials(ctx, q, p); err != nil {
		return err
	}
	soloOwned, err := cascadeSoloOwnedBudgets(ctx, q, p.UserID)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info(
		"account deleted",
		zap.Int64("user_id", p.UserID),
		zap.Int("budgets_cascaded", len(soloOwned)),
	)
	return nil
}

// checkNotLastOwner returns *LastOwnerError if the user is the sole OWNER of
// a budget that still has other active members, blocking deletion.
func checkNotLastOwner(ctx context.Context, q *db.Queries, userID int64) error {
	blocking, err := q.ListBlockingSoleOwnedBudgets(ctx, userID)
	if err != nil {
		return fmt.Errorf("list blocking sole-owned budgets: %w", err)
	}
	if len(blocking) == 0 {
		return nil
	}
	budgets := make([]BlockingBudget, len(blocking))
	for i, b := range blocking {
		budgets[i] = BlockingBudget{ID: b.ID, Title: b.Title}
	}
	return &LastOwnerError{Budgets: budgets}
}

// softDeleteUserAndCredentials soft-deletes the user row and invalidates
// every credential that could otherwise keep the account usable: refresh
// tokens, the caller's live access token, pending password-reset tokens, and
// OIDC identity links (hard-deleted so a future re-signup with the same
// provider account does not resolve to this soft-deleted row).
func softDeleteUserAndCredentials(ctx context.Context, q *db.Queries, p DeleteAccountParams) error {
	if err := q.SoftDeleteUser(ctx, p.UserID); err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}

	reason := "account_deletion"
	if err := q.RevokeAllUserRefreshTokens(ctx, db.RevokeAllUserRefreshTokensParams{
		UserID:        p.UserID,
		RevokedReason: &reason,
	}); err != nil {
		return fmt.Errorf("revoke user refresh tokens: %w", err)
	}

	if err := q.InsertRevokedAccessToken(ctx, db.InsertRevokedAccessTokenParams{
		Jti:       pgtype.UUID{Bytes: p.JTI, Valid: true},
		UserID:    p.UserID,
		ExpiresAt: pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
	}); err != nil {
		return fmt.Errorf("revoke access token: %w", err)
	}

	if err := q.InvalidateUserPasswordResetTokens(ctx, p.UserID); err != nil {
		return fmt.Errorf("invalidate password reset tokens: %w", err)
	}

	if err := q.DeleteAllUserIdentities(ctx, p.UserID); err != nil {
		return fmt.Errorf("delete user identities: %w", err)
	}
	return nil
}

// cascadeSoloOwnedBudgets soft-deletes every budget the user solely owns
// (with their memberships) and then clears the user's remaining memberships
// in budgets that survive. It returns the ids of the budgets cascaded.
func cascadeSoloOwnedBudgets(ctx context.Context, q *db.Queries, userID int64) ([]int64, error) {
	soloOwned, err := q.ListSoloOwnedBudgets(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list solo-owned budgets: %w", err)
	}
	for _, budgetID := range soloOwned {
		if err := q.SoftDeleteBudget(ctx, budgetID); err != nil {
			return nil, fmt.Errorf("soft delete budget %d: %w", budgetID, err)
		}
		if err := q.SoftDeleteAllMembershipsForBudget(ctx, budgetID); err != nil {
			return nil, fmt.Errorf("soft delete memberships for budget %d: %w", budgetID, err)
		}
	}

	if err := q.SoftDeleteAllMembershipsForUser(ctx, userID); err != nil {
		return nil, fmt.Errorf("soft delete memberships for user: %w", err)
	}
	return soloOwned, nil
}

// GetHashByID returns the bcrypt hash for the given user, or "" if the account
// has no password credential (e.g. an OIDC-only signup) — bcrypt comparison
// against "" fails generically, which is the desired behavior here.
// Returns ErrNotFound if the user is gone or soft-deleted.
func (r *Repo) GetHashByID(ctx context.Context, id int64) (string, error) {
	r.log.Debug("executing GetUserHashByID query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	hash, err := q.GetUserHashByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		r.log.Error("GetUserHashByID query failed", zap.Int64("user_id", id), zap.Error(err))
		return "", fmt.Errorf("get user hash by id: %w", err)
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

// Activate sets the user's status to active.
func (r *Repo) Activate(ctx context.Context, id int64) error {
	r.log.Debug("executing ActivateUser query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	if err := q.ActivateUser(ctx, id); err != nil {
		r.log.Error("ActivateUser query failed", zap.Int64("user_id", id), zap.Error(err))
		return fmt.Errorf("activate user: %w", err)
	}
	return nil
}

// GetAvatarMeta returns the stored-avatar metadata and the raw picture value
// (which may be an external OIDC URL) for the given user.
// Returns ErrNotFound if the user is gone or soft-deleted.
func (r *Repo) GetAvatarMeta(ctx context.Context, id int64) (AvatarMeta, string, error) {
	r.log.Debug("executing GetUserAvatarMeta query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	row, err := q.GetUserAvatarMeta(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AvatarMeta{}, "", ErrNotFound
		}
		r.log.Error("GetUserAvatarMeta query failed", zap.Int64("user_id", id), zap.Error(err))
		return AvatarMeta{}, "", fmt.Errorf("get user avatar meta: %w", err)
	}
	var updatedAt *time.Time
	if row.AvatarUpdatedAt.Valid {
		t := row.AvatarUpdatedAt.Time
		updatedAt = &t
	}
	return AvatarMeta{
		Key:         row.AvatarKey,
		ContentType: row.AvatarContentType,
		Size:        row.AvatarSizeBytes,
		ETag:        row.AvatarEtag,
		UpdatedAt:   updatedAt,
	}, row.Picture, nil
}

// SetAvatar persists the given avatar metadata and points picture at
// p.PublicURL. Returns ErrNotFound if the user is gone or soft-deleted.
func (r *Repo) SetAvatar(ctx context.Context, p SetAvatarParams) (models.User, error) {
	r.log.Debug("executing SetUserAvatar query", zap.Int64("user_id", p.ID))
	q := db.New(r.pool)
	row, err := q.SetUserAvatar(ctx, db.SetUserAvatarParams{
		ID:                p.ID,
		AvatarKey:         p.Key,
		AvatarContentType: p.ContentType,
		AvatarSizeBytes:   p.Size,
		AvatarEtag:        p.ETag,
		Picture:           p.PublicURL,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrNotFound
		}
		r.log.Error("SetUserAvatar query failed", zap.Int64("user_id", p.ID), zap.Error(err))
		return models.User{}, fmt.Errorf("set user avatar: %w", err)
	}
	return toPublicUser(publicUserRow{
		ID: row.ID, Name: row.Name, Username: row.Username, Email: row.Email, Picture: row.Picture,
		Status: row.Status, Currency: row.Currency, Timezone: row.Timezone, DateFormat: row.DateFormat,
		OnboardingCompletedAt: row.OnboardingCompletedAt, LastLogin: row.LastLogin, CreatedAt: row.CreatedAt,
		HasPassword: row.HasPassword,
	}), nil
}

// ClearAvatar clears both the stored-avatar columns and picture. Idempotent:
// clearing an already-empty avatar is a success.
// Returns ErrNotFound if the user is gone or soft-deleted.
func (r *Repo) ClearAvatar(ctx context.Context, id int64) (models.User, error) {
	r.log.Debug("executing ClearUserAvatar query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	row, err := q.ClearUserAvatar(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrNotFound
		}
		r.log.Error("ClearUserAvatar query failed", zap.Int64("user_id", id), zap.Error(err))
		return models.User{}, fmt.Errorf("clear user avatar: %w", err)
	}
	return toPublicUser(publicUserRow{
		ID: row.ID, Name: row.Name, Username: row.Username, Email: row.Email, Picture: row.Picture,
		Status: row.Status, Currency: row.Currency, Timezone: row.Timezone, DateFormat: row.DateFormat,
		OnboardingCompletedAt: row.OnboardingCompletedAt, LastLogin: row.LastLogin, CreatedAt: row.CreatedAt,
		HasPassword: row.HasPassword,
	}), nil
}

// insertWithTx inserts a user row within the provided transaction and returns the
// public-safe model. Callers are responsible for commit/rollback.
func (r *Repo) insertWithTx(ctx context.Context, tx pgx.Tx, p CreateParams) (models.User, error) {
	r.log.Debug("executing CreateUser query", zap.String("username", p.Username), zap.String("email", p.Email))

	q := db.New(tx)
	row, err := q.CreateUser(ctx, db.CreateUserParams{
		Username: p.Username,
		Email:    p.Email,
		Hash:     &p.Hash,
		Name:     p.Name,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			r.log.Debug("unique constraint violation on user insert", zap.String("username", p.Username), zap.String("email", p.Email))
			return models.User{}, ErrConflict
		}
		r.log.Error("CreateUser query failed", zap.String("username", p.Username), zap.Error(err))
		return models.User{}, fmt.Errorf("create user: %w", err)
	}

	r.log.Debug("CreateUser query succeeded", zap.Int64("user_id", row.ID))
	return rowToPublic(row), nil
}
