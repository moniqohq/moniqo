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

import (
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// BudgetEnvelope is the API-facing representation of a budget envelope.
// SpentAmt and IsOverspent are computed values derived from transactions, never stored.
type BudgetEnvelope struct {
	ID           int64        `json:"id"`
	BudgetID     int64        `json:"budget_id"`
	Title        string       `json:"title"`
	AllocatedAmt money.Amount `json:"allocated_amt"`
	SpentAmt     money.Amount `json:"spent_amt"`
	IsOverspent  bool         `json:"is_overspent"`
	Description  *string      `json:"description"`
	IsArchived   bool         `json:"is_archived"`
	CreatedAt    time.Time    `json:"created_at"`
}

// BudgetSummary is the API-facing representation of a budget's computed financial summary.
type BudgetSummary struct {
	ToBeBudgeted       money.Amount `json:"to_be_budgeted"`
	TotalAllocated     money.Amount `json:"total_allocated"`
	TotalSpent         money.Amount `json:"total_spent"`
	OverspentEnvelopes int64        `json:"overspent_envelopes_count"`
}

// SparklinePoint is one month's income/expense data for sparkline charts.
type SparklinePoint struct {
	Month    string       `json:"month"`
	Income   money.Amount `json:"income"`
	Expenses money.Amount `json:"expenses"`
}

// DashboardStats is the API-facing payload for the dashboard stats cards.
type DashboardStats struct {
	NetWorth        money.Amount     `json:"net_worth"`
	MonthlyIncome   money.Amount     `json:"monthly_income"`
	MonthlyExpenses money.Amount     `json:"monthly_expenses"`
	MonthlySavings  money.Amount     `json:"monthly_savings"`
	Sparkline       []SparklinePoint `json:"sparkline"`
}
