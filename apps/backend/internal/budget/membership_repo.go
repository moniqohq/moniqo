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
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// MembershipRepo wraps sqlc queries for the budget_users table.
// It is in the same package as Repo so both share the same sentinel errors.
type MembershipRepo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewMembershipRepo returns a MembershipRepo backed by the given connection pool.
func NewMembershipRepo(pool *pgxpool.Pool, log *zap.Logger) *MembershipRepo {
	return &MembershipRepo{pool: pool, log: log}
}

// rowToMember converts a generated db.BudgetUser row to the public-safe model.
func rowToMember(bu db.BudgetUser) models.BudgetUser {
	return models.BudgetUser{
		ID:       bu.ID,
		BudgetID: bu.BudgetID,
		UserID:   bu.UserID,
		Role:     models.Role(bu.Role),
		JoinedAt: bu.JoinedAt.Time,
	}
}

// CreateMembership inserts a membership record and returns the new model.
// Returns ErrAlreadyMember if a unique constraint fires (active membership exists).
func (r *MembershipRepo) CreateMembership(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	r.log.Debug("executing CreateMembership query", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID))
	q := db.New(r.pool)
	row, err := q.CreateMembership(ctx, db.CreateMembershipParams{
		BudgetID: budgetID,
		UserID:   userID,
		Role:     db.BudgetRole(role),
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.BudgetUser{}, ErrAlreadyMember
		}
		r.log.Error("CreateMembership query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return models.BudgetUser{}, fmt.Errorf("create membership: %w", err)
	}
	return rowToMember(row), nil
}

// GetMembership returns the active membership for (budgetID, userID).
// Returns ErrMembershipNotFound if absent or soft-deleted.
func (r *MembershipRepo) GetMembership(ctx context.Context, budgetID, userID int64) (models.BudgetUser, error) {
	r.log.Debug("executing GetMembership query", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID))
	q := db.New(r.pool)
	row, err := q.GetMembership(ctx, db.GetMembershipParams{BudgetID: budgetID, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetUser{}, ErrMembershipNotFound
		}
		r.log.Error("GetMembership query failed", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID), zap.Error(err))
		return models.BudgetUser{}, fmt.Errorf("get membership: %w", err)
	}
	return rowToMember(row), nil
}

// ListMembers returns all active members of the given budget.
func (r *MembershipRepo) ListMembers(ctx context.Context, budgetID int64) ([]models.BudgetUser, error) {
	r.log.Debug("executing ListMembersForBudget query", zap.Int64("budget_id", budgetID))
	q := db.New(r.pool)
	rows, err := q.ListMembersForBudget(ctx, budgetID)
	if err != nil {
		r.log.Error("ListMembersForBudget query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return nil, fmt.Errorf("list members: %w", err)
	}
	out := make([]models.BudgetUser, len(rows))
	for i, row := range rows {
		out[i] = rowToMember(row)
	}
	return out, nil
}

// UpdateRole changes the role of an existing active membership.
// Returns ErrMembershipNotFound if the membership does not exist.
func (r *MembershipRepo) UpdateRole(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	r.log.Debug("executing UpdateMemberRole query", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID))
	q := db.New(r.pool)
	row, err := q.UpdateMemberRole(ctx, db.UpdateMemberRoleParams{
		BudgetID: budgetID,
		UserID:   userID,
		Role:     db.BudgetRole(role),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.BudgetUser{}, ErrMembershipNotFound
		}
		r.log.Error("UpdateMemberRole query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return models.BudgetUser{}, fmt.Errorf("update member role: %w", err)
	}
	return rowToMember(row), nil
}

// RemoveMembership soft-deletes the membership for (budgetID, userID). Idempotent.
func (r *MembershipRepo) RemoveMembership(ctx context.Context, budgetID, userID int64) error {
	r.log.Debug("executing SoftDeleteMembership query", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID))
	q := db.New(r.pool)
	if err := q.SoftDeleteMembership(ctx, db.SoftDeleteMembershipParams{BudgetID: budgetID, UserID: userID}); err != nil {
		r.log.Error("SoftDeleteMembership query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return fmt.Errorf("remove membership: %w", err)
	}
	return nil
}

// RemoveAllForBudget soft-deletes all active memberships for the given budget.
func (r *MembershipRepo) RemoveAllForBudget(ctx context.Context, budgetID int64) error {
	q := db.New(r.pool)
	if err := q.SoftDeleteAllMembershipsForBudget(ctx, budgetID); err != nil {
		return fmt.Errorf("remove all memberships: %w", err)
	}
	return nil
}

// CountOwners returns the number of active OWNER members for the given budget.
func (r *MembershipRepo) CountOwners(ctx context.Context, budgetID int64) (int64, error) {
	q := db.New(r.pool)
	count, err := q.CountOwnersForBudget(ctx, budgetID)
	if err != nil {
		return 0, fmt.Errorf("count owners: %w", err)
	}
	return count, nil
}

// TransferOwnership atomically promotes targetUserID to OWNER and demotes
// currentOwnerID to ADMIN in a single transaction.
func (r *MembershipRepo) TransferOwnership(ctx context.Context, budgetID, currentOwnerID, targetUserID int64) error {
	r.log.Debug(
		"beginning TransferOwnership transaction",
		zap.Int64("budget_id", budgetID),
		zap.Int64("current_owner", currentOwnerID),
		zap.Int64("target_user", targetUserID),
	)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	q := db.New(tx)

	if _, err := q.UpdateMemberRole(ctx, db.UpdateMemberRoleParams{
		BudgetID: budgetID,
		UserID:   targetUserID,
		Role:     db.BudgetRoleOWNER,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrMembershipNotFound
		}
		r.log.Error("promote target to OWNER failed", zap.Int64("target_user", targetUserID), zap.Error(err))
		return fmt.Errorf("promote target to owner: %w", err)
	}

	if _, err := q.UpdateMemberRole(ctx, db.UpdateMemberRoleParams{
		BudgetID: budgetID,
		UserID:   currentOwnerID,
		Role:     db.BudgetRoleADMIN,
	}); err != nil {
		r.log.Error("demote current owner failed", zap.Int64("current_owner", currentOwnerID), zap.Error(err))
		return fmt.Errorf("demote current owner: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	r.log.Info(
		"ownership transferred",
		zap.Int64("budget_id", budgetID),
		zap.Int64("new_owner", targetUserID),
		zap.Int64("new_admin", currentOwnerID),
	)
	return nil
}
