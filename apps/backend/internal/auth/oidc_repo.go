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
	"math/rand/v2"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

const (
	usernameCollisionRetries = 5
	maxUsernameLen           = 12
	usernameSuffixModulus    = 10000
)

// OIDCRepo wraps sqlc queries for user_identities and OIDC-only user creation.
type OIDCRepo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewOIDCRepo returns an OIDCRepo backed by the given connection pool.
func NewOIDCRepo(pool *pgxpool.Pool, log *zap.Logger) *OIDCRepo {
	return &OIDCRepo{pool: pool, log: log}
}

// GetUserByEmailForLinking looks up the minimal, password-agnostic user data
// needed for OIDC linking decisions. Returns ErrUserNotFound when no
// non-deleted row matches.
func (r *OIDCRepo) GetUserByEmailForLinking(ctx context.Context, email string) (LinkableUser, error) {
	q := db.New(r.pool)
	row, err := q.GetUserByEmailForLinking(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		return LinkableUser{}, ErrUserNotFound
	}
	if err != nil {
		r.log.Error("GetUserByEmailForLinking query failed", zap.Error(err))
		return LinkableUser{}, fmt.Errorf("get user by email for linking: %w", err)
	}
	return LinkableUser{ID: row.ID, Username: row.Username, Email: row.Email, Status: models.UserStatus(row.Status)}, nil
}

// CreateUserFromIdentity creates a new password-less, active user and its
// first linked identity in one transaction. If the derived username
// collides, it retries with a random numeric suffix a bounded number of
// times before giving up.
func (r *OIDCRepo) CreateUserFromIdentity(ctx context.Context, p CreateOIDCUserParams) (models.User, error) {
	for attempt := 0; attempt <= usernameCollisionRetries; attempt++ {
		username := candidateUsername(p.Username, attempt)

		pub, err := r.createUserAndIdentityTx(ctx, p, username)
		if err == nil {
			return pub, nil
		}
		if !errors.Is(err, ErrConflict) {
			return models.User{}, err
		}
		r.log.Debug("username collision creating OIDC user, retrying", zap.String("username", username))
	}
	return models.User{}, fmt.Errorf("create user from identity: %w", ErrConflict)
}

// candidateUsername returns baseUsername on the first attempt, or
// baseUsername truncated and suffixed with a random number on retries, kept
// within the existing username length constraint (max 12 chars).
func candidateUsername(baseUsername string, attempt int) string {
	if attempt == 0 {
		return baseUsername
	}
	suffix := strconv.Itoa(rand.IntN(usernameSuffixModulus)) //nolint:gosec // usernames aren't security-sensitive
	trimmed := baseUsername
	if maxBase := maxUsernameLen - len(suffix); len(trimmed) > maxBase {
		trimmed = trimmed[:maxBase]
	}
	return trimmed + suffix
}

// GetIdentityByProviderSubject looks up a linked identity by provider and
// subject. Returns ErrIdentityNotFound when no row matches.
func (r *OIDCRepo) GetIdentityByProviderSubject(ctx context.Context, provider, subject string) (UserIdentity, error) {
	q := db.New(r.pool)
	row, err := q.GetUserIdentityByProviderSubject(ctx, db.GetUserIdentityByProviderSubjectParams{
		Provider:        provider,
		ProviderSubject: subject,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return UserIdentity{}, ErrIdentityNotFound
	}
	if err != nil {
		r.log.Error("GetUserIdentityByProviderSubject query failed", zap.Error(err))
		return UserIdentity{}, fmt.Errorf("get user identity by provider subject: %w", err)
	}
	return rowToIdentity(row), nil
}

// LinkIdentity inserts a new user_identities row. Returns
// ErrIdentityAlreadyLinked on a unique-constraint race (the caller normally
// pre-checks GetIdentityByProviderSubject, but this guards concurrent
// requests).
func (r *OIDCRepo) LinkIdentity(ctx context.Context, userID int64, provider, subject, email string) error {
	q := db.New(r.pool)
	_, err := q.CreateUserIdentity(ctx, db.CreateUserIdentityParams{
		UserID:          userID,
		Provider:        provider,
		ProviderSubject: subject,
		ProviderEmail:   &email,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrIdentityAlreadyLinked
		}
		r.log.Error("CreateUserIdentity query failed", zap.Error(err))
		return fmt.Errorf("link identity: %w", err)
	}
	return nil
}

// ListIdentities returns every identity linked to userID, ordered by
// created_at (oldest first, matching link order).
func (r *OIDCRepo) ListIdentities(ctx context.Context, userID int64) ([]UserIdentity, error) {
	q := db.New(r.pool)
	rows, err := q.ListUserIdentitiesByUserID(ctx, userID)
	if err != nil {
		r.log.Error("ListUserIdentitiesByUserID query failed", zap.Error(err))
		return nil, fmt.Errorf("list user identities: %w", err)
	}
	identities := make([]UserIdentity, 0, len(rows))
	for _, row := range rows {
		identities = append(identities, rowToIdentity(row))
	}
	return identities, nil
}

// UnlinkIdentity removes a linked identity. Idempotent: removing an identity
// that is already gone matches zero rows and returns no error.
func (r *OIDCRepo) UnlinkIdentity(ctx context.Context, userID int64, provider string) error {
	q := db.New(r.pool)
	if err := q.DeleteUserIdentity(ctx, db.DeleteUserIdentityParams{UserID: userID, Provider: provider}); err != nil {
		r.log.Error("DeleteUserIdentity query failed", zap.Error(err))
		return fmt.Errorf("unlink identity: %w", err)
	}
	return nil
}

// CountIdentitiesAndHash reports how many identities are linked to userID
// and whether the account has a usable password hash — used to block
// unlinking a user's only remaining sign-in method.
func (r *OIDCRepo) CountIdentitiesAndHash(ctx context.Context, userID int64) (identityCount int, hasPassword bool, err error) {
	q := db.New(r.pool)

	count, err := q.CountUserIdentitiesByUserID(ctx, userID)
	if err != nil {
		return 0, false, fmt.Errorf("count user identities: %w", err)
	}

	hash, err := q.GetUserHashByID(ctx, userID)
	if err != nil {
		return 0, false, fmt.Errorf("get user hash by id: %w", err)
	}

	return int(count), hash != nil && *hash != "", nil
}

// ActivateUser promotes a pending_verification user to active. Used when a
// verified OIDC login auto-links to a dormant password signup — the verified
// provider email is itself proof of ownership.
func (r *OIDCRepo) ActivateUser(ctx context.Context, userID int64) error {
	q := db.New(r.pool)
	if err := q.ActivateUser(ctx, userID); err != nil {
		r.log.Error("ActivateUser query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("activate user: %w", err)
	}
	return nil
}

func (r *OIDCRepo) createUserAndIdentityTx(ctx context.Context, p CreateOIDCUserParams, username string) (models.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.User{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	row, err := q.CreateUserWithoutPassword(ctx, db.CreateUserWithoutPasswordParams{
		Username: username,
		Email:    p.Email,
		Name:     p.Name,
		Picture:  p.Picture,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.User{}, ErrConflict
		}
		return models.User{}, fmt.Errorf("create user without password: %w", err)
	}

	providerEmail := &p.ProviderEmail
	if _, err := q.CreateUserIdentity(ctx, db.CreateUserIdentityParams{
		UserID:          row.ID,
		Provider:        p.Provider,
		ProviderSubject: p.ProviderSubject,
		ProviderEmail:   providerEmail,
	}); err != nil {
		return models.User{}, fmt.Errorf("create user identity: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.User{}, fmt.Errorf("commit transaction: %w", err)
	}

	return toOIDCPublicUser(row), nil
}

func rowToIdentity(row db.UserIdentity) UserIdentity {
	email := ""
	if row.ProviderEmail != nil {
		email = *row.ProviderEmail
	}
	return UserIdentity{
		ID:              row.ID,
		UserID:          row.UserID,
		Provider:        row.Provider,
		ProviderSubject: row.ProviderSubject,
		ProviderEmail:   email,
		CreatedAt:       row.CreatedAt.Time,
		UpdatedAt:       row.UpdatedAt.Time,
	}
}

func toOIDCPublicUser(row db.CreateUserWithoutPasswordRow) models.User {
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
		OnboardingCompletedAt: oc,
		LastLogin:             ll,
		CreatedAt:             row.CreatedAt.Time,
	}
}
