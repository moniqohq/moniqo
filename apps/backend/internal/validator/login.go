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

// Package validator provides input validation helpers for HTTP request payloads.
package validator

import (
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// LoginInput holds the credentials extracted from a login request body.
type LoginInput struct {
	Email    string
	Password string
}

// ValidateLogin aggregates all field-level failures for a login request.
func ValidateLogin(in LoginInput) []httpx.FieldError {
	var errs []httpx.FieldError

	// Email
	if fe := validateEmail(in.Email); fe != nil {
		errs = append(errs, *fe)
	}

	// Password (byte length — bcrypt truncates at 72 bytes)
	if in.Password == "" {
		errs = append(errs, httpx.FieldError{Field: "password", Error: "required"})
	} else if fe := validatePassword("password", in.Password); fe != nil {
		errs = append(errs, *fe)
	}

	return errs
}
