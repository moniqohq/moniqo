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

// Package onboarding implements the first-time setup wizard: progress
// tracking/resumability, step 1's profile (currency/timezone), and step 3's
// draft income sources. Steps 2, 4, 5, and 6 call the budget/account/envelope
// domains directly from the frontend and only report completion here.
package onboarding

import (
	"errors"
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// -----------------------------------------------------------------------------
// Handler layer
// -----------------------------------------------------------------------------

// MinStep and MaxStep bound the wizard's step numbers. Step 7 is the
// confirmation screen; there is no separate "invite collaborators" step in v1.
const (
	MinStep = 1
	MaxStep = 7
)

// ProfileRequest is the HTTP request body for PATCH /api/v1/onboarding/profile.
type ProfileRequest struct {
	Name     *string `json:"name"`
	Currency string  `json:"currency"`
	Timezone string  `json:"timezone"`
}

// IncomeSource is a single draft income row captured at step 3. It is never
// persisted outside onboarding_progress.draft_payload and is discarded once
// the wizard completes.
type IncomeSource = models.OnboardingIncomeSource

// IncomeSourcesRequest is the HTTP request body for
// PUT /api/v1/onboarding/income-sources.
type IncomeSourcesRequest struct {
	Sources []IncomeSource `json:"sources"`
}

// CompleteStepRequest is the HTTP request body for
// POST /api/v1/onboarding/steps/{step}/complete.
type CompleteStepRequest struct {
	BudgetID *int64 `json:"budget_id"`
}

// Progress is the API-facing representation of a user's onboarding state.
type Progress struct {
	CurrentStep    int16          `json:"current_step"`
	CompletedSteps []int16        `json:"completed_steps"`
	BudgetID       *int64         `json:"budget_id"`
	IncomeSources  []IncomeSource `json:"income_sources"`
	Status         string         `json:"status"`
	StartedAt      time.Time      `json:"started_at"`
	CompletedAt    *time.Time     `json:"completed_at"`
}

// -----------------------------------------------------------------------------
// Service / repository layer
// -----------------------------------------------------------------------------

// ErrInvalidStep is returned when a step number is outside [MinStep, MaxStep].
var ErrInvalidStep = errors.New("invalid onboarding step")

// ErrNotFound is returned when no progress row exists for the user (should
// only happen transiently, since GetOrCreate always creates one on first read).
var ErrNotFound = errors.New("onboarding progress not found")
