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

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// ErrForbidden is returned when the caller's role is insufficient to perform
// the requested operation (e.g. only OWNER/ADMIN may delete an envelope).
var ErrForbidden = errors.New("insufficient role")

// Service is the business-logic contract for envelopes.
type Service interface {
	Create(ctx context.Context, budgetID int64, req CreateRequest) (models.BudgetEnvelope, error)
	GetByID(ctx context.Context, id, budgetID int64) (models.BudgetEnvelope, error)
	List(ctx context.Context, budgetID int64) ([]models.BudgetEnvelope, error)
	Replace(ctx context.Context, id, budgetID int64, req ReplaceRequest) (models.BudgetEnvelope, error)
	Patch(ctx context.Context, id, budgetID int64, req PatchRequest) (models.BudgetEnvelope, error)
	Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error
	GetBudgetSummary(ctx context.Context, budgetID int64) (models.BudgetSummary, error)
}

// Svc is the concrete implementation of Service.
type Svc struct {
	repo Repository
	log  *zap.Logger
}

// NewSvc returns a Svc wired to the given repository.
func NewSvc(repo Repository, log *zap.Logger) *Svc {
	return &Svc{repo: repo, log: log}
}

// Create inserts a new envelope into budgetID.
func (s *Svc) Create(ctx context.Context, budgetID int64, req CreateRequest) (models.BudgetEnvelope, error) {
	s.log.Debug("creating envelope", zap.Int64("budget_id", budgetID), zap.String("title", req.Title))

	exists, err := s.repo.ExistsByTitle(ctx, budgetID, req.Title, nil)
	if err != nil {
		s.log.Error("ExistsByTitle failed during Create",
			zap.Int64("budget_id", budgetID),
			zap.String("title", req.Title),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("check envelope title: %w", err)
	}
	if exists {
		return models.BudgetEnvelope{}, ErrConflict
	}

	p := CreateParams{
		BudgetID:     budgetID,
		Title:        req.Title,
		AllocatedAmt: req.AllocatedAmt,
		Description:  req.Description,
	}
	env, err := s.repo.Create(ctx, p)
	if err != nil {
		s.log.Error("repo.Create failed",
			zap.Int64("budget_id", budgetID),
			zap.String("title", req.Title),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("create envelope: %w", err)
	}

	// New envelopes have no transactions; spent_amt is 0, is_overspent is false.
	env.SpentAmt = money.FromMinorUnits(0)
	env.IsOverspent = false

	s.log.Info("envelope created", zap.Int64("envelope_id", env.ID), zap.Int64("budget_id", budgetID))
	return env, nil
}

// GetByID returns the envelope identified by id within budgetID, including computed spent_amt.
// Returns ErrNotFound if no such active envelope exists.
func (s *Svc) GetByID(ctx context.Context, id, budgetID int64) (models.BudgetEnvelope, error) {
	s.log.Debug("fetching envelope by id",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	env, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed",
				zap.Int64("envelope_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.BudgetEnvelope{}, err //nolint:wrapcheck
	}

	return s.attachSpent(ctx, env)
}

// List returns all active envelopes within budgetID with their computed spent amounts.
// Returns an empty (non-nil) slice when the budget has no envelopes.
func (s *Svc) List(ctx context.Context, budgetID int64) ([]models.BudgetEnvelope, error) {
	s.log.Debug("listing envelopes", zap.Int64("budget_id", budgetID))

	envelopes, err := s.repo.ListByBudget(ctx, budgetID)
	if err != nil {
		s.log.Error("repo.ListByBudget failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("list envelopes: %w", err)
	}

	if envelopes == nil {
		envelopes = []models.BudgetEnvelope{}
	}

	for i, e := range envelopes {
		updated, err := s.attachSpent(ctx, e)
		if err != nil {
			s.log.Error("attachSpent failed during List",
				zap.Int64("envelope_id", e.ID),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return nil, fmt.Errorf("sum spent for envelope %d: %w", e.ID, err)
		}
		envelopes[i] = updated
	}

	return envelopes, nil
}

// Replace fully replaces all mutable fields of the envelope identified by id within budgetID.
//
//nolint:revive,funlen
func (s *Svc) Replace(ctx context.Context, id, budgetID int64, req ReplaceRequest) (models.BudgetEnvelope, error) {
	s.log.Debug("replacing envelope",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	existing, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Replace",
				zap.Int64("envelope_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.BudgetEnvelope{}, err //nolint:wrapcheck
	}

	// Check title uniqueness excluding self.
	titleConflict, err := s.repo.ExistsByTitle(ctx, budgetID, req.Title, &id)
	if err != nil {
		s.log.Error("ExistsByTitle failed during Replace",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("check envelope title: %w", err)
	}
	if titleConflict {
		return models.BudgetEnvelope{}, ErrConflict
	}

	// Fetch current spent to enforce allocated_amt >= spent_amt.
	spent, err := s.repo.SumSpent(ctx, existing.ID, budgetID)
	if err != nil {
		return models.BudgetEnvelope{}, fmt.Errorf("sum spent: %w", err)
	}
	if !CanDecreaseAllocatedAmt(req.AllocatedAmt, spent) {
		return models.BudgetEnvelope{}, ErrValidation
	}

	p := UpdateParams{
		ID:           id,
		BudgetID:     budgetID,
		Title:        req.Title,
		AllocatedAmt: req.AllocatedAmt,
		Description:  req.Description,
	}
	env, err := s.repo.Update(ctx, p)
	if err != nil {
		s.log.Error("repo.Update failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("update envelope: %w", err)
	}

	env.SpentAmt = spent
	env.IsOverspent = spent.Int64() > env.AllocatedAmt.Int64()

	s.log.Info("envelope replaced", zap.Int64("envelope_id", env.ID), zap.Int64("budget_id", budgetID))
	return env, nil
}

// Patch applies only the non-nil fields from req to the envelope identified by id within budgetID.
//
//nolint:revive,funlen,cyclop
func (s *Svc) Patch(ctx context.Context, id, budgetID int64, req PatchRequest) (models.BudgetEnvelope, error) {
	s.log.Debug("patching envelope",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
	)

	if _, err := s.repo.GetByID(ctx, id, budgetID); err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Patch",
				zap.Int64("envelope_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.BudgetEnvelope{}, err //nolint:wrapcheck
	}

	// If title is being changed, enforce uniqueness excluding self.
	if req.Title != nil {
		titleConflict, err := s.repo.ExistsByTitle(ctx, budgetID, *req.Title, &id)
		if err != nil {
			s.log.Error("ExistsByTitle failed during Patch",
				zap.Int64("envelope_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return models.BudgetEnvelope{}, fmt.Errorf("check envelope title: %w", err)
		}
		if titleConflict {
			return models.BudgetEnvelope{}, ErrConflict
		}
	}

	// If allocated_amt is being changed, enforce it cannot be less than spent.
	if req.AllocatedAmt != nil {
		spent, err := s.repo.SumSpent(ctx, id, budgetID)
		if err != nil {
			return models.BudgetEnvelope{}, fmt.Errorf("sum spent: %w", err)
		}
		if !CanDecreaseAllocatedAmt(*req.AllocatedAmt, spent) {
			return models.BudgetEnvelope{}, ErrValidation
		}
	}

	p := PatchParams{
		ID:           id,
		BudgetID:     budgetID,
		Title:        req.Title,
		AllocatedAmt: req.AllocatedAmt,
		Description:  req.Description,
	}
	env, err := s.repo.Patch(ctx, p)
	if err != nil {
		s.log.Error("repo.Patch failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.BudgetEnvelope{}, fmt.Errorf("patch envelope: %w", err)
	}

	updated, err := s.attachSpent(ctx, env)
	if err != nil {
		return models.BudgetEnvelope{}, err
	}

	s.log.Info("envelope patched", zap.Int64("envelope_id", env.ID), zap.Int64("budget_id", budgetID))
	return updated, nil
}

// Delete removes the envelope identified by id within budgetID.
// The operation is idempotent: attempting to delete a non-existent envelope is success.
// If the envelope has any transactions it is soft-deleted; otherwise it is hard-deleted.
// Only OWNER or ADMIN callers may delete envelopes.
//
//nolint:revive
func (s *Svc) Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	if callerRole != models.RoleOwner && callerRole != models.RoleAdmin {
		return ErrForbidden
	}

	if _, err := s.repo.GetByID(ctx, id, budgetID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil
		}
		s.log.Error("repo.GetByID failed during Delete",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("get envelope: %w", err)
	}

	hasTxns, err := s.repo.HasTransactions(ctx, id, budgetID)
	if err != nil {
		s.log.Error("HasTransactions failed during Delete",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("check envelope transactions: %w", err)
	}

	if hasTxns {
		if err := s.repo.SoftDelete(ctx, id, budgetID); err != nil {
			s.log.Error("repo.SoftDelete failed",
				zap.Int64("envelope_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return fmt.Errorf("soft delete envelope: %w", err)
		}
	} else {
		if err := s.repo.HardDelete(ctx, id, budgetID); err != nil {
			s.log.Error("repo.HardDelete failed",
				zap.Int64("envelope_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return fmt.Errorf("hard delete envelope: %w", err)
		}
	}

	s.log.Info("envelope deleted",
		zap.Int64("envelope_id", id),
		zap.Int64("budget_id", budgetID),
		zap.Bool("soft_delete", hasTxns),
	)
	return nil
}

// GetBudgetSummary returns the computed TBB and overspending summary for a budget.
func (s *Svc) GetBudgetSummary(ctx context.Context, budgetID int64) (models.BudgetSummary, error) {
	s.log.Debug("computing budget summary", zap.Int64("budget_id", budgetID))

	onBudgetBalance, err := s.repo.SumOnBudgetBalances(ctx, budgetID)
	if err != nil {
		s.log.Error("SumOnBudgetBalances failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.BudgetSummary{}, fmt.Errorf("sum on-budget balances: %w", err)
	}

	summaryRow, err := s.repo.GetBudgetSummaryRow(ctx, budgetID)
	if err != nil {
		s.log.Error("GetBudgetSummaryRow failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.BudgetSummary{}, fmt.Errorf("get budget summary row: %w", err)
	}

	totalAllocated := money.FromMinorUnits(summaryRow.TotalAllocated)
	tbb := money.FromMinorUnits(onBudgetBalance.Int64() - totalAllocated.Int64())

	return models.BudgetSummary{
		ToBeBudgeted:       tbb,
		TotalAllocated:     totalAllocated,
		TotalSpent:         money.FromMinorUnits(summaryRow.TotalSpent),
		OverspentEnvelopes: summaryRow.OverspentCount,
	}, nil
}

// attachSpent fetches the spent amount for e, sets SpentAmt and IsOverspent, and returns the updated envelope.
func (s *Svc) attachSpent(ctx context.Context, e models.BudgetEnvelope) (models.BudgetEnvelope, error) {
	spent, err := s.repo.SumSpent(ctx, e.ID, e.BudgetID)
	if err != nil {
		return models.BudgetEnvelope{}, fmt.Errorf("sum spent: %w", err)
	}
	e.SpentAmt = spent
	e.IsOverspent = spent.Int64() > e.AllocatedAmt.Int64()
	return e, nil
}
