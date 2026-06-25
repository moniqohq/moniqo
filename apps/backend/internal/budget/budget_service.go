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

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repository is the persistence contract required by Svc.
type Repository interface {
	CreateWithOwner(ctx context.Context, p CreateParams, ownerUserID int64) (models.Budget, error)
	GetByID(ctx context.Context, id int64) (models.Budget, error)
	ListForUser(ctx context.Context, userID int64) ([]models.Budget, error)
	Update(ctx context.Context, p UpdateParams) (models.Budget, error)
	Patch(ctx context.Context, p PatchParams) (models.Budget, error)
	SoftDeleteCascade(ctx context.Context, budgetID int64) error
	TitleExistsForUser(ctx context.Context, userID int64, title string, excludeBudgetID int64) (bool, error)
}

// Svc implements business logic for budget operations.
type Svc struct {
	repo Repository
	log  *zap.Logger
}

// NewSvc returns a Svc wired to the given repository.
func NewSvc(repo Repository, log *zap.Logger) *Svc {
	return &Svc{repo: repo, log: log}
}

// Create enforces per-owner title uniqueness and atomically creates the budget
// + an OWNER membership for creatorID. Input is assumed pre-validated.
func (s *Svc) Create(ctx context.Context, creatorID int64, req CreateRequest) (models.Budget, error) {
	s.log.Info("creating budget", zap.Int64("creator_id", creatorID), zap.String("title", req.Title))

	exists, err := s.repo.TitleExistsForUser(ctx, creatorID, req.Title, 0)
	if err != nil {
		return models.Budget{}, fmt.Errorf("title uniqueness check: %w", err)
	}
	if exists {
		return models.Budget{}, ErrBudgetAlreadyExists
	}

	b, err := s.repo.CreateWithOwner(ctx, CreateParams{Title: req.Title, Notes: req.Notes}, creatorID)
	if err != nil {
		s.log.Error("failed to create budget", zap.Int64("creator_id", creatorID), zap.Error(err))
		return models.Budget{}, fmt.Errorf("create budget: %w", err)
	}

	s.log.Info("budget created", zap.Int64("budget_id", b.ID))
	return b, nil
}

// List returns all active budgets the user is a member of. Returns an empty
// slice (never an error) when the user has no budgets.
func (s *Svc) List(ctx context.Context, userID int64) ([]models.Budget, error) {
	s.log.Debug("listing budgets for user", zap.Int64("user_id", userID))
	budgets, err := s.repo.ListForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list budgets: %w", err)
	}
	if budgets == nil {
		budgets = []models.Budget{}
	}
	return budgets, nil
}

// GetByID returns the budget with the given id.
func (s *Svc) GetByID(ctx context.Context, budgetID int64) (models.Budget, error) {
	s.log.Debug("fetching budget", zap.Int64("budget_id", budgetID))
	b, err := s.repo.GetByID(ctx, budgetID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return models.Budget{}, ErrNotFound
		}
		return models.Budget{}, fmt.Errorf("get budget: %w", err)
	}
	return b, nil
}

// Replace performs a full update (PUT). Input is assumed pre-validated.
// Enforces per-owner title uniqueness, excluding the current budget.
func (s *Svc) Replace(ctx context.Context, ownerID, budgetID int64, req ReplaceRequest) (models.Budget, error) {
	s.log.Info("replacing budget", zap.Int64("budget_id", budgetID))

	exists, err := s.repo.TitleExistsForUser(ctx, ownerID, req.Title, budgetID)
	if err != nil {
		return models.Budget{}, fmt.Errorf("title uniqueness check: %w", err)
	}
	if exists {
		return models.Budget{}, ErrConflict
	}

	b, err := s.repo.Update(ctx, UpdateParams{ID: budgetID, Title: req.Title, Notes: req.Notes})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return models.Budget{}, ErrNotFound
		}
		return models.Budget{}, fmt.Errorf("replace budget: %w", err)
	}
	return b, nil
}

// Patch applies only the provided fields (PATCH). Input is assumed pre-validated.
// Enforces title uniqueness when title is being changed.
func (s *Svc) Patch(ctx context.Context, ownerID, budgetID int64, req PatchRequest) (models.Budget, error) {
	s.log.Info("patching budget", zap.Int64("budget_id", budgetID))

	if err := s.checkTitleConflict(ctx, ownerID, budgetID, req.Title); err != nil {
		return models.Budget{}, err
	}

	b, err := s.repo.Patch(ctx, PatchParams{ID: budgetID, Title: req.Title, Notes: req.Notes})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return models.Budget{}, ErrNotFound
		}
		return models.Budget{}, fmt.Errorf("patch budget: %w", err)
	}
	return b, nil
}

// SoftDelete soft-deletes the budget and its memberships. Idempotent — deleting
// an already-deleted budget returns success.
func (s *Svc) SoftDelete(ctx context.Context, budgetID int64) error {
	s.log.Info("soft-deleting budget", zap.Int64("budget_id", budgetID))
	if err := s.repo.SoftDeleteCascade(ctx, budgetID); err != nil {
		return fmt.Errorf("soft delete budget: %w", err)
	}
	return nil
}

func (s *Svc) checkTitleConflict(ctx context.Context, ownerID, excludeID int64, title *string) error {
	if title == nil {
		return nil
	}
	exists, err := s.repo.TitleExistsForUser(ctx, ownerID, *title, excludeID)
	if err != nil {
		return fmt.Errorf("title uniqueness check: %w", err)
	}
	if exists {
		return ErrConflict
	}
	return nil
}
