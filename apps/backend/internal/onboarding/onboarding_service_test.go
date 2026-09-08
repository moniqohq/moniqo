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

package onboarding_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/onboarding"
)

const testUserID = int64(42)

func TestSvc_UpdateProfile_PersistsAndCompletesStep1(t *testing.T) {
	t.Parallel()

	repo := &internalmock.OnboardingRepository{}
	repo.On("GetOrCreate", testUserID).Return(models.OnboardingProgress{UserID: testUserID}, nil)
	repo.On("UpdateProfile", testUserID, (*string)(nil), "USD", "America/New_York").
		Return(models.User{ID: testUserID, Currency: strPtr("USD")}, nil)
	repo.On("CompleteStep", testUserID, int16(1), (*int64)(nil)).
		Return(models.OnboardingProgress{UserID: testUserID, CurrentStep: 2}, nil)

	svc := onboarding.NewSvc(repo, zap.NewNop())
	u, err := svc.UpdateProfile(context.Background(), testUserID, onboarding.ProfileRequest{
		Currency: "USD",
		Timezone: "America/New_York",
	})
	require.NoError(t, err)
	assert.Equal(t, "USD", *u.Currency)
	repo.AssertExpectations(t)
}

func TestSvc_CompleteStep_RejectsOutOfRangeStep(t *testing.T) {
	t.Parallel()

	repo := &internalmock.OnboardingRepository{}
	svc := onboarding.NewSvc(repo, zap.NewNop())

	_, err := svc.CompleteStep(context.Background(), testUserID, 0, nil)
	require.ErrorIs(t, err, onboarding.ErrInvalidStep)

	_, err = svc.CompleteStep(context.Background(), testUserID, 8, nil)
	require.ErrorIs(t, err, onboarding.ErrInvalidStep)

	repo.AssertNotCalled(t, "CompleteStep")
}

func TestSvc_CompleteStep_PropagatesBudgetID(t *testing.T) {
	t.Parallel()

	budgetID := int64(7)
	repo := &internalmock.OnboardingRepository{}
	repo.On("GetOrCreate", testUserID).Return(models.OnboardingProgress{UserID: testUserID}, nil)
	repo.On("CompleteStep", testUserID, int16(2), &budgetID).
		Return(models.OnboardingProgress{UserID: testUserID, BudgetID: &budgetID, CurrentStep: 3}, nil)

	svc := onboarding.NewSvc(repo, zap.NewNop())
	p, err := svc.CompleteStep(context.Background(), testUserID, 2, &budgetID)
	require.NoError(t, err)
	assert.Equal(t, budgetID, *p.BudgetID)
	repo.AssertExpectations(t)
}

func TestSvc_RewindStep_RejectsOutOfRangeStep(t *testing.T) {
	t.Parallel()

	repo := &internalmock.OnboardingRepository{}
	svc := onboarding.NewSvc(repo, zap.NewNop())

	_, err := svc.RewindStep(context.Background(), testUserID, 0)
	require.ErrorIs(t, err, onboarding.ErrInvalidStep)

	_, err = svc.RewindStep(context.Background(), testUserID, 8)
	require.ErrorIs(t, err, onboarding.ErrInvalidStep)

	repo.AssertNotCalled(t, "RewindStep")
}

func TestSvc_RewindStep_MovesCurrentStepBack(t *testing.T) {
	t.Parallel()

	repo := &internalmock.OnboardingRepository{}
	repo.On("GetOrCreate", testUserID).Return(models.OnboardingProgress{UserID: testUserID}, nil)
	repo.On("RewindStep", testUserID, int16(3)).
		Return(models.OnboardingProgress{UserID: testUserID, CurrentStep: 3, CompletedSteps: []int16{1, 2}}, nil)

	svc := onboarding.NewSvc(repo, zap.NewNop())
	p, err := svc.RewindStep(context.Background(), testUserID, 3)
	require.NoError(t, err)
	assert.Equal(t, int16(3), p.CurrentStep)
	assert.Equal(t, []int16{1, 2}, p.CompletedSteps)
	repo.AssertExpectations(t)
}

func TestSvc_Complete_PropagatesRepoError(t *testing.T) {
	t.Parallel()

	sentinel := errors.New("boom")
	repo := &internalmock.OnboardingRepository{}
	repo.On("Complete", testUserID).Return(sentinel)

	svc := onboarding.NewSvc(repo, zap.NewNop())
	err := svc.Complete(context.Background(), testUserID)
	require.ErrorIs(t, err, sentinel)
}

func TestSvc_SaveIncomeSources_CompletesStep3(t *testing.T) {
	t.Parallel()

	sources := []onboarding.IncomeSource{{Name: "Salary", AmountAmt: 500000, Frequency: "monthly"}}
	repo := &internalmock.OnboardingRepository{}
	repo.On("GetOrCreate", testUserID).Return(models.OnboardingProgress{UserID: testUserID}, nil)
	repo.On("SaveIncomeSources", testUserID, sources).
		Return(models.OnboardingProgress{UserID: testUserID}, nil)
	repo.On("CompleteStep", testUserID, int16(3), (*int64)(nil)).
		Return(models.OnboardingProgress{UserID: testUserID, CurrentStep: 4}, nil)

	svc := onboarding.NewSvc(repo, zap.NewNop())
	p, err := svc.SaveIncomeSources(context.Background(), testUserID, sources)
	require.NoError(t, err)
	assert.Equal(t, int16(4), p.CurrentStep)
	repo.AssertExpectations(t)
}

func strPtr(s string) *string { return &s }
