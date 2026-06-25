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

package budget

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repo wraps sqlc queries for the budgets table.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewRepo returns a Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// rowToBudget converts a generated db.Budget row to the public-safe model.
func rowToBudget(b db.Budget) models.Budget {
	return models.Budget{
		ID:        b.ID,
		Title:     b.Title,
		Notes:     b.Notes,
		CreatedAt: b.CreatedAt.Time,
	}
}

// CreateWithOwner atomically inserts a budget and an OWNER membership for
// ownerUserID. Returns the new budget. On failure the transaction is rolled back.
func (r *Repo) CreateWithOwner(ctx context.Context, p CreateParams, ownerUserID int64) (models.Budget, error) {
	r.log.Debug("beginning CreateWithOwner transaction", zap.String("title", p.Title))

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return models.Budget{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	budget, err := q.CreateBudget(ctx, db.CreateBudgetParams{
		Title: p.Title,
		Notes: p.Notes,
	})
	if err != nil {
		r.log.Error("CreateBudget query failed", zap.String("title", p.Title), zap.Error(err))
		return models.Budget{}, fmt.Errorf("create budget: %w", err)
	}

	_, err = q.CreateMembership(ctx, db.CreateMembershipParams{
		BudgetID: budget.ID,
		UserID:   ownerUserID,
		Role:     db.BudgetRoleOWNER,
	})
	if err != nil {
		r.log.Error("CreateMembership (OWNER) query failed", zap.Int64("budget_id", budget.ID), zap.Error(err))
		return models.Budget{}, fmt.Errorf("create owner membership: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Budget{}, fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("budget created with owner", zap.Int64("budget_id", budget.ID), zap.Int64("owner_id", ownerUserID))
	return rowToBudget(budget), nil
}

// GetByID returns the budget with the given id. Returns ErrNotFound if missing
// or soft-deleted.
func (r *Repo) GetByID(ctx context.Context, id int64) (models.Budget, error) {
	r.log.Debug("executing GetBudgetByID query", zap.Int64("budget_id", id))
	q := db.New(r.pool)
	row, err := q.GetBudgetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Budget{}, ErrNotFound
		}
		r.log.Error("GetBudgetByID query failed", zap.Int64("budget_id", id), zap.Error(err))
		return models.Budget{}, fmt.Errorf("get budget by id: %w", err)
	}
	return rowToBudget(row), nil
}

// ListForUser returns all active budgets the user is a member of.
func (r *Repo) ListForUser(ctx context.Context, userID int64) ([]models.Budget, error) {
	r.log.Debug("executing ListBudgetsForUser query", zap.Int64("user_id", userID))
	q := db.New(r.pool)
	rows, err := q.ListBudgetsForUser(ctx, userID)
	if err != nil {
		r.log.Error("ListBudgetsForUser query failed", zap.Int64("user_id", userID), zap.Error(err))
		return nil, fmt.Errorf("list budgets for user: %w", err)
	}
	out := make([]models.Budget, len(rows))
	for i, row := range rows {
		out[i] = rowToBudget(row)
	}
	return out, nil
}

// Update performs a full replacement of a budget's title and notes.
// Returns ErrNotFound if the budget is gone or soft-deleted.
func (r *Repo) Update(ctx context.Context, p UpdateParams) (models.Budget, error) {
	r.log.Debug("executing UpdateBudget query", zap.Int64("budget_id", p.ID))
	q := db.New(r.pool)
	row, err := q.UpdateBudget(ctx, db.UpdateBudgetParams{
		ID:    p.ID,
		Title: p.Title,
		Notes: p.Notes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Budget{}, ErrNotFound
		}
		r.log.Error("UpdateBudget query failed", zap.Int64("budget_id", p.ID), zap.Error(err))
		return models.Budget{}, fmt.Errorf("update budget: %w", err)
	}
	return rowToBudget(row), nil
}

// Patch applies only the non-nil fields from p.
// Returns ErrNotFound if the budget is gone or soft-deleted.
func (r *Repo) Patch(ctx context.Context, p PatchParams) (models.Budget, error) {
	r.log.Debug("executing PatchBudget query", zap.Int64("budget_id", p.ID))
	q := db.New(r.pool)
	row, err := q.PatchBudget(ctx, db.PatchBudgetParams{
		ID:    p.ID,
		Title: p.Title,
		Notes: p.Notes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Budget{}, ErrNotFound
		}
		r.log.Error("PatchBudget query failed", zap.Int64("budget_id", p.ID), zap.Error(err))
		return models.Budget{}, fmt.Errorf("patch budget: %w", err)
	}
	return rowToBudget(row), nil
}

// SoftDeleteCascade soft-deletes the budget and all active memberships in a
// single transaction. Idempotent: already-deleted budgets match zero rows and
// no error is returned.
// M3/M4 extension point: archive accounts and envelopes here once those
// tables exist (doctrine item 5 — never physically delete or touch transactions).
func (r *Repo) SoftDeleteCascade(ctx context.Context, budgetID int64) error {
	r.log.Debug("beginning SoftDeleteCascade transaction", zap.Int64("budget_id", budgetID))

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if err := q.SoftDeleteBudget(ctx, budgetID); err != nil {
		r.log.Error("SoftDeleteBudget query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return fmt.Errorf("soft delete budget: %w", err)
	}

	if err := q.SoftDeleteAllMembershipsForBudget(ctx, budgetID); err != nil {
		r.log.Error("SoftDeleteAllMembershipsForBudget query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return fmt.Errorf("soft delete memberships: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info("budget soft-deleted with cascade", zap.Int64("budget_id", budgetID))
	return nil
}

// TitleExistsForUser reports whether the user (as OWNER) already has an active
// budget with the given title, excluding budgetID (pass 0 for create checks).
func (r *Repo) TitleExistsForUser(ctx context.Context, userID int64, title string, excludeBudgetID int64) (bool, error) {
	q := db.New(r.pool)
	exists, err := q.BudgetTitleExistsForUser(ctx, db.BudgetTitleExistsForUserParams{
		UserID: userID,
		Lower:  title,
		ID:     excludeBudgetID,
	})
	if err != nil {
		return false, fmt.Errorf("title exists check: %w", err)
	}
	return exists, nil
}
