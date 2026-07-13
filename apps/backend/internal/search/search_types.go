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

// Package search implements global search across a budget's financial entities
// (transactions, accounts, envelopes) plus the user's budgets. Financial
// entities are scoped to a single active budget; budgets are matched across all
// of the caller's memberships so the client can jump between budgets.
package search

import (
	"errors"
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// ErrValidation is returned when the search query is empty or too short.
var ErrValidation = errors.New("validation error")

const (
	// minQueryLen is the shortest query accepted; shorter queries are rejected
	// to avoid unbounded scans and near-useless result sets.
	minQueryLen = 2
	// defaultLimit is the per-group cap applied when the caller omits limit.
	defaultLimit = 5
	// maxLimit is the largest per-group cap the caller may request.
	maxLimit = 20
)

// TxnHit is a single transaction match, enriched with display-ready account and
// envelope names so the client can render it without extra lookups.
type TxnHit struct {
	ID            int64                    `json:"id"`
	AccountID     int64                    `json:"account_id"`
	AccountName   string                   `json:"account_name"`
	EnvelopeID    *int64                   `json:"budget_envelope_id"`
	EnvelopeTitle *string                  `json:"envelope_title"`
	Amount        money.Amount             `json:"amount"`
	Date          time.Time                `json:"date"`
	Status        models.TransactionStatus `json:"status"`
	Memo          *string                  `json:"memo"`
}

// AccountHit is a single account match.
type AccountHit struct {
	ID          int64              `json:"id"`
	Name        string             `json:"name"`
	Type        models.AccountType `json:"type"`
	Institution *string            `json:"institution"`
}

// EnvelopeHit is a single envelope match.
type EnvelopeHit struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
}

// BudgetHit is a single budget match, including the caller's role in it.
type BudgetHit struct {
	ID    int64       `json:"id"`
	Title string      `json:"title"`
	Role  models.Role `json:"role"`
}

// Results is the grouped payload returned by a global search. Each group is
// always a non-nil (possibly empty) slice so the JSON shape is stable.
type Results struct {
	Transactions []TxnHit      `json:"transactions"`
	Accounts     []AccountHit  `json:"accounts"`
	Envelopes    []EnvelopeHit `json:"envelopes"`
	Budgets      []BudgetHit   `json:"budgets"`
}
