package validator

import (
	"net/mail"
	"regexp"
	"unicode/utf8"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// usernameRe enforces: starts with a letter, followed by alphanumeric chars, with
// optional single - or _ separators between alphanumeric segments.
var usernameRe = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*$`)

func validateUsername(username string) *httpx.FieldError {
	ulen := utf8.RuneCountInString(username)
	switch {
	case ulen < 8 || ulen > 12:
		return &httpx.FieldError{Field: "username", Error: "must be between 8 and 12 characters"}
	case !usernameRe.MatchString(username):
		return &httpx.FieldError{
			Field: "username",
			Error: "must start with a letter, contain only letters, digits, hyphens, or underscores, and not end with a hyphen or underscore",
		}
	}
	return nil
}

func validatePassword(field, password string) *httpx.FieldError {
	plen := len(password)
	if plen < 8 {
		return &httpx.FieldError{Field: field, Error: "must be at least 8 characters"}
	}
	if plen > 72 {
		return &httpx.FieldError{Field: field, Error: "must not exceed 72 characters"}
	}
	return nil
}

func validateEmail(email string) *httpx.FieldError {
	if email == "" {
		return &httpx.FieldError{Field: "email", Error: "required"}
	}
	if len(email) > 254 {
		return &httpx.FieldError{Field: "email", Error: "must not exceed 254 characters"}
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return &httpx.FieldError{Field: "email", Error: "invalid email format"}
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
	if utf8.RuneCountInString(*name) > 100 {
		return &httpx.FieldError{Field: "name", Error: "must not exceed 100 characters"}
	}
	return nil
}

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

	// Password (byte length — bcrypt truncates at 72 bytes)
	if fe := validatePassword("password", in.Password); fe != nil {
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

// ValidatePatchProfile returns an error list. It rejects an empty body (all nil)
// and validates only the fields that are present.
func ValidatePatchProfile(in PatchProfileInput) []httpx.FieldError {
	profileFields := in.Name != nil || in.Username != nil || in.Email != nil || in.Picture != nil
	passwordFields := in.CurrentPassword != nil || in.NewPassword != nil
	if !profileFields && !passwordFields {
		return []httpx.FieldError{{Field: "body", Error: "request body must contain at least one field"}}
	}

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

	// Password change: both fields must be present together.
	if in.CurrentPassword == nil && in.NewPassword != nil {
		errs = append(errs, httpx.FieldError{Field: "current_password", Error: "required when changing password"})
	}
	if in.NewPassword == nil && in.CurrentPassword != nil {
		errs = append(errs, httpx.FieldError{Field: "new_password", Error: "required when changing password"})
	}
	if in.NewPassword != nil {
		if fe := validatePassword("new_password", *in.NewPassword); fe != nil {
			errs = append(errs, *fe)
		}
	}

	return errs
}
