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

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// rowToEmailChangeRequest converts a scanned email_change_requests row into
// the repository-layer model.
func rowToEmailChangeRequest(row db.EmailChangeRequest) EmailChangeRequest {
	var consumedAt *time.Time
	if row.ConsumedAt.Valid {
		t := row.ConsumedAt.Time
		consumedAt = &t
	}
	var failedAt *time.Time
	if row.FailedAt.Valid {
		t := row.FailedAt.Time
		failedAt = &t
	}
	return EmailChangeRequest{
		ID:           uuid.UUID(row.ID.Bytes),
		UserID:       row.UserID,
		NewEmail:     row.NewEmail,
		CodeHash:     row.CodeHash,
		AttemptCount: row.AttemptCount,
		ExpiresAt:    row.ExpiresAt.Time,
		ConsumedAt:   consumedAt,
		FailedAt:     failedAt,
		CreatedAt:    row.CreatedAt.Time,
	}
}

// GetLiveEmailChange returns the user's currently-live email change request
// (neither consumed nor failed). Returns ErrNoPendingEmailChange if none exists.
func (r *Repo) GetLiveEmailChange(ctx context.Context, userID int64) (EmailChangeRequest, error) {
	q := db.New(r.pool)
	row, err := q.GetLiveEmailChangeRequest(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EmailChangeRequest{}, ErrNoPendingEmailChange
		}
		r.log.Error("GetLiveEmailChangeRequest query failed", zap.Int64("user_id", userID), zap.Error(err))
		return EmailChangeRequest{}, fmt.Errorf("get live email change request: %w", err)
	}
	return rowToEmailChangeRequest(row), nil
}

// GetEmailChangeLockout returns the most recent lockout timestamp for the
// user (the failed_at of their last three-wrong-codes request), and whether
// one exists at all. A caller compares the returned time against
// time.Now().Add(-lockoutDuration) to decide if the cooldown is still active.
func (r *Repo) GetEmailChangeLockout(ctx context.Context, userID int64) (time.Time, bool, error) {
	q := db.New(r.pool)
	failedAt, err := q.GetLatestEmailChangeLockout(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, false, nil
		}
		r.log.Error("GetLatestEmailChangeLockout query failed", zap.Int64("user_id", userID), zap.Error(err))
		return time.Time{}, false, fmt.Errorf("get latest email change lockout: %w", err)
	}
	if !failedAt.Valid {
		return time.Time{}, false, nil
	}
	return failedAt.Time, true, nil
}

// CreateEmailChange supersedes any live request for the user and inserts the
// new one, atomically — so two concurrent POSTs can never leave two valid
// codes outstanding (the email_change_requests_one_live partial unique index
// is the backstop if the transaction's own supersede-then-insert ordering
// somehow raced, which returns ErrConflict here).
func (r *Repo) CreateEmailChange(ctx context.Context, p CreateEmailChangeParams) (EmailChangeRequest, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return EmailChangeRequest{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.SupersedeEmailChangeRequests(ctx, p.UserID); err != nil {
		r.log.Error("SupersedeEmailChangeRequests query failed", zap.Int64("user_id", p.UserID), zap.Error(err))
		return EmailChangeRequest{}, fmt.Errorf("supersede email change requests: %w", err)
	}

	row, err := q.InsertEmailChangeRequest(ctx, db.InsertEmailChangeRequestParams{
		ID:        pgtype.UUID{Bytes: p.ID, Valid: true},
		UserID:    p.UserID,
		NewEmail:  p.NewEmail,
		CodeHash:  p.CodeHash,
		ExpiresAt: pgtype.Timestamptz{Time: p.ExpiresAt, Valid: true},
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return EmailChangeRequest{}, ErrConflict
		}
		r.log.Error("InsertEmailChangeRequest query failed", zap.Int64("user_id", p.UserID), zap.Error(err))
		return EmailChangeRequest{}, fmt.Errorf("insert email change request: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return EmailChangeRequest{}, fmt.Errorf("commit transaction: %w", err)
	}
	return rowToEmailChangeRequest(row), nil
}

// IncrementEmailChangeAttempt records one more failed verification attempt
// and returns the new total.
func (r *Repo) IncrementEmailChangeAttempt(ctx context.Context, requestID uuid.UUID) (int32, error) {
	q := db.New(r.pool)
	count, err := q.IncrementEmailChangeAttempt(ctx, pgtype.UUID{Bytes: requestID, Valid: true})
	if err != nil {
		r.log.Error("IncrementEmailChangeAttempt query failed", zap.String("request_id", requestID.String()), zap.Error(err))
		return 0, fmt.Errorf("increment email change attempt: %w", err)
	}
	return count, nil
}

// FailEmailChange marks the request as locked out after its third wrong
// code. Idempotent: a request already failed or consumed matches zero rows.
func (r *Repo) FailEmailChange(ctx context.Context, requestID uuid.UUID) error {
	q := db.New(r.pool)
	if err := q.MarkEmailChangeFailed(ctx, pgtype.UUID{Bytes: requestID, Valid: true}); err != nil {
		r.log.Error("MarkEmailChangeFailed query failed", zap.String("request_id", requestID.String()), zap.Error(err))
		return fmt.Errorf("mark email change failed: %w", err)
	}
	return nil
}

// CancelEmailChanges invalidates any live request for the user. Idempotent —
// canceling with nothing pending matches zero rows and is a success.
func (r *Repo) CancelEmailChanges(ctx context.Context, userID int64) error {
	q := db.New(r.pool)
	if err := q.SupersedeEmailChangeRequests(ctx, userID); err != nil {
		r.log.Error("SupersedeEmailChangeRequests query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("cancel email change requests: %w", err)
	}
	return nil
}

// CompleteEmailChange marks the request consumed and applies the new email
// to the user, atomically. Returns ErrConflict if the address was claimed by
// someone else during the verification window (the caller is expected to
// then best-effort cancel the now-dead request via CancelEmailChanges).
func (r *Repo) CompleteEmailChange(ctx context.Context, requestID uuid.UUID, userID int64, newEmail string) (models.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.User{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.MarkEmailChangeConsumed(ctx, pgtype.UUID{Bytes: requestID, Valid: true}); err != nil {
		r.log.Error("MarkEmailChangeConsumed query failed", zap.String("request_id", requestID.String()), zap.Error(err))
		return models.User{}, fmt.Errorf("mark email change consumed: %w", err)
	}

	row, err := q.UpdateUserEmail(ctx, db.UpdateUserEmailParams{ID: userID, Email: newEmail})
	if err != nil {
		return models.User{}, r.mapUpdateUserEmailErr(err, userID)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.User{}, fmt.Errorf("commit transaction: %w", err)
	}
	return toPublicUser(publicUserRow{
		ID: row.ID, Name: row.Name, Username: row.Username, Email: row.Email, Picture: row.Picture,
		Status: row.Status, Currency: row.Currency, Timezone: row.Timezone,
		OnboardingCompletedAt: row.OnboardingCompletedAt, LastLogin: row.LastLogin, CreatedAt: row.CreatedAt,
		HasPassword: row.HasPassword,
	}), nil
}

// mapUpdateUserEmailErr classifies a failed UpdateUserEmail call within
// CompleteEmailChange's transaction: not-found, a unique-violation conflict
// (the address was claimed elsewhere during the verification window), or an
// unexpected error worth logging.
func (r *Repo) mapUpdateUserEmailErr(err error, userID int64) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	r.log.Error("UpdateUserEmail query failed", zap.Int64("user_id", userID), zap.Error(err))
	return fmt.Errorf("update user email: %w", err)
}

// DeleteStaleEmailChangeRequests sweeps rows a day past creation regardless
// of outcome (see the query comment for why this is keyed off created_at
// rather than expires_at).
func (r *Repo) DeleteStaleEmailChangeRequests(ctx context.Context) error {
	q := db.New(r.pool)
	if err := q.DeleteStaleEmailChangeRequests(ctx); err != nil {
		r.log.Error("DeleteStaleEmailChangeRequests query failed", zap.Error(err))
		return fmt.Errorf("delete stale email change requests: %w", err)
	}
	return nil
}
