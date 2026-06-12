package validator

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateLogin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     LoginInput
		wantErrs  int
		wantField string
		wantError string
	}{
		// Valid cases
		{
			name:     "valid email and password",
			input:    LoginInput{Email: "user@example.com", Password: "SecurePass1"},
			wantErrs: 0,
		},
		{
			name:     "minimum password length",
			input:    LoginInput{Email: "user@example.com", Password: "12345678"},
			wantErrs: 0,
		},
		{
			name:     "maximum password length",
			input:    LoginInput{Email: "user@example.com", Password: strings.Repeat("a", 72)},
			wantErrs: 0,
		},

		// Email failures
		{
			name:      "missing email",
			input:     LoginInput{Password: "SecurePass1"},
			wantErrs:  1,
			wantField: "email",
			wantError: "required",
		},
		{
			name:      "invalid email format",
			input:     LoginInput{Email: "not-an-email", Password: "SecurePass1"},
			wantErrs:  1,
			wantField: "email",
			wantError: "invalid email format",
		},
		{
			name:      "email exceeds 254 characters",
			input:     LoginInput{Email: strings.Repeat("a", 249) + "@b.com", Password: "SecurePass1"},
			wantErrs:  1,
			wantField: "email",
			wantError: "must not exceed 254 characters",
		},

		// Password failures
		{
			name:      "missing password",
			input:     LoginInput{Email: "user@example.com"},
			wantErrs:  1,
			wantField: "password",
			wantError: "required",
		},
		{
			name:      "password too short",
			input:     LoginInput{Email: "user@example.com", Password: "short"},
			wantErrs:  1,
			wantField: "password",
			wantError: "must be at least 8 characters",
		},
		{
			name:      "password exceeds 72 bytes",
			input:     LoginInput{Email: "user@example.com", Password: strings.Repeat("a", 73)},
			wantErrs:  1,
			wantField: "password",
			wantError: "must not exceed 72 characters",
		},

		// Multiple errors
		{
			name:     "both fields missing returns two errors",
			input:    LoginInput{},
			wantErrs: 2,
		},
		{
			name:     "both fields invalid returns two errors",
			input:    LoginInput{Email: "bad", Password: "x"},
			wantErrs: 2,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			errs := ValidateLogin(tc.input)
			assert.Len(t, errs, tc.wantErrs)

			if tc.wantField != "" && len(errs) > 0 {
				assert.Equal(t, tc.wantField, errs[0].Field)
				assert.Contains(t, errs[0].Error, tc.wantError)
			}
		})
	}
}
