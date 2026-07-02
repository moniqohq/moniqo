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

// Package envelope implements the envelope domain: creation, retrieval, updates,
// and deletion of budget envelopes within a budget.
package envelope

import (
	"errors"
	"unicode/utf8"

	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Sentinel errors returned by the envelope repository and service layers.
var (
	// ErrNotFound is returned when an envelope does not exist or has been soft-deleted.
	ErrNotFound = errors.New("envelope not found")

	// ErrConflict is returned when an envelope title is already in use within the same budget.
	ErrConflict = errors.New("envelope title already in use")

	// ErrValidation is returned when request data fails domain-level validation.
	ErrValidation = errors.New("validation error")
)

const (
	minTitleLen = 3
	maxTitleLen = 80
)

// CreateRequest is the request payload for POST /api/v1/budgets/:budget_id/envelopes.
type CreateRequest struct {
	Title        string       `json:"title"`
	AllocatedAmt money.Amount `json:"allocated_amt"`
	Description  *string      `json:"description"`
}

// Validate checks all field-level constraints on a CreateRequest.
func (r CreateRequest) Validate() error {
	n := utf8.RuneCountInString(r.Title)
	if n < minTitleLen || n > maxTitleLen {
		return ErrValidation
	}
	if r.AllocatedAmt.Int64() < 0 {
		return ErrValidation
	}
	return nil
}

// ReplaceRequest is the request payload for PUT /api/v1/budgets/:budget_id/envelopes/:id.
// All fields are required; spent_amt must never appear here.
type ReplaceRequest struct {
	Title        string       `json:"title"`
	AllocatedAmt money.Amount `json:"allocated_amt"`
	Description  *string      `json:"description"`
}

// Validate checks all field-level constraints on a ReplaceRequest.
func (r ReplaceRequest) Validate() error {
	n := utf8.RuneCountInString(r.Title)
	if n < minTitleLen || n > maxTitleLen {
		return ErrValidation
	}
	if r.AllocatedAmt.Int64() < 0 {
		return ErrValidation
	}
	return nil
}

// PatchRequest is the request payload for PATCH /api/v1/budgets/:budget_id/envelopes/:id.
// All fields are optional; any nil field is left unchanged. spent_amt must never appear here.
type PatchRequest struct {
	Title        *string       `json:"title"`
	AllocatedAmt *money.Amount `json:"allocated_amt"`
	Description  *string       `json:"description"`
}

// Validate checks constraints on a PatchRequest. Rejects empty bodies.
//
//nolint:revive
func (r PatchRequest) Validate() error {
	if r.Title == nil && r.AllocatedAmt == nil && r.Description == nil {
		return ErrValidation
	}
	if r.Title != nil {
		n := utf8.RuneCountInString(*r.Title)
		if n < minTitleLen || n > maxTitleLen {
			return ErrValidation
		}
	}
	if r.AllocatedAmt != nil && r.AllocatedAmt.Int64() < 0 {
		return ErrValidation
	}
	return nil
}

// CreateParams carries the repository-layer arguments for inserting a new envelope.
type CreateParams struct {
	BudgetID     int64
	Title        string
	AllocatedAmt money.Amount
	Description  *string
}

// UpdateParams carries the repository-layer arguments for a full envelope update (PUT).
type UpdateParams struct {
	ID           int64
	BudgetID     int64
	Title        string
	AllocatedAmt money.Amount
	Description  *string
}

// PatchParams carries the repository-layer arguments for a partial envelope update (PATCH).
// Nil fields are not written to the database.
type PatchParams struct {
	ID           int64
	BudgetID     int64
	Title        *string
	AllocatedAmt *money.Amount
	Description  *string
}

// CanDecreaseAllocatedAmt reports whether a reduction in allocated_amt is safe.
// Returns false when the new amount would fall below what has already been spent.
func CanDecreaseAllocatedAmt(newAmt, spent money.Amount) bool {
	return newAmt.Int64() >= spent.Int64()
}
