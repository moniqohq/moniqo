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

package validator

import (
	"unicode/utf8"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

const (
	minBudgetTitleLen = 3
	maxBudgetTitleLen = 100
	maxBudgetNotesLen = 500
)

func validateBudgetTitle(title string) *httpx.FieldError {
	n := utf8.RuneCountInString(title)
	if n < minBudgetTitleLen || n > maxBudgetTitleLen {
		return &httpx.FieldError{Field: "title", Error: "must be between 3 and 100 characters"}
	}
	return nil
}

func validateBudgetNotes(notes *string) *httpx.FieldError {
	if notes == nil {
		return nil
	}
	if utf8.RuneCountInString(*notes) > maxBudgetNotesLen {
		return &httpx.FieldError{Field: "notes", Error: "must not exceed 500 characters"}
	}
	return nil
}

// CreateBudgetInput holds the fields validated for budget creation.
type CreateBudgetInput struct {
	Title string
	Notes *string
}

// ValidateCreateBudget validates a create-budget request.
func ValidateCreateBudget(in CreateBudgetInput) []httpx.FieldError {
	var errs []httpx.FieldError
	if fe := validateBudgetTitle(in.Title); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateBudgetNotes(in.Notes); fe != nil {
		errs = append(errs, *fe)
	}
	return errs
}

// ReplaceBudgetInput holds the fields validated for a full budget update (PUT).
type ReplaceBudgetInput = CreateBudgetInput

// ValidateReplaceBudget validates a replace-budget request.
func ValidateReplaceBudget(in ReplaceBudgetInput) []httpx.FieldError {
	return ValidateCreateBudget(in)
}

// PatchBudgetInput holds the optional fields validated for a partial update (PATCH).
type PatchBudgetInput struct {
	Title *string
	Notes *string
}

// ValidatePatchBudget validates a patch-budget request.
// Returns an error if the body is empty (no fields provided).
func ValidatePatchBudget(in PatchBudgetInput) []httpx.FieldError {
	if in.Title == nil && in.Notes == nil {
		return []httpx.FieldError{{Field: "body", Error: "request body must contain at least one field"}}
	}
	var errs []httpx.FieldError
	if in.Title != nil {
		if fe := validateBudgetTitle(*in.Title); fe != nil {
			errs = append(errs, *fe)
		}
	}
	if fe := validateBudgetNotes(in.Notes); fe != nil {
		errs = append(errs, *fe)
	}
	return errs
}
