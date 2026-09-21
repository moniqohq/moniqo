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
	"fmt"

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

// Nature classifies an envelope's spending category on a want/should/need/must
// scale. It is set once at creation and is immutable thereafter — PUT and PATCH
// must never accept it.
type Nature string

// Valid Nature values.
const (
	NatureWant   Nature = "want"
	NatureShould Nature = "should"
	NatureNeed   Nature = "need"
	NatureMust   Nature = "must"
)

// validNature reports whether n is one of the known Nature values.
func validNature(n string) bool {
	switch Nature(n) {
	case NatureWant, NatureShould, NatureNeed, NatureMust:
		return true
	default:
		return false
	}
}

// CreateRequest is the request payload for POST /api/v1/budgets/:budget_id/envelopes.
type CreateRequest struct {
	Title        string       `json:"title"`
	AllocatedAmt money.Amount `json:"allocated_amt"`
	Description  *string      `json:"description"`
	Nature       *string      `json:"nature"`
}

// ReplaceRequest is the request payload for PUT /api/v1/budgets/:budget_id/envelopes/:id.
// All fields are required; spent_amt must never appear here.
type ReplaceRequest struct {
	Title        string       `json:"title"`
	AllocatedAmt money.Amount `json:"allocated_amt"`
	Description  *string      `json:"description"`
}

// PatchRequest is the request payload for PATCH /api/v1/budgets/:budget_id/envelopes/:id.
// All fields are optional; any nil field is left unchanged. spent_amt must never appear here.
type PatchRequest struct {
	Title        *string       `json:"title"`
	AllocatedAmt *money.Amount `json:"allocated_amt"`
	Description  *string       `json:"description"`
}

// AllocatedBelowSpentError is returned when a caller attempts to reduce an envelope's
// allocated_amt below the amount already spent from it. It carries both values so the
// HTTP layer can report a descriptive, specific error message.
//
// Is implements errors.Is compatibility with the ErrValidation sentinel so existing
// callers using errors.Is(err, ErrValidation) keep working unchanged.
type AllocatedBelowSpentError struct {
	Allocated money.Amount
	Spent     money.Amount
}

// Error implements the error interface. The message deliberately omits the field
// name (the HTTP layer already attaches this to the allocated_amt field) so it
// reads naturally either standalone or prefixed with "allocated_amt".
func (e *AllocatedBelowSpentError) Error() string {
	return fmt.Sprintf(
		"cannot be less than the %s already spent (got %s)",
		formatAmount(e.Spent), formatAmount(e.Allocated),
	)
}

// Is reports whether target is the ErrValidation sentinel, preserving compatibility
// with existing errors.Is(err, ErrValidation) checks.
func (*AllocatedBelowSpentError) Is(target error) bool {
	return target == ErrValidation
}

// formatAmount renders a money.Amount as a plain "1234.56"-style decimal string
// for use in human-readable error messages.
func formatAmount(a money.Amount) string {
	b, _ := a.MarshalJSON() //nolint:errcheck // MarshalJSON never errors for money.Amount
	return string(b)
}

// CreateParams carries the repository-layer arguments for inserting a new envelope.
type CreateParams struct {
	BudgetID     int64
	Title        string
	AllocatedAmt money.Amount
	Description  *string
	Nature       *string
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
// spent must be a positive magnitude (see Repository.SumSpent) — outflows are
// stored as negative transaction amounts, so this is not the raw signed sum.
func CanDecreaseAllocatedAmt(newAmt, spent money.Amount) bool {
	return newAmt.Int64() >= spent.Int64()
}

// ReallocateRequest is the request payload for
// POST /api/v1/budgets/:budget_id/envelopes/reallocate.
// A nil FromEnvelopeID means the source is "To Be Budgeted"; a nil
// ToEnvelopeID means the destination is "To Be Budgeted". Exactly one of the
// two may be nil, not both.
type ReallocateRequest struct {
	FromEnvelopeID *int64       `json:"from_envelope_id"`
	ToEnvelopeID   *int64       `json:"to_envelope_id"`
	Amount         money.Amount `json:"amount"`
}

// Validate checks all field-level constraints on a ReallocateRequest.
func (r ReallocateRequest) Validate() error {
	if r.Amount.Int64() <= 0 {
		return ErrValidation
	}
	if r.FromEnvelopeID == nil && r.ToEnvelopeID == nil {
		return ErrValidation
	}
	if r.FromEnvelopeID != nil && r.ToEnvelopeID != nil && *r.FromEnvelopeID == *r.ToEnvelopeID {
		return ErrValidation
	}
	return nil
}
