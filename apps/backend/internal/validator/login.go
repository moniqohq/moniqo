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
