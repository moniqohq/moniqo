package auth

import (
	"context"
	"errors"
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

// NewAuthRepo returns a Repo backed by the given connection pool.
func NewAuthRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
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
		return UserCredentials{}, err
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
		return err
	}
	return nil
}

// InsertRevokedAccessToken adds a JWT JTI to the revocation list so it cannot be reused after logout.
func (r *Repo) InsertRevokedAccessToken(ctx context.Context, p InsertRevokedTokenParams) error {
	q := db.New(r.pool)
	err := q.InsertRevokedAccessToken(ctx, db.InsertRevokedAccessTokenParams{
		Jti:       p.JTI,
		UserID:    p.UserID,
		ExpiresAt: pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
	})
	if err != nil {
		r.log.Error("InsertRevokedAccessToken query failed", zap.Error(err))
		return err
	}
	return nil
}

// IsAccessTokenRevoked reports whether the given JTI appears in the revocation list.
func (r *Repo) IsAccessTokenRevoked(ctx context.Context, jti pgtype.UUID) (bool, error) {
	q := db.New(r.pool)
	revoked, err := q.IsAccessTokenRevoked(ctx, jti)
	if err != nil {
		r.log.Error("IsAccessTokenRevoked query failed", zap.Error(err))
		return false, err
	}
	return revoked, nil
}

// UserExistsByID reports whether a user row with the given ID exists in the database.
func (r *Repo) UserExistsByID(ctx context.Context, userID int64) (bool, error) {
	q := db.New(r.pool)
	_, err := q.GetUserByID(ctx, userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		r.log.Error("UserExistsByID query failed", zap.Int64("user_id", userID), zap.Error(err))
		return false, err
	}
	return true, nil
}

func (r *AuthRepo) InsertRefreshToken(ctx context.Context, p InsertRefreshTokenRepoParams) ([16]byte, error) {
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
		return [16]byte{}, err
	}
	return id.Bytes, nil
}

func (r *AuthRepo) GetRefreshTokenByHash(ctx context.Context, hash string) (db.RefreshToken, error) {
	q := db.New(r.pool)
	row, err := q.GetRefreshTokenByHash(ctx, hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.RefreshToken{}, ErrRefreshTokenInvalid
	}
	if err != nil {
		r.log.Error("GetRefreshTokenByHash query failed", zap.Error(err))
		return db.RefreshToken{}, err
	}
	return row, nil
}

func (r *AuthRepo) MarkRefreshTokenUsed(ctx context.Context, id [16]byte) error {
	q := db.New(r.pool)
	if err := q.MarkRefreshTokenUsed(ctx, pgtype.UUID{Bytes: id, Valid: true}); err != nil {
		r.log.Error("MarkRefreshTokenUsed query failed", zap.Error(err))
		return err
	}
	return nil
}

func (r *AuthRepo) RevokeRefreshTokenFamily(ctx context.Context, familyID [16]byte, reason string) error {
	q := db.New(r.pool)
	if err := q.RevokeRefreshTokenFamily(ctx, db.RevokeRefreshTokenFamilyParams{
		FamilyID:      pgtype.UUID{Bytes: familyID, Valid: true},
		RevokedReason: &reason,
	}); err != nil {
		r.log.Error("RevokeRefreshTokenFamily query failed", zap.Error(err))
		return err
	}
	return nil
}

// RotateRefreshToken atomically marks oldID as used and inserts a new token row.
func (r *AuthRepo) RotateRefreshToken(ctx context.Context, oldID [16]byte, p InsertRefreshTokenRepoParams) ([16]byte, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return [16]byte{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.MarkRefreshTokenUsed(ctx, pgtype.UUID{Bytes: oldID, Valid: true}); err != nil {
		return [16]byte{}, err
	}

	newID, err := q.InsertRefreshToken(ctx, db.InsertRefreshTokenParams{
		FamilyID:          pgtype.UUID{Bytes: p.FamilyID, Valid: true},
		UserID:            p.UserID,
		TokenHash:         p.TokenHash,
		ExpiresAt:         pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
		AbsoluteExpiresAt: pgtype.Timestamptz{Time: p.AbsoluteExpiresAt, Valid: true},
	})
	if err != nil {
		return [16]byte{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return [16]byte{}, err
	}
	return newID.Bytes, nil
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
