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

	"github.com/moniqohq/moniqo/apps/backend/internal/account"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

const (
	maxAccountNameLen = 255
	fieldAccountName  = "name"
	fieldAccountType  = "type"
	fieldIsOnBudget   = "is_on_budget"
	fieldAccountBody  = "body"
)

// validateAccountName checks that name is non-empty and within the length limit.
func validateAccountName(name string) *httpx.FieldError {
	n := utf8.RuneCountInString(name)
	if n == 0 {
		return &httpx.FieldError{Field: fieldAccountName, Error: "must not be empty"}
	}
	if n > maxAccountNameLen {
		return &httpx.FieldError{Field: fieldAccountName, Error: "must not exceed 255 characters"}
	}
	return nil
}

// validateAccountType checks that the type string is a recognized AccountType.
func validateAccountType(t models.AccountType) *httpx.FieldError {
	if !t.IsValid() {
		return &httpx.FieldError{Field: fieldAccountType, Error: "must be one of CHECKING, SAVINGS, CREDIT_CARD, CASH, LOAN"}
	}
	return nil
}

// validateInitialBalance checks that the initial balance is non-negative.
func validateInitialBalance(bal money.Amount) *httpx.FieldError {
	if bal.Int64() < 0 {
		return &httpx.FieldError{Field: "initial_balance", Error: "must be non-negative"}
	}
	return nil
}

// validateIsOnBudgetForType returns a field error when the caller explicitly sets
// is_on_budget=true for a liability account type (CREDIT_CARD or LOAN).
// The type-default rule (liability → is_on_budget=false) is applied in the service layer.
func validateIsOnBudgetForType(isOnBudget *bool, t models.AccountType) *httpx.FieldError {
	if isOnBudget != nil && *isOnBudget && t.IsLiability() {
		return &httpx.FieldError{Field: fieldIsOnBudget, Error: "must be false for CREDIT_CARD and LOAN account types"}
	}
	return nil
}

// ValidateCreateAccount validates the payload for creating a new account.
//
// Rules:
//   - name: non-empty, ≤ 255 characters
//   - type: must be a recognized AccountType
//   - initial_balance: must be ≥ 0
//   - is_on_budget must not be true for CREDIT_CARD or LOAN
func ValidateCreateAccount(in account.CreateRequest) []httpx.FieldError {
	var errs []httpx.FieldError

	if fe := validateAccountName(in.Name); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateAccountType(in.Type); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateInitialBalance(in.InitialBalance); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateIsOnBudgetForType(in.IsOnBudget, in.Type); fe != nil {
		errs = append(errs, *fe)
	}

	return errs
}

// ValidateReplaceAccount validates the payload for a full account update (PUT).
// Rules are the same as create, except there is no initial_balance field.
func ValidateReplaceAccount(in account.ReplaceRequest) []httpx.FieldError {
	var errs []httpx.FieldError

	if fe := validateAccountName(in.Name); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateAccountType(in.Type); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateIsOnBudgetForType(in.IsOnBudget, in.Type); fe != nil {
		errs = append(errs, *fe)
	}

	return errs
}

// ValidatePatchAccount validates the payload for a partial account update (PATCH).
//
// Rules:
//   - at least one field must be non-nil
//   - if name is present: non-empty, ≤ 255 characters
//   - if type is present: must be a recognized AccountType
//   - is_on_budget must not be true for CREDIT_CARD or LOAN (when type is provided or implied)
//
//nolint:revive
func ValidatePatchAccount(in account.PatchRequest) []httpx.FieldError {
	if in.Name == nil && in.Type == nil && in.RequiresRecon == nil && in.IsOnBudget == nil && in.Notes == nil {
		return []httpx.FieldError{{Field: fieldAccountBody, Error: errEmptyBody}}
	}

	var errs []httpx.FieldError

	if in.Name != nil {
		if fe := validateAccountName(*in.Name); fe != nil {
			errs = append(errs, *fe)
		}
	}

	if in.Type != nil {
		if fe := validateAccountType(*in.Type); fe != nil {
			errs = append(errs, *fe)
		} else if fe := validateIsOnBudgetForType(in.IsOnBudget, *in.Type); fe != nil {
			errs = append(errs, *fe)
		}
	}
	// When type is absent in a PATCH, is_on_budget=true is provisionally accepted here;
	// the service layer re-validates against the persisted account type.

	return errs
}
