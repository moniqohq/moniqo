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

	"github.com/jackc/pgx/v5"
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
	ListByBudget(ctx context.Context, budgetID int64) ([]models.BudgetEnvelope, error)
	Update(ctx context.Context, p UpdateParams) (models.BudgetEnvelope, error)
	Patch(ctx context.Context, p PatchParams) (models.BudgetEnvelope, error)
	SoftDelete(ctx context.Context, id, budgetID int64) error
	HardDelete(ctx context.Context, id, budgetID int64) error
	ExistsByTitle(ctx context.Context, budgetID int64, title string, excludeID *int64) (bool, error)
	HasTransactions(ctx context.Context, id, budgetID int64) (bool, error)
	SumSpent(ctx context.Context, id, budgetID int64) (money.Amount, error)
	SumOnBudgetBalances(ctx context.Context, budgetID int64) (money.Amount, error)
	GetBudgetSummaryRow(ctx context.Context, budgetID int64) (db.GetBudgetEnvelopeSummaryRow, error)
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

// ListByBudget returns all active envelopes belonging to budgetID.
// Returns an empty slice (never nil) when the budget has no envelopes.
func (r *Repo) ListByBudget(ctx context.Context, budgetID int64) ([]models.BudgetEnvelope, error) {
	r.log.Debug("executing ListEnvelopesByBudget query", zap.Int64("budget_id", budgetID))

	q := db.New(r.pool)
	rows, err := q.ListEnvelopesByBudget(ctx, budgetID)
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
// Returns ErrNotFound if the envelope does not exist or is soft-deleted.
func (r *Repo) Update(ctx context.Context, p UpdateParams) (models.BudgetEnvelope, error) {
	r.log.Debug("executing UpdateEnvelope query",
		zap.Int64("envelope_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	q := db.New(r.pool)
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

	r.log.Info("envelope updated",
		zap.Int64("envelope_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return toModel(row), nil
}

// Patch applies only the non-nil fields from p to the envelope row.
// Returns ErrNotFound if the envelope does not exist or is soft-deleted.
func (r *Repo) Patch(ctx context.Context, p PatchParams) (models.BudgetEnvelope, error) {
	r.log.Debug("executing PatchEnvelope query",
		zap.Int64("envelope_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	var allocatedAmt *int64
	if p.AllocatedAmt != nil {
		v := p.AllocatedAmt.Int64()
		allocatedAmt = &v
	}

	q := db.New(r.pool)
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

	r.log.Info("envelope patched",
		zap.Int64("envelope_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return toModel(row), nil
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

// SumSpent returns the total amount spent (from transactions) linked to the envelope.
func (r *Repo) SumSpent(ctx context.Context, id, budgetID int64) (money.Amount, error) {
	r.log.Debug("executing SumEnvelopeSpent query",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	total, err := q.SumEnvelopeSpent(ctx, db.SumEnvelopeSpentParams{
		EnvelopeID: &id,
		BudgetID:   budgetID,
	})
	if err != nil {
		r.log.Error("SumEnvelopeSpent query failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return 0, fmt.Errorf("sum envelope spent: %w", err)
	}
	return money.FromMinorUnits(total), nil
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
