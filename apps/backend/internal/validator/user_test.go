package validator_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

func strPtr(s string) *string { return &s }

func validInput() validator.RegisterInput {
	return validator.RegisterInput{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	}
}

func errFields(errs []httpx.FieldError) map[string]string {
	m := make(map[string]string, len(errs))
	for _, e := range errs {
		m[e.Field] = e.Error
	}
	return m
}

func TestValidateRegister(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     validator.RegisterInput
		wantField string
		wantMsg   string
	}{
		// --- success cases ---
		{
			name:  "all required fields",
			input: validInput(),
		},
		{
			name:  "with optional name",
			input: func() validator.RegisterInput { i := validInput(); i.Name = strPtr("Saqib Abdul"); return i }(),
		},
		{
			name:  "username 8 chars (min)",
			input: func() validator.RegisterInput { i := validInput(); i.Username = "abcde123"; return i }(),
		},
		{
			name:  "username 12 chars (max)",
			input: func() validator.RegisterInput { i := validInput(); i.Username = "abcde1234567"; return i }(),
		},
		{
			name:  "username with hyphen",
			input: func() validator.RegisterInput { i := validInput(); i.Username = "my-user01"; return i }(),
		},
		{
			name:  "username with underscore",
			input: func() validator.RegisterInput { i := validInput(); i.Username = "my_user01"; return i }(),
		},
		{
			name:  "password 8 bytes (min)",
			input: func() validator.RegisterInput { i := validInput(); i.Password = "Secure1!"; return i }(),
		},
		{
			name:  "password 72 bytes (max)",
			input: func() validator.RegisterInput { i := validInput(); i.Password = strings.Repeat("a", 72); return i }(),
		},
		{
			name:  "nil name is valid",
			input: func() validator.RegisterInput { i := validInput(); i.Name = nil; return i }(),
		},
		{
			name:  "exactly 100 char name is valid",
			input: func() validator.RegisterInput { i := validInput(); i.Name = strPtr(strings.Repeat("a", 100)); return i }(),
		},
		// --- username errors ---
		{
			name:      "username too short (7 chars)",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "short1a"; return i }(),
			wantField: "username",
			wantMsg:   "must be between 8 and 12 characters",
		},
		{
			name:      "username too long (13 chars)",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "toolongusrname"; return i }(),
			wantField: "username",
			wantMsg:   "must be between 8 and 12 characters",
		},
		{
			name:      "username starts with digit",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "1startdig1"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		{
			name:      "username trailing underscore",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "username_"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		{
			name:      "username trailing hyphen",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "username-"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		{
			name:      "username consecutive separators",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "ab__cdefgh"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		{
			name:      "username special char @",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "user@name1"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		{
			name:      "username spaces not allowed",
			input:     func() validator.RegisterInput { i := validInput(); i.Username = "user name1"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		// --- password errors ---
		{
			name:      "password empty",
			input:     func() validator.RegisterInput { i := validInput(); i.Password = ""; return i }(),
			wantField: "password",
			wantMsg:   "must be at least 8 characters",
		},
		{
			name:      "password too short (7 chars)",
			input:     func() validator.RegisterInput { i := validInput(); i.Password = "Short1!"; return i }(),
			wantField: "password",
			wantMsg:   "must be at least 8 characters",
		},
		{
			name:      "password too long (73 bytes)",
			input:     func() validator.RegisterInput { i := validInput(); i.Password = strings.Repeat("a", 73); return i }(),
			wantField: "password",
			wantMsg:   "must not exceed 72 characters",
		},
		// --- email errors ---
		{
			name:      "email empty",
			input:     func() validator.RegisterInput { i := validInput(); i.Email = ""; return i }(),
			wantField: "email",
			wantMsg:   "required",
		},
		{
			name:      "email invalid format no @",
			input:     func() validator.RegisterInput { i := validInput(); i.Email = "notanemail"; return i }(),
			wantField: "email",
			wantMsg:   "invalid email format",
		},
		{
			name:      "email invalid format bare @",
			input:     func() validator.RegisterInput { i := validInput(); i.Email = "user@"; return i }(),
			wantField: "email",
			wantMsg:   "invalid email format",
		},
		{
			name: "email exceeds 254 chars",
			input: func() validator.RegisterInput {
				i := validInput()
				i.Email = strings.Repeat("a", 250) + "@b.co"
				return i
			}(),
			wantField: "email",
			wantMsg:   "must not exceed 254 characters",
		},
		// --- name errors ---
		{
			name:      "name empty string is invalid",
			input:     func() validator.RegisterInput { i := validInput(); i.Name = new(string); return i }(),
			wantField: "name",
			wantMsg:   "must not be empty if provided",
		},
		{
			name:      "name exceeds 100 chars",
			input:     func() validator.RegisterInput { i := validInput(); i.Name = strPtr(strings.Repeat("a", 101)); return i }(),
			wantField: "name",
			wantMsg:   "must not exceed 100 characters",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			fields := errFields(validator.ValidateRegister(tc.input))
			if tc.wantField == "" {
				assert.Empty(t, fields)
			} else {
				assert.Contains(t, fields[tc.wantField], tc.wantMsg)
			}
		})
	}
}

func TestValidateRegister_AggregatesAllErrors(t *testing.T) {
	t.Parallel()

	in := validator.RegisterInput{
		Username: "x",     // too short
		Password: "short", // too short
		Email:    "",      // required
	}

	fields := errFields(validator.ValidateRegister(in))
	assert.Contains(t, fields, "username")
	assert.Contains(t, fields, "password")
	assert.Contains(t, fields, "email")
}
