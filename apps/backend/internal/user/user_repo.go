package user

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
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

// toPublicUser converts the common set of scanned columns into a public-safe model.
// It accepts individual fields rather than a specific generated row type so it can
// be reused across CreateUserRow, GetUserByIDRow, and UpdateUserProfileRow.
func toPublicUser(
	id int64,
	name *string,
	username, email, picture string,
	status db.UserStatus,
	lastLogin, createdAt pgtype.Timestamptz,
) models.User {
	var ll *time.Time
	if lastLogin.Valid {
		t := lastLogin.Time
		ll = &t
	}
	return models.User{
		ID:        id,
		Name:      name,
		Username:  username,
		Email:     email,
		Picture:   picture,
		Status:    models.UserStatus(status),
		LastLogin: ll,
		CreatedAt: createdAt.Time,
	}
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
	return toPublicUser(row.ID, row.Name, row.Username, row.Email, row.Picture, row.Status, row.LastLogin, row.CreatedAt)
}

// GetByID returns the public-safe user model for the given id.
// Returns ErrNotFound if the user does not exist or has been soft-deleted.
func (r *UserRepo) GetByID(ctx context.Context, id int64) (models.User, error) {
	r.log.Debug("executing GetUserByID query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	row, err := q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrNotFound
		}
		r.log.Error("GetUserByID query failed", zap.Int64("user_id", id), zap.Error(err))
		return models.User{}, err
	}
	return toPublicUser(row.ID, row.Name, row.Username, row.Email, row.Picture, row.Status, row.LastLogin, row.CreatedAt), nil
}

// UpdateProfile updates name, username, email and picture for the given user.
// Returns ErrNotFound if the user is gone, ErrConflict on a unique violation.
func (r *UserRepo) UpdateProfile(ctx context.Context, p UpdateProfileParams) (models.User, error) {
	r.log.Debug("executing UpdateUserProfile query", zap.Int64("user_id", p.ID))
	q := db.New(r.pool)
	row, err := q.UpdateUserProfile(ctx, db.UpdateUserProfileParams{
		ID:       p.ID,
		Name:     p.Name,
		Username: p.Username,
		Email:    p.Email,
		Picture:  p.Picture,
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
		return models.User{}, err
	}
	return toPublicUser(row.ID, row.Name, row.Username, row.Email, row.Picture, row.Status, row.LastLogin, row.CreatedAt), nil
}

// UpdatePassword replaces the bcrypt hash for the given user.
func (r *UserRepo) UpdatePassword(ctx context.Context, id int64, hash string) error {
	r.log.Debug("executing UpdateUserPassword query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	return q.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{ID: id, Hash: hash})
}

// SoftDelete sets deleted_at on the user row. It is idempotent: if the user is
// already soft-deleted the UPDATE matches zero rows and no error is returned.
func (r *UserRepo) SoftDelete(ctx context.Context, id int64) error {
	r.log.Debug("executing SoftDeleteUser query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	return q.SoftDeleteUser(ctx, id)
}

// GetHashByID returns the bcrypt hash for the given user.
// Returns ErrNotFound if the user is gone or soft-deleted.
func (r *UserRepo) GetHashByID(ctx context.Context, id int64) (string, error) {
	r.log.Debug("executing GetUserHashByID query", zap.Int64("user_id", id))
	q := db.New(r.pool)
	hash, err := q.GetUserHashByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		r.log.Error("GetUserHashByID query failed", zap.Int64("user_id", id), zap.Error(err))
		return "", err
	}
	return hash, nil
}
