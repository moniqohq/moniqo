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

// Package transaction implements the transaction domain: creation, retrieval, updates,
// and soft-deletion of ledger entries within a budget.
package transaction

import (
	"errors"
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Sentinel errors returned by the transaction repository and service layers.
var (
	// ErrNotFound is returned when a transaction does not exist or has been soft-deleted.
	ErrNotFound = errors.New("transaction not found")

	// ErrConflict is returned when a business rule is violated (e.g. transfer with envelope).
	ErrConflict = errors.New("transaction business rule violation")

	// ErrValidation is returned when request data fails domain-level validation.
	ErrValidation = errors.New("validation error")
)

// CreateRequest is the request payload for POST /api/v1/budgets/:budget_id/transactions.
type CreateRequest struct {
	AccountID         int64        `json:"account_id"`
	TransferAccountID *int64       `json:"transfer_account_id"`
	EnvelopeID        *int64       `json:"budget_envelope_id"`
	Amount            money.Amount `json:"amount"`
	Date              time.Time    `json:"date"`
	Memo              *string      `json:"memo"`
}

// ReplaceRequest is the request payload for PUT /api/v1/budgets/:budget_id/transactions/:id.
type ReplaceRequest struct {
	AccountID         int64        `json:"account_id"`
	TransferAccountID *int64       `json:"transfer_account_id"`
	EnvelopeID        *int64       `json:"budget_envelope_id"`
	Amount            money.Amount `json:"amount"`
	Date              time.Time    `json:"date"`
	Memo              *string      `json:"memo"`
}

// PatchRequest is the request payload for PATCH /api/v1/budgets/:budget_id/transactions/:id.
// All fields are optional; any nil field is left unchanged.
type PatchRequest struct {
	AccountID         *int64        `json:"account_id"`
	TransferAccountID *int64        `json:"transfer_account_id"`
	EnvelopeID        *int64        `json:"budget_envelope_id"`
	Amount            *money.Amount `json:"amount"`
	Date              *time.Time    `json:"date"`
	Memo              *string       `json:"memo"`
}

// ListFilters carries optional filter/pagination parameters for ListTransactions.
type ListFilters struct {
	AccountID  *int64
	EnvelopeID *int64
	DateFrom   *time.Time
	DateTo     *time.Time
	Page       int
	PageSize   int
}

// CreateParams carries repository-layer arguments for inserting a new transaction.
type CreateParams struct {
	BudgetID          int64
	AccountID         int64
	TransferAccountID *int64
	TransferGroupID   *string
	EnvelopeID        *int64
	Amount            money.Amount
	Date              time.Time
	Memo              *string
}

// UpdateParams carries repository-layer arguments for a full transaction update (PUT).
type UpdateParams struct {
	ID                int64
	BudgetID          int64
	AccountID         int64
	TransferAccountID *int64
	EnvelopeID        *int64
	Amount            money.Amount
	Date              time.Time
	Memo              *string
}

// PatchParams carries repository-layer arguments for a partial transaction update (PATCH).
type PatchParams struct {
	ID                int64
	BudgetID          int64
	AccountID         *int64
	TransferAccountID *int64
	EnvelopeID        *int64
	Amount            *money.Amount
	Date              *time.Time
	Memo              *string
}
