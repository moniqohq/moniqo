package user

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"go.uber.org/zap"
)

// UserRepo wraps sqlc queries for the users table.
type UserRepo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

func NewUserRepo(pool *pgxpool.Pool, log *zap.Logger) *UserRepo {
	return &UserRepo{pool: pool, log: log}
}

// create inserts a user row within the provided transaction and returns the
// public-safe model. Callers are responsible for commit/rollback.
func (r *UserRepo) create(ctx context.Context, tx pgx.Tx, p CreateParams) (models.User, error) {
	r.log.Debug("executing CreateUser query", zap.String("username", p.Username), zap.String("email", p.Email))

	q := db.New(tx)
	row, err := q.CreateUser(ctx, db.CreateUserParams{
		Username: p.Username,
		Email:    p.Email,
		Hash:     p.Hash,
		Name:     p.Name,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			r.log.Debug("unique constraint violation on user insert", zap.String("username", p.Username), zap.String("email", p.Email))
			return models.User{}, ErrConflict
		}
		r.log.Error("CreateUser query failed", zap.String("username", p.Username), zap.Error(err))
		return models.User{}, err
	}

	r.log.Debug("CreateUser query succeeded", zap.Int64("user_id", row.ID))
	return rowToPublic(row), nil
}

// Create opens a transaction, inserts the user, and commits. Any failure rolls
// back and returns the original error (or ErrConflict for unique violations).
func (r *UserRepo) Create(ctx context.Context, p CreateParams) (models.User, error) {
	r.log.Debug("beginning transaction for user insert")

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		r.log.Error("failed to begin transaction", zap.Error(err))
		return models.User{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	pub, err := r.create(ctx, tx, p)
	if err != nil {
		return models.User{}, err
	}

	r.log.Debug("committing transaction", zap.Int64("user_id", pub.ID))
	if err := tx.Commit(ctx); err != nil {
		r.log.Error("failed to commit user insert transaction", zap.Int64("user_id", pub.ID), zap.Error(err))
		return models.User{}, err
	}

	r.log.Info("user row committed to database", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	return pub, nil
}

func rowToPublic(row db.CreateUserRow) models.User {
	return models.User{
		ID:        row.ID,
		Name:      row.Name,
		Username:  row.Username,
		Email:     row.Email,
		Picture:   row.Picture,
		Status:    models.UserStatus(row.Status),
		LastLogin: nil,
		CreatedAt: row.CreatedAt.Time,
	}
}
