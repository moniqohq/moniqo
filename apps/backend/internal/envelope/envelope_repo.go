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

package envelope

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Repository defines the data-access contract for envelopes.
//
//nolint:interfacebloat
type Repository interface {
	Create(ctx context.Context, p CreateParams) (models.BudgetEnvelope, error)
	GetByID(ctx context.Context, id, budgetID int64) (models.BudgetEnvelope, error)
	ArchivedState(ctx context.Context, id, budgetID int64) (exists, archived bool, err error)
	ListByBudget(ctx context.Context, budgetID int64, archived *bool) ([]models.BudgetEnvelope, error)
	Update(ctx context.Context, p UpdateParams) (models.BudgetEnvelope, error)
	Patch(ctx context.Context, p PatchParams) (models.BudgetEnvelope, error)
	SoftDelete(ctx context.Context, id, budgetID int64) error
	HardDelete(ctx context.Context, id, budgetID int64) error
	ForceDelete(ctx context.Context, id, budgetID int64) error
	ExistsByTitle(ctx context.Context, budgetID int64, title string, excludeID *int64) (bool, error)
	HasTransactions(ctx context.Context, id, budgetID int64) (bool, error)
	SumSpent(ctx context.Context, id, budgetID int64) (money.Amount, error)
	SumOnBudgetBalances(ctx context.Context, budgetID int64) (money.Amount, error)
	GetBudgetSummaryRow(ctx context.Context, budgetID int64) (db.GetBudgetEnvelopeSummaryRow, error)
	GetNetWorth(ctx context.Context, budgetID int64) (money.Amount, error)
	GetMonthlyStats(ctx context.Context, budgetID int64, month time.Time) (db.GetMonthlyStatsRow, error)
	GetMonthlySparkline(ctx context.Context, budgetID int64) ([]db.GetMonthlySparklineRow, error)
	Reallocate(ctx context.Context, budgetID int64, req ReallocateRequest) (fromEnv, toEnv *models.BudgetEnvelope, err error)
}

// Repo is the sqlc-backed implementation of Repository.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewRepo returns a Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// toModel converts a db.Envelope row into a models.BudgetEnvelope.
// SpentAmt and IsOverspent must be set by the caller after this call.
func toModel(row db.Envelope) models.BudgetEnvelope {
	return models.BudgetEnvelope{
		ID:           row.ID,
		BudgetID:     row.BudgetID,
		Title:        row.Title,
		AllocatedAmt: money.FromMinorUnits(row.AllocatedAmt),
		Description:  row.Description,
		Nature:       row.Nature,
		IsArchived:   row.DeletedAt.Valid,
		CreatedAt:    row.CreatedAt.Time,
	}
}

// Create inserts a new envelope and returns it with zero computed values.
func (r *Repo) Create(ctx context.Context, p CreateParams) (models.BudgetEnvelope, error) {
	r.log.Debug("executing CreateEnvelope query",
		zap.Int64("budget_id", p.BudgetID),
		zap.String("title", p.Title),
	)

	q := db.New(r.pool)
	row, err := q.CreateEnvelope(ctx, db.CreateEnvelopeParams{
		BudgetID:     p.BudgetID,
		Title:        p.Title,
		AllocatedAmt: p.AllocatedAmt.Int64(),
		Description:  p.Description,
		Nature:       p.Nature,
	})
	if err != nil {
		r.log.Error("CreateEnvelope query failed",
			zap.Int64("budget_id", p.BudgetID),
			zap.String("title", p.Title),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("create envelope: %w", err)
	}

	r.log.Info("envelope created",
		zap.Int64("envelope_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return toModel(row), nil
}

// GetByID returns the envelope with the given id scoped to budgetID.
// Returns ErrNotFound if the envelope does not exist or is soft-deleted.
func (r *Repo) GetByID(ctx context.Context, id, budgetID int64) (models.BudgetEnvelope, error) {
	r.log.Debug("executing GetEnvelopeByID query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	row, err := q.GetEnvelopeByID(ctx, db.GetEnvelopeByIDParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetEnvelope{}, ErrNotFound
		}
		r.log.Error("GetEnvelopeByID query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("get envelope by id: %w", err)
	}

	return toModel(row), nil
}

// ArchivedState reports whether an envelope exists within budgetID and, if so,
// whether it is archived (soft-deleted). exists is false when the envelope does
// not exist or belongs to a different budget.
func (r *Repo) ArchivedState(ctx context.Context, id, budgetID int64) (exists, archived bool, err error) {
	r.log.Debug("executing IsEnvelopeArchived query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	archived, err = q.IsEnvelopeArchived(ctx, db.IsEnvelopeArchivedParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, false, nil
		}
		r.log.Error("IsEnvelopeArchived query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return false, false, fmt.Errorf("is envelope archived: %w", err)
	}

	return true, archived, nil
}

// ListByBudget returns envelopes belonging to budgetID, filtered by archived
// state: nil returns all envelopes, true returns only archived envelopes, false
// returns only active envelopes. Returns an empty slice (never nil) when the
// budget has no matching envelopes.
func (r *Repo) ListByBudget(ctx context.Context, budgetID int64, archived *bool) ([]models.BudgetEnvelope, error) {
	r.log.Debug("executing ListEnvelopesByBudget query", zap.Int64("budget_id", budgetID))

	q := db.New(r.pool)
	rows, err := q.ListEnvelopesByBudget(ctx, db.ListEnvelopesByBudgetParams{
		BudgetID: budgetID,
		Archived: archived,
	})
	if err != nil {
		r.log.Error("ListEnvelopesByBudget query failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("list envelopes by budget: %w", err)
	}

	out := make([]models.BudgetEnvelope, 0, len(rows))
	for _, row := range rows {
		out = append(out, toModel(row))
	}
	return out, nil
}

// Update performs a full replacement of all mutable envelope fields.
// Locks the envelope row and re-checks allocated_amt >= spent inside the same
// transaction as the write, closing the TOCTOU window between reading spent
// and applying the update. Returns ErrNotFound if the envelope does not exist
// or is soft-deleted, ErrValidation if the new allocated_amt would fall below
// what has already been spent.
//
//nolint:revive
func (r *Repo) Update(ctx context.Context, p UpdateParams) (models.BudgetEnvelope, error) {
	r.log.Debug("executing UpdateEnvelope query",
		zap.Int64("envelope_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.BudgetEnvelope{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if _, err := q.GetEnvelopeForUpdate(ctx, db.GetEnvelopeForUpdateParams{
		ID:       p.ID,
		BudgetID: p.BudgetID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetEnvelope{}, ErrNotFound
		}
		return models.BudgetEnvelope{}, fmt.Errorf("lock envelope: %w", err)
	}

	spent, err := sumSpentTx(ctx, q, p.ID, p.BudgetID)
	if err != nil {
		return models.BudgetEnvelope{}, err
	}
	if !CanDecreaseAllocatedAmt(p.AllocatedAmt, spent) {
		return models.BudgetEnvelope{}, ErrValidation
	}

	row, err := q.UpdateEnvelope(ctx, db.UpdateEnvelopeParams{
		ID:           p.ID,
		BudgetID:     p.BudgetID,
		Title:        p.Title,
		AllocatedAmt: p.AllocatedAmt.Int64(),
		Description:  p.Description,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetEnvelope{}, ErrNotFound
		}
		r.log.Error("UpdateEnvelope query failed",
			zap.Int64("envelope_id", p.ID),
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("update envelope: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.BudgetEnvelope{}, fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("envelope updated",
		zap.Int64("envelope_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return withSpent(toModel(row), spent), nil
}

// Patch applies only the non-nil fields from p to the envelope row.
// When p.AllocatedAmt is non-nil, locks the envelope row and re-checks
// allocated_amt >= spent inside the same transaction as the write, closing the
// TOCTOU window between reading spent and applying the patch. Returns
// ErrNotFound if the envelope does not exist or is soft-deleted, ErrValidation
// if the new allocated_amt would fall below what has already been spent.
//
//nolint:revive,funlen
func (r *Repo) Patch(ctx context.Context, p PatchParams) (models.BudgetEnvelope, error) {
	r.log.Debug("executing PatchEnvelope query",
		zap.Int64("envelope_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.BudgetEnvelope{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if _, err := q.GetEnvelopeForUpdate(ctx, db.GetEnvelopeForUpdateParams{
		ID:       p.ID,
		BudgetID: p.BudgetID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetEnvelope{}, ErrNotFound
		}
		return models.BudgetEnvelope{}, fmt.Errorf("lock envelope: %w", err)
	}

	spent, err := sumSpentTx(ctx, q, p.ID, p.BudgetID)
	if err != nil {
		return models.BudgetEnvelope{}, err
	}

	var allocatedAmt *int64
	if p.AllocatedAmt != nil {
		if !CanDecreaseAllocatedAmt(*p.AllocatedAmt, spent) {
			return models.BudgetEnvelope{}, ErrValidation
		}
		v := p.AllocatedAmt.Int64()
		allocatedAmt = &v
	}

	row, err := q.PatchEnvelope(ctx, db.PatchEnvelopeParams{
		ID:           p.ID,
		BudgetID:     p.BudgetID,
		Title:        p.Title,
		AllocatedAmt: allocatedAmt,
		Description:  p.Description,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetEnvelope{}, ErrNotFound
		}
		r.log.Error("PatchEnvelope query failed",
			zap.Int64("envelope_id", p.ID),
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("patch envelope: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.BudgetEnvelope{}, fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("envelope patched",
		zap.Int64("envelope_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return withSpent(toModel(row), spent), nil
}

// sumSpentTx returns the positive-magnitude spent amount for envelopeID within
// the given queryable (pool or transaction).
func sumSpentTx(ctx context.Context, q *db.Queries, envelopeID, budgetID int64) (money.Amount, error) {
	total, err := q.SumEnvelopeSpent(ctx, db.SumEnvelopeSpentParams{
		EnvelopeID: &envelopeID,
		BudgetID:   budgetID,
	})
	if err != nil {
		return 0, fmt.Errorf("sum envelope spent: %w", err)
	}
	return money.FromMinorUnits(total), nil
}

// lockEnvelope locks and returns the envelope row for id/budgetID within tx.
// Returns ErrNotFound if the envelope does not exist or is soft-deleted.
func lockEnvelope(ctx context.Context, q *db.Queries, id, budgetID int64) (db.Envelope, error) {
	row, err := q.GetEnvelopeForUpdate(ctx, db.GetEnvelopeForUpdateParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return db.Envelope{}, ErrNotFound
		}
		return db.Envelope{}, fmt.Errorf("lock envelope: %w", err)
	}
	return row, nil
}

// tbbTx computes To Be Budgeted within tx: on-budget cash minus the sum of
// envelope available (allocated - spent) across all live envelopes in budgetID.
func tbbTx(ctx context.Context, q *db.Queries, budgetID int64) (money.Amount, error) {
	cash, err := q.SumOnBudgetAccountBalances(ctx, budgetID)
	if err != nil {
		return 0, fmt.Errorf("sum on-budget account balances: %w", err)
	}
	summary, err := q.GetBudgetEnvelopeSummary(ctx, budgetID)
	if err != nil {
		return 0, fmt.Errorf("get budget envelope summary: %w", err)
	}
	return money.FromMinorUnits(cash - summary.TotalAllocated + summary.TotalSpent), nil
}

// Reallocate atomically moves amount between two envelopes, or between an
// envelope and To Be Budgeted (a nil FromEnvelopeID/ToEnvelopeID means TBB).
// Both envelope rows involved are locked in ascending id order to avoid
// deadlocking against a concurrent, opposite reallocation. Returns
// ErrNotFound if either envelope does not exist, ErrValidation if the source
// does not have enough available balance to cover the amount.
//
//nolint:funlen,cyclop,revive
func (r *Repo) Reallocate(
	ctx context.Context,
	budgetID int64,
	req ReallocateRequest,
) (fromEnv, toEnv *models.BudgetEnvelope, err error) {
	r.log.Debug("executing Reallocate",
		zap.Int64("budget_id", budgetID),
		zap.Int64p("from_envelope_id", req.FromEnvelopeID),
		zap.Int64p("to_envelope_id", req.ToEnvelopeID),
	)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	const maxReallocateEnvelopes = 2
	ids := make([]int64, 0, maxReallocateEnvelopes)
	if req.FromEnvelopeID != nil {
		ids = append(ids, *req.FromEnvelopeID)
	}
	if req.ToEnvelopeID != nil {
		ids = append(ids, *req.ToEnvelopeID)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	rows := make(map[int64]db.Envelope, len(ids))
	spent := make(map[int64]money.Amount, len(ids))
	for _, id := range ids {
		row, err := lockEnvelope(ctx, q, id, budgetID)
		if err != nil {
			return nil, nil, err
		}
		s, err := sumSpentTx(ctx, q, id, budgetID)
		if err != nil {
			return nil, nil, err
		}
		rows[id] = row
		spent[id] = s
	}

	amount := req.Amount.Int64()

	if req.FromEnvelopeID != nil {
		src := rows[*req.FromEnvelopeID]
		available := src.AllocatedAmt - spent[*req.FromEnvelopeID].Int64()
		if amount > available || src.AllocatedAmt-amount < 0 {
			return nil, nil, ErrValidation
		}
	} else {
		tbb, err := tbbTx(ctx, q, budgetID)
		if err != nil {
			return nil, nil, err
		}
		if amount > tbb.Int64() {
			return nil, nil, ErrValidation
		}
	}

	if req.FromEnvelopeID != nil {
		row, err := q.AdjustEnvelopeAllocated(ctx, db.AdjustEnvelopeAllocatedParams{
			ID:           *req.FromEnvelopeID,
			BudgetID:     budgetID,
			AllocatedAmt: -amount,
		})
		if err != nil {
			return nil, nil, fmt.Errorf("adjust source envelope: %w", err)
		}
		e := withSpent(toModel(row), spent[*req.FromEnvelopeID])
		fromEnv = &e
	}

	if req.ToEnvelopeID != nil {
		row, err := q.AdjustEnvelopeAllocated(ctx, db.AdjustEnvelopeAllocatedParams{
			ID:           *req.ToEnvelopeID,
			BudgetID:     budgetID,
			AllocatedAmt: amount,
		})
		if err != nil {
			return nil, nil, fmt.Errorf("adjust destination envelope: %w", err)
		}
		e := withSpent(toModel(row), spent[*req.ToEnvelopeID])
		toEnv = &e
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("envelopes reallocated",
		zap.Int64("budget_id", budgetID),
		zap.Int64p("from_envelope_id", req.FromEnvelopeID),
		zap.Int64p("to_envelope_id", req.ToEnvelopeID),
		zap.Int64("amount", amount),
	)
	return fromEnv, toEnv, nil
}

// SoftDelete marks the envelope as deleted. Idempotent: re-deleting an already
// soft-deleted envelope is a no-op.
func (r *Repo) SoftDelete(ctx context.Context, id, budgetID int64) error {
	r.log.Debug("executing SoftDeleteEnvelope query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	if err := q.SoftDeleteEnvelope(ctx, db.SoftDeleteEnvelopeParams{
		ID:       id,
		BudgetID: budgetID,
	}); err != nil {
		r.log.Error("SoftDeleteEnvelope query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("soft delete envelope: %w", err)
	}

	r.log.Info("envelope soft-deleted",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

// HardDelete physically removes the envelope row.
func (r *Repo) HardDelete(ctx context.Context, id, budgetID int64) error {
	r.log.Debug("executing HardDeleteEnvelope query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	if err := q.HardDeleteEnvelope(ctx, db.HardDeleteEnvelopeParams{
		ID:       id,
		BudgetID: budgetID,
	}); err != nil {
		r.log.Error("HardDeleteEnvelope query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("hard delete envelope: %w", err)
	}

	r.log.Info("envelope hard-deleted",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

// ForceDelete atomically hard-deletes the envelope and all of its transactions
// (including already soft-deleted ones), regardless of transaction history.
func (r *Repo) ForceDelete(ctx context.Context, id, budgetID int64) error {
	r.log.Debug("beginning ForceDelete transaction",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.HardDeleteTransactionsByEnvelope(ctx, db.HardDeleteTransactionsByEnvelopeParams{
		EnvelopeID: &id,
		BudgetID:   budgetID,
	}); err != nil {
		r.log.Error("HardDeleteTransactionsByEnvelope query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("hard delete envelope transactions: %w", err)
	}

	if err := q.HardDeleteEnvelope(ctx, db.HardDeleteEnvelopeParams{
		ID:       id,
		BudgetID: budgetID,
	}); err != nil {
		r.log.Error("HardDeleteEnvelope query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("hard delete envelope: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("envelope force-deleted",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

// ExistsByTitle reports whether a live envelope with the given title already
// exists within budgetID. When excludeID is non-nil the envelope with that id
// is excluded from the check (useful for PUT/PATCH where the existing title
// should not conflict with itself).
func (r *Repo) ExistsByTitle(ctx context.Context, budgetID int64, title string, excludeID *int64) (bool, error) {
	r.log.Debug("executing ExistsByTitle check",
		zap.Int64("budget_id", budgetID),
		zap.String("title", title),
	)

	q := db.New(r.pool)
	if excludeID == nil {
		exists, err := q.EnvelopeExistsByTitle(ctx, db.EnvelopeExistsByTitleParams{
			BudgetID: budgetID,
			Lower:    title,
		})
		if err != nil {
			return false, fmt.Errorf("envelope exists by title: %w", err)
		}
		return exists, nil
	}

	exists, err := q.EnvelopeExistsByTitleExcluding(ctx, db.EnvelopeExistsByTitleExcludingParams{
		BudgetID: budgetID,
		Lower:    title,
		ID:       *excludeID,
	})
	if err != nil {
		return false, fmt.Errorf("envelope exists by title excluding: %w", err)
	}
	return exists, nil
}

// HasTransactions reports whether the envelope has any active (non-deleted) transactions.
func (r *Repo) HasTransactions(ctx context.Context, id, budgetID int64) (bool, error) {
	r.log.Debug("executing EnvelopeHasTransactions query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	has, err := q.EnvelopeHasTransactions(ctx, db.EnvelopeHasTransactionsParams{
		EnvelopeID: &id,
		BudgetID:   budgetID,
	})
	if err != nil {
		r.log.Error("EnvelopeHasTransactions query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return false, fmt.Errorf("envelope has transactions: %w", err)
	}
	return has, nil
}

// SumSpent returns the total amount spent (from transactions) linked to the
// envelope, as a positive magnitude.
func (r *Repo) SumSpent(ctx context.Context, id, budgetID int64) (money.Amount, error) {
	r.log.Debug("executing SumEnvelopeSpent query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	spent, err := sumSpentTx(ctx, db.New(r.pool), id, budgetID)
	if err != nil {
		r.log.Error("SumEnvelopeSpent query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return 0, err
	}
	return spent, nil
}

// SumOnBudgetBalances returns the sum of all transaction amounts for on-budget
// accounts in the given budget. Used for To Be Budgeted (TBB) calculation.
func (r *Repo) SumOnBudgetBalances(ctx context.Context, budgetID int64) (money.Amount, error) {
	r.log.Debug("executing SumOnBudgetAccountBalances query", zap.Int64("budget_id", budgetID))

	q := db.New(r.pool)
	total, err := q.SumOnBudgetAccountBalances(ctx, budgetID)
	if err != nil {
		r.log.Error("SumOnBudgetAccountBalances query failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return 0, fmt.Errorf("sum on-budget account balances: %w", err)
	}
	return money.FromMinorUnits(total), nil
}

// GetBudgetSummaryRow returns the aggregate envelope summary row for TBB/overspend display.
func (r *Repo) GetBudgetSummaryRow(ctx context.Context, budgetID int64) (db.GetBudgetEnvelopeSummaryRow, error) {
	r.log.Debug("executing GetBudgetEnvelopeSummary query", zap.Int64("budget_id", budgetID))

	q := db.New(r.pool)
	row, err := q.GetBudgetEnvelopeSummary(ctx, budgetID)
	if err != nil {
		r.log.Error("GetBudgetEnvelopeSummary query failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return db.GetBudgetEnvelopeSummaryRow{}, fmt.Errorf("get budget envelope summary: %w", err)
	}
	return row, nil
}

// GetNetWorth returns total assets minus total liabilities for the budget,
// classifying each account's balance by its account type.
func (r *Repo) GetNetWorth(ctx context.Context, budgetID int64) (money.Amount, error) {
	q := db.New(r.pool)
	rows, err := q.GetAccountTypeBalances(ctx, budgetID)
	if err != nil {
		r.log.Error("GetAccountTypeBalances query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return 0, fmt.Errorf("get net worth: %w", err)
	}

	balances := make([]models.TypeBalance, 0, len(rows))
	for _, row := range rows {
		balances = append(balances, models.TypeBalance{
			Type:    models.AccountType(row.Type),
			Balance: money.FromMinorUnits(row.Balance),
		})
	}
	return models.NetWorth(balances), nil
}

// GetMonthlyStats returns total income and expenses for the month containing t.
func (r *Repo) GetMonthlyStats(ctx context.Context, budgetID int64, month time.Time) (db.GetMonthlyStatsRow, error) {
	q := db.New(r.pool)
	row, err := q.GetMonthlyStats(ctx, db.GetMonthlyStatsParams{
		BudgetID: budgetID,
		Column2:  pgtype.Timestamptz{Time: month, Valid: true},
	})
	if err != nil {
		r.log.Error("GetMonthlyStats query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return db.GetMonthlyStatsRow{}, fmt.Errorf("get monthly stats: %w", err)
	}
	return row, nil
}

// GetMonthlySparkline returns the last 6 months of income/expense data.
func (r *Repo) GetMonthlySparkline(ctx context.Context, budgetID int64) ([]db.GetMonthlySparklineRow, error) {
	q := db.New(r.pool)
	rows, err := q.GetMonthlySparkline(ctx, budgetID)
	if err != nil {
		r.log.Error("GetMonthlySparkline query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return nil, fmt.Errorf("get monthly sparkline: %w", err)
	}
	return rows, nil
}
