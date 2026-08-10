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

package onboarding

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// stepProfile and stepIncome identify the two wizard steps the onboarding
// service marks complete on its own initiative (the rest are marked via
// the generic CompleteStep endpoint, driven by the frontend).
const (
	stepProfile int16 = 1
	stepIncome  int16 = 3
)

// Service is the business-logic contract for the onboarding wizard.
type Service interface {
	GetProgress(ctx context.Context, userID int64) (models.OnboardingProgress, error)
	UpdateProfile(ctx context.Context, userID int64, req ProfileRequest) (models.User, error)
	SaveIncomeSources(ctx context.Context, userID int64, sources []IncomeSource) (models.OnboardingProgress, error)
	CompleteStep(ctx context.Context, userID int64, step int16, budgetID *int64) (models.OnboardingProgress, error)
	Complete(ctx context.Context, userID int64) error
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

// GetProgress returns (creating if necessary) the caller's onboarding progress.
func (s *Svc) GetProgress(ctx context.Context, userID int64) (models.OnboardingProgress, error) {
	p, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("get or create onboarding progress: %w", err)
	}
	return p, nil
}

// UpdateProfile persists step 1's currency/timezone/name onto the user and
// marks step 1 complete. Callers aren't required to have called GetProgress
// first — ensure the progress row exists before mutating it.
func (s *Svc) UpdateProfile(ctx context.Context, userID int64, req ProfileRequest) (models.User, error) {
	if _, err := s.repo.GetOrCreate(ctx, userID); err != nil {
		return models.User{}, fmt.Errorf("get or create onboarding progress: %w", err)
	}
	u, err := s.repo.UpdateProfile(ctx, userID, req.Name, req.Currency, req.Timezone)
	if err != nil {
		return models.User{}, fmt.Errorf("update onboarding profile: %w", err)
	}
	if _, err := s.repo.CompleteStep(ctx, userID, stepProfile, nil); err != nil {
		s.log.Error("failed to mark onboarding step 1 complete", zap.Int64("user_id", userID), zap.Error(err))
		return models.User{}, fmt.Errorf("complete onboarding step 1: %w", err)
	}
	return u, nil
}

// SaveIncomeSources replaces the draft income-sources list and marks step 3
// complete. Ensures the progress row exists first, same as UpdateProfile.
func (s *Svc) SaveIncomeSources(ctx context.Context, userID int64, sources []IncomeSource) (models.OnboardingProgress, error) {
	if _, err := s.repo.GetOrCreate(ctx, userID); err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("get or create onboarding progress: %w", err)
	}
	if _, err := s.repo.SaveIncomeSources(ctx, userID, sources); err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("save income sources: %w", err)
	}
	p, err := s.repo.CompleteStep(ctx, userID, stepIncome, nil)
	if err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("complete onboarding step %d: %w", stepIncome, err)
	}
	return p, nil
}

// CompleteStep marks the given step complete, rejecting steps outside the
// valid range. budgetID is only meaningful for step 2 and is ignored otherwise.
// Ensures the progress row exists first, same as UpdateProfile.
func (s *Svc) CompleteStep(ctx context.Context, userID int64, step int16, budgetID *int64) (models.OnboardingProgress, error) {
	if step < MinStep || step > MaxStep {
		return models.OnboardingProgress{}, ErrInvalidStep
	}
	if _, err := s.repo.GetOrCreate(ctx, userID); err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("get or create onboarding progress: %w", err)
	}
	p, err := s.repo.CompleteStep(ctx, userID, step, budgetID)
	if err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("complete onboarding step %d: %w", step, err)
	}
	return p, nil
}

// Complete marks the whole wizard finished.
func (s *Svc) Complete(ctx context.Context, userID int64) error {
	if err := s.repo.Complete(ctx, userID); err != nil {
		return fmt.Errorf("complete onboarding: %w", err)
	}
	return nil
}
