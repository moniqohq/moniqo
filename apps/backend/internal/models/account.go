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

// AccountType is the classification of a financial account.
type AccountType string

// AccountType constants for all supported financial account classifications.
const (
	AccountTypeChecking   AccountType = "CHECKING"
	AccountTypeSavings    AccountType = "SAVINGS"
	AccountTypeCreditCard AccountType = "CREDIT_CARD"
	AccountTypeCash       AccountType = "CASH"
	AccountTypeLoan       AccountType = "LOAN"
)

// IsValid reports whether t is a recognized AccountType.
func (t AccountType) IsValid() bool {
	switch t {
	case AccountTypeChecking, AccountTypeSavings, AccountTypeCreditCard, AccountTypeCash, AccountTypeLoan:
		return true
	default:
		return false
	}
}

// IsCreditCard reports whether t is CREDIT_CARD.
func (t AccountType) IsCreditCard() bool {
	return t == AccountTypeCreditCard
}

// IsLiability reports whether t is a liability type (CREDIT_CARD or LOAN).
func (t AccountType) IsLiability() bool {
	return t == AccountTypeCreditCard || t == AccountTypeLoan
}

// Account is the API-facing representation of a financial account.
// Balance is a computed value derived from transactions, never stored directly.
type Account struct {
	ID            int64        `json:"id"`
	BudgetID      int64        `json:"budget_id"`
	Name          string       `json:"name"`
	Type          AccountType  `json:"type"`
	Balance       money.Amount `json:"balance"`
	RequiresRecon bool         `json:"requires_recon"`
	IsOnBudget    bool         `json:"is_on_budget"`
	Notes         *string      `json:"notes"`
	CreatedAt     time.Time    `json:"created_at"`
}
