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
	"net/mail"
	"regexp"
	"unicode"
	"unicode/utf8"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// usernameRe enforces: starts with a letter, followed by alphanumeric chars, with
// optional single - or _ separators between alphanumeric segments.
const (
	fieldEmail     = "email"
	minPasswordLen = 8
	maxPasswordLen = 72
	maxEmailLen    = 254
	maxNameLen     = 100
)

var usernameRe = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*$`)

func validateUsername(username string) *httpx.FieldError {
	ulen := utf8.RuneCountInString(username)
	switch {
	case ulen < 8 || ulen > 12:
		return &httpx.FieldError{Field: "username", Error: "must be between 8 and 12 characters"}
	case !usernameRe.MatchString(username):
		return &httpx.FieldError{
			Field: "username",
			Error: "must start with a letter and contain only letters, digits, hyphens, or underscores",
		}
	}
	return nil
}

// validatePassword checks only length bounds; used at login where the password
// already exists and character-class strength is irrelevant.
func validatePassword(field, password string) *httpx.FieldError {
	plen := len(password)
	if plen < minPasswordLen {
		return &httpx.FieldError{Field: field, Error: "must be at least 8 characters"}
	}
	if plen > maxPasswordLen {
		return &httpx.FieldError{Field: field, Error: "must not exceed 72 characters"}
	}
	return nil
}

// validatePasswordStrength checks length bounds plus character-class requirements
// (at least one uppercase letter, one lowercase letter, one digit).
// Rules: 8–72 bytes; ≥1 uppercase; ≥1 lowercase; ≥1 digit.
func validatePasswordStrength(field, password string) *httpx.FieldError {
	if fe := validatePassword(field, password); fe != nil {
		return fe
	}
	var hasUpper, hasLower, hasDigit bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
		if hasUpper && hasLower && hasDigit {
			break
		}
	}
	if !hasUpper || !hasLower || !hasDigit {
		return &httpx.FieldError{
			Field: field,
			Error: "must contain at least one uppercase letter, one lowercase letter, and one digit",
		}
	}
	return nil
}

func validateEmail(email string) *httpx.FieldError {
	if email == "" {
		return &httpx.FieldError{Field: fieldEmail, Error: "required"}
	}
	if len(email) > maxEmailLen {
		return &httpx.FieldError{Field: fieldEmail, Error: "must not exceed 254 characters"}
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return &httpx.FieldError{Field: fieldEmail, Error: "invalid email format"}
	}
	return nil
}

func validateName(name *string) *httpx.FieldError {
	if name == nil {
		return nil
	}
	if *name == "" {
		return &httpx.FieldError{Field: "name", Error: "must not be empty if provided"}
	}
	if utf8.RuneCountInString(*name) > maxNameLen {
		return &httpx.FieldError{Field: "name", Error: "must not exceed 100 characters"}
	}
	return nil
}

// RegisterInput holds the fields for POST /api/v1/users registration.
type RegisterInput struct {
	Username string
	Password string
	Email    string
	Name     *string // nil = omitted; non-nil empty string = explicitly empty (invalid)
}

// ValidateRegister aggregates all field-level failures in a single pass.
func ValidateRegister(in RegisterInput) []httpx.FieldError {
	var errs []httpx.FieldError

	// Username
	if fe := validateUsername(in.Username); fe != nil {
		errs = append(errs, *fe)
	}

	// Password strength (length + character classes)
	if fe := validatePasswordStrength("password", in.Password); fe != nil {
		errs = append(errs, *fe)
	}

	// Email (required)
	if fe := validateEmail(in.Email); fe != nil {
		errs = append(errs, *fe)
	}

	// Name (optional — omitted is fine; explicitly empty is not)
	if fe := validateName(in.Name); fe != nil {
		errs = append(errs, *fe)
	}

	return errs
}

// ReplaceProfileInput holds the fields for PUT /api/v1/users/{id}.
type ReplaceProfileInput struct {
	Name     *string
	Username string
	Email    string
	Picture  string // free-form; no format constraint
}

// ValidateReplaceProfile aggregates all field-level failures in a single pass.
func ValidateReplaceProfile(in ReplaceProfileInput) []httpx.FieldError {
	var errs []httpx.FieldError

	if fe := validateUsername(in.Username); fe != nil {
		errs = append(errs, *fe)
	}

	if fe := validateEmail(in.Email); fe != nil {
		errs = append(errs, *fe)
	}

	if fe := validateName(in.Name); fe != nil {
		errs = append(errs, *fe)
	}

	return errs
}

// PatchProfileInput holds the optional fields for PATCH /api/v1/users/{id}.
// A nil pointer means the field was absent from the request body.
type PatchProfileInput struct {
	Name            *string
	Username        *string
	Email           *string
	Picture         *string
	CurrentPassword *string
	NewPassword     *string
}

func validatePatchProfileFields(in PatchProfileInput) []httpx.FieldError {
	var errs []httpx.FieldError
	if in.Username != nil {
		if fe := validateUsername(*in.Username); fe != nil {
			errs = append(errs, *fe)
		}
	}
	if in.Email != nil {
		if fe := validateEmail(*in.Email); fe != nil {
			errs = append(errs, *fe)
		}
	}
	if fe := validateName(in.Name); fe != nil {
		errs = append(errs, *fe)
	}
	return errs
}

func validatePatchPasswordFields(in PatchProfileInput) []httpx.FieldError {
	var errs []httpx.FieldError
	if in.CurrentPassword == nil && in.NewPassword != nil {
		errs = append(errs, httpx.FieldError{Field: "current_password", Error: "required when changing password"})
	}
	if in.NewPassword == nil && in.CurrentPassword != nil {
		errs = append(errs, httpx.FieldError{Field: "new_password", Error: "required when changing password"})
	}
	if in.NewPassword != nil {
		if fe := validatePasswordStrength("new_password", *in.NewPassword); fe != nil {
			errs = append(errs, *fe)
		}
	}
	return errs
}

// ValidatePatchProfile returns an error list. It rejects an empty body (all nil)
// and validates only the fields that are present.
func ValidatePatchProfile(in PatchProfileInput) []httpx.FieldError {
	profileFields := in.Name != nil || in.Username != nil || in.Email != nil || in.Picture != nil
	passwordFields := in.CurrentPassword != nil || in.NewPassword != nil
	if !profileFields && !passwordFields {
		return []httpx.FieldError{{Field: "body", Error: "request body must contain at least one field"}}
	}
	errs := validatePatchProfileFields(in)
	return append(errs, validatePatchPasswordFields(in)...)
}
