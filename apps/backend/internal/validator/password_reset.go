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
