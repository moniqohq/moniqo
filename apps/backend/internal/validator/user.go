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
	ulen := utf8.RuneCountInString(in.Username)
	switch {
	case ulen < 8 || ulen > 12:
		errs = append(errs, httpx.FieldError{Field: "username", Error: "must be between 8 and 12 characters"})
	case !usernameRe.MatchString(in.Username):
		errs = append(errs, httpx.FieldError{
			Field: "username",
			Error: "must start with a letter, contain only letters, digits, hyphens, or underscores, and not end with a hyphen or underscore",
		})
	}

	// Password (byte length — bcrypt truncates at 72 bytes)
	plen := len(in.Password)
	if plen < 8 {
		errs = append(errs, httpx.FieldError{Field: "password", Error: "must be at least 8 characters"})
	} else if plen > 72 {
		errs = append(errs, httpx.FieldError{Field: "password", Error: "must not exceed 72 characters"})
	}

	// Email (required)
	if in.Email == "" {
		errs = append(errs, httpx.FieldError{Field: "email", Error: "required"})
	} else if len(in.Email) > 254 {
		errs = append(errs, httpx.FieldError{Field: "email", Error: "must not exceed 254 characters"})
	} else if _, err := mail.ParseAddress(in.Email); err != nil {
		errs = append(errs, httpx.FieldError{Field: "email", Error: "invalid email format"})
	}

	// Name (optional — omitted is fine; explicitly empty is not)
	if in.Name != nil {
		if *in.Name == "" {
			errs = append(errs, httpx.FieldError{Field: "name", Error: "must not be empty if provided"})
		} else if utf8.RuneCountInString(*in.Name) > 100 {
			errs = append(errs, httpx.FieldError{Field: "name", Error: "must not exceed 100 characters"})
		}
	}

	return errs
}
