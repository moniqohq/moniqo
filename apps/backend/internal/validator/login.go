package validator

import (
	"net/mail"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

type LoginInput struct {
	Email    string
	Password string
}

// ValidateLogin aggregates all field-level failures for a login request.
func ValidateLogin(in LoginInput) []httpx.FieldError {
	var errs []httpx.FieldError

	// Email
	if in.Email == "" {
		errs = append(errs, httpx.FieldError{Field: "email", Error: "required"})
	} else if len(in.Email) > 254 {
		errs = append(errs, httpx.FieldError{Field: "email", Error: "must not exceed 254 characters"})
	} else if _, err := mail.ParseAddress(in.Email); err != nil {
		errs = append(errs, httpx.FieldError{Field: "email", Error: "invalid email format"})
	}

	// Password (byte length — bcrypt truncates at 72 bytes)
	plen := len(in.Password)
	if plen == 0 {
		errs = append(errs, httpx.FieldError{Field: "password", Error: "required"})
	} else if plen < 8 {
		errs = append(errs, httpx.FieldError{Field: "password", Error: "must be at least 8 characters"})
	} else if plen > 72 {
		errs = append(errs, httpx.FieldError{Field: "password", Error: "must not exceed 72 characters"})
	}

	return errs
}
