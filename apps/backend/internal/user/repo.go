package user

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
)

// ErrConflict is returned when a unique constraint is violated (username or email).
var ErrConflict = errors.New("username or email already exists")

type createParams struct {
	Username string
	Email    string
	Hash     string
	Name     *string
}

// UserRepo wraps sqlc queries for the users table.
type UserRepo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

// create inserts a user row within the provided transaction and returns the
// public-safe row. Callers are responsible for commit/rollback.
func (r *UserRepo) create(ctx context.Context, tx pgx.Tx, p createParams) (db.CreateUserRow, error) {
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
			return db.CreateUserRow{}, ErrConflict
		}
		return db.CreateUserRow{}, err
	}
	return row, nil
}

// Create opens a transaction, inserts the user, and commits. Any failure rolls
// back and returns the original error (or ErrConflict for unique violations).
func (r *UserRepo) Create(ctx context.Context, p createParams) (db.CreateUserRow, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return db.CreateUserRow{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	row, err := r.create(ctx, tx, p)
	if err != nil {
		return db.CreateUserRow{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return db.CreateUserRow{}, err
	}
	return row, nil
}
