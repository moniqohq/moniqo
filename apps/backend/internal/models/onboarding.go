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

package models

import "time"

// OnboardingProgress is the internal representation of a user's first-time
// setup wizard progress. IncomeSources is decoded from draft_payload and
// exists only for the lifetime of the wizard; it is not a durable feature.
type OnboardingProgress struct {
	UserID         int64
	CurrentStep    int16
	CompletedSteps []int16
	BudgetID       *int64
	IncomeSources  []OnboardingIncomeSource
	Status         string
	StartedAt      time.Time
	CompletedAt    *time.Time
}

// OnboardingIncomeSource is a single draft income row captured at wizard step 3.
type OnboardingIncomeSource struct {
	Name      string `json:"name"`
	AmountAmt int64  `json:"amount_amt"`
	Frequency string `json:"frequency"`
}
