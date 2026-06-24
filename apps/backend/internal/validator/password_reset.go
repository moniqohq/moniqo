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
	"regexp"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

const resetTokenLen = 64

var hexRe = regexp.MustCompile(`^[0-9a-f]+$`)

// RequestResetInput holds the fields for POST /api/v1/auth/password-reset.
type RequestResetInput struct {
	Email string
}

// ValidateRequestReset validates the password reset request body.
func ValidateRequestReset(in RequestResetInput) []httpx.FieldError {
	var errs []httpx.FieldError
	if fe := validateEmail(in.Email); fe != nil {
		errs = append(errs, *fe)
	}
	return errs
}

// ConfirmResetInput holds the fields for POST /api/v1/auth/password-reset/confirm.
type ConfirmResetInput struct {
	Token       string
	NewPassword string
}

// ValidateConfirmReset validates the password reset confirmation body.
func ValidateConfirmReset(in ConfirmResetInput) []httpx.FieldError {
	var errs []httpx.FieldError

	if len(in.Token) != resetTokenLen || !hexRe.MatchString(in.Token) {
		errs = append(errs, httpx.FieldError{Field: "token", Error: "must be a 64-character hex string"})
	}

	if fe := validatePassword("new_password", in.NewPassword); fe != nil {
		errs = append(errs, *fe)
	}

	return errs
}
