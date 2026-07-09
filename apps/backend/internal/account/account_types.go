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

// Package account implements the account domain: creation, retrieval, updates,
// and soft-deletion of financial accounts within a budget.
package account

import (
	"errors"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Sentinel errors returned by the account repository and service layers.
var (
	// ErrNotFound is returned when an account does not exist or has been soft-deleted.
	ErrNotFound = errors.New("account not found")

	// ErrConflict is returned when an account name is already in use within the same budget.
	ErrConflict = errors.New("account name already in use")

	// ErrValidation is returned when request data fails domain-level validation.
	ErrValidation = errors.New("validation error")

	// ErrBalanceImmutable is returned when a caller attempts to set a balance directly;
	// balances are derived from transactions and are never stored on the account row.
	ErrBalanceImmutable = errors.New("balance cannot be modified directly")

	// ErrArchiveNonZeroBalance is returned when archiving is attempted on an
	// account whose balance is not zero.
	ErrArchiveNonZeroBalance = errors.New("account balance must be zero before archiving")
)

// CreateRequest is the request payload for POST /api/v1/budgets/:budget_id/accounts.
type CreateRequest struct {
	Name           string             `json:"name"`
	Type           models.AccountType `json:"type"`
	RequiresRecon  bool               `json:"requires_recon"`
	IsOnBudget     *bool              `json:"is_on_budget"` // nil uses the type default
	IsImmutable    bool               `json:"is_immutable"`
	Notes          *string            `json:"notes"`
	AccountNumber  *string            `json:"account_number"`
	Institution    *string            `json:"institution"`
	InitialBalance money.Amount       `json:"initial_balance"`
}

// ReplaceRequest is the request payload for PUT /api/v1/budgets/:budget_id/accounts/:id.
// A full replacement of all mutable fields; balance is not included.
type ReplaceRequest struct {
	Name          string             `json:"name"`
	Type          models.AccountType `json:"type"`
	RequiresRecon bool               `json:"requires_recon"`
	IsOnBudget    *bool              `json:"is_on_budget"`
	IsImmutable   bool               `json:"is_immutable"`
	Notes         *string            `json:"notes"`
	AccountNumber *string            `json:"account_number"`
	Institution   *string            `json:"institution"`
}

// PatchRequest is the request payload for PATCH /api/v1/budgets/:budget_id/accounts/:id.
// All fields are optional; any nil field is left unchanged. Balance must never appear here.
type PatchRequest struct {
	Name          *string             `json:"name"`
	Type          *models.AccountType `json:"type"`
	RequiresRecon *bool               `json:"requires_recon"`
	IsOnBudget    *bool               `json:"is_on_budget"`
	IsImmutable   *bool               `json:"is_immutable"`
	Notes         *string             `json:"notes"`
	AccountNumber *string             `json:"account_number"`
	Institution   *string             `json:"institution"`
	Archived      *bool               `json:"archived"`
}

// CreateParams carries the repository-layer arguments for inserting a new account.
// The initial balance is handled separately via a transaction record.
type CreateParams struct {
	BudgetID      int64
	Name          string
	Type          models.AccountType
	RequiresRecon bool
	IsOnBudget    bool
	IsImmutable   bool
	Notes         *string
	AccountNumber *string
	Institution   *string
}

// UpdateParams carries the repository-layer arguments for a full account update (PUT).
type UpdateParams struct {
	ID            int64
	BudgetID      int64
	Name          string
	Type          models.AccountType
	RequiresRecon bool
	IsOnBudget    bool
	IsImmutable   bool
	Notes         *string
	AccountNumber *string
	Institution   *string
}

// PatchParams carries the repository-layer arguments for a partial account update (PATCH).
// Nil fields are not written to the database.
type PatchParams struct {
	ID            int64
	BudgetID      int64
	Name          *string
	Type          *models.AccountType
	RequiresRecon *bool
	IsOnBudget    *bool
	IsImmutable   *bool
	Notes         *string
	AccountNumber *string
	Institution   *string
}
