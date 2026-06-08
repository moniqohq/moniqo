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

// AuthRepo implements AuthRepository using PostgreSQL.
type AuthRepo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

func NewAuthRepo(pool *pgxpool.Pool, log *zap.Logger) *AuthRepo {
	return &AuthRepo{pool: pool, log: log}
}

func (r *AuthRepo) GetUserByEmail(ctx context.Context, email string) (UserCredentials, error) {
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

func (r *AuthRepo) UpdateLastLogin(ctx context.Context, userID int64) error {
	q := db.New(r.pool)
	if err := q.UpdateLastLogin(ctx, userID); err != nil {
		r.log.Error("UpdateLastLogin query failed", zap.Int64("user_id", userID), zap.Error(err))
		return err
	}
	return nil
}

func (r *AuthRepo) InsertRevokedAccessToken(ctx context.Context, p InsertRevokedTokenParams) error {
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

func (r *AuthRepo) IsAccessTokenRevoked(ctx context.Context, jti pgtype.UUID) (bool, error) {
	q := db.New(r.pool)
	revoked, err := q.IsAccessTokenRevoked(ctx, jti)
	if err != nil {
		r.log.Error("IsAccessTokenRevoked query failed", zap.Error(err))
		return false, err
	}
	return revoked, nil
}

func (r *AuthRepo) UserExistsByID(ctx context.Context, userID int64) (bool, error) {
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
