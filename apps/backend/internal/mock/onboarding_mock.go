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

package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/onboarding"
)

// -----------------------------------------------------------------------------
// Service mock (function-field style, for handler tests)
// -----------------------------------------------------------------------------

// OnboardingService is a test double for the onboarding.Service interface.
type OnboardingService struct {
	GetProgressFn       func(ctx context.Context, userID int64) (models.OnboardingProgress, error)
	UpdateProfileFn     func(ctx context.Context, userID int64, req onboarding.ProfileRequest) (models.User, error)
	SaveIncomeSourcesFn func(ctx context.Context, userID int64, sources []onboarding.IncomeSource) (models.OnboardingProgress, error)
	CompleteStepFn      func(ctx context.Context, userID int64, step int16, budgetID *int64) (models.OnboardingProgress, error)
	CompleteFn          func(ctx context.Context, userID int64) error
}

// GetProgress delegates to the GetProgressFn stub.
func (m *OnboardingService) GetProgress(ctx context.Context, userID int64) (models.OnboardingProgress, error) {
	return m.GetProgressFn(ctx, userID)
}

// UpdateProfile delegates to the UpdateProfileFn stub.
func (m *OnboardingService) UpdateProfile(
	ctx context.Context, userID int64, req onboarding.ProfileRequest,
) (models.User, error) {
	return m.UpdateProfileFn(ctx, userID, req)
}

// SaveIncomeSources delegates to the SaveIncomeSourcesFn stub.
func (m *OnboardingService) SaveIncomeSources(
	ctx context.Context, userID int64, sources []onboarding.IncomeSource,
) (models.OnboardingProgress, error) {
	return m.SaveIncomeSourcesFn(ctx, userID, sources)
}

// CompleteStep delegates to the CompleteStepFn stub.
func (m *OnboardingService) CompleteStep(
	ctx context.Context, userID int64, step int16, budgetID *int64,
) (models.OnboardingProgress, error) {
	return m.CompleteStepFn(ctx, userID, step, budgetID)
}

// Complete delegates to the CompleteFn stub.
func (m *OnboardingService) Complete(ctx context.Context, userID int64) error {
	return m.CompleteFn(ctx, userID)
}

// -----------------------------------------------------------------------------
// Repository mock (testify mock style, for service tests)
// -----------------------------------------------------------------------------

// OnboardingRepository is a testify mock for onboarding.Repository.
type OnboardingRepository struct {
	mock.Mock
}

// GetOrCreate records the call and returns the configured stub values.
func (m *OnboardingRepository) GetOrCreate(_ context.Context, userID int64) (models.OnboardingProgress, error) {
	args := m.Called(userID)
	p, ok := args.Get(0).(models.OnboardingProgress)
	if !ok {
		return models.OnboardingProgress{}, args.Error(1)
	}
	return p, args.Error(1)
}

// CompleteStep records the call and returns the configured stub values.
func (m *OnboardingRepository) CompleteStep(
	_ context.Context, userID int64, step int16, budgetID *int64,
) (models.OnboardingProgress, error) {
	args := m.Called(userID, step, budgetID)
	p, ok := args.Get(0).(models.OnboardingProgress)
	if !ok {
		return models.OnboardingProgress{}, args.Error(1)
	}
	return p, args.Error(1)
}

// SaveIncomeSources records the call and returns the configured stub values.
func (m *OnboardingRepository) SaveIncomeSources(
	_ context.Context, userID int64, sources []onboarding.IncomeSource,
) (models.OnboardingProgress, error) {
	args := m.Called(userID, sources)
	p, ok := args.Get(0).(models.OnboardingProgress)
	if !ok {
		return models.OnboardingProgress{}, args.Error(1)
	}
	return p, args.Error(1)
}

// Complete records the call and returns the configured stub error.
func (m *OnboardingRepository) Complete(_ context.Context, userID int64) error {
	args := m.Called(userID)
	return args.Error(0)
}

// UpdateProfile records the call and returns the configured stub values.
func (m *OnboardingRepository) UpdateProfile(
	_ context.Context, userID int64, name *string, currency, timezone string,
) (models.User, error) {
	args := m.Called(userID, name, currency, timezone)
	u, ok := args.Get(0).(models.User)
	if !ok {
		return models.User{}, args.Error(1)
	}
	return u, args.Error(1)
}
