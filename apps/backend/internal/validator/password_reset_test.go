package validator

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateRequestReset(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     RequestResetInput
		wantErrs  int
		wantField string
		wantMsg   string
	}{
		{
			name:     "valid email",
			input:    RequestResetInput{Email: "user@example.com"},
			wantErrs: 0,
		},
		{
			name:      "missing email",
			input:     RequestResetInput{},
			wantErrs:  1,
			wantField: "email",
			wantMsg:   "required",
		},
		{
			name:      "invalid email format",
			input:     RequestResetInput{Email: "not-an-email"},
			wantErrs:  1,
			wantField: "email",
			wantMsg:   "invalid email format",
		},
		{
			name:      "email exceeds 254 characters",
			input:     RequestResetInput{Email: strings.Repeat("a", 249) + "@b.com"},
			wantErrs:  1,
			wantField: "email",
			wantMsg:   "must not exceed 254 characters",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			errs := ValidateRequestReset(tc.input)
			assert.Len(t, errs, tc.wantErrs)
			if tc.wantField != "" && len(errs) > 0 {
				assert.Equal(t, tc.wantField, errs[0].Field)
				assert.Contains(t, errs[0].Error, tc.wantMsg)
			}
		})
	}
}

func TestValidateConfirmReset(t *testing.T) {
	t.Parallel()

	validToken := strings.Repeat("a", 64)
	validPass := "SecurePass1"

	tests := []struct {
		name      string
		input     ConfirmResetInput
		wantErrs  int
		wantField string
		wantMsg   string
	}{
		{
			name:     "valid token and password",
			input:    ConfirmResetInput{Token: validToken, NewPassword: validPass},
			wantErrs: 0,
		},
		{
			name:      "missing token",
			input:     ConfirmResetInput{NewPassword: validPass},
			wantErrs:  1,
			wantField: "token",
			wantMsg:   "64-character hex string",
		},
		{
			name:      "token too short",
			input:     ConfirmResetInput{Token: strings.Repeat("a", 63), NewPassword: validPass},
			wantErrs:  1,
			wantField: "token",
			wantMsg:   "64-character hex string",
		},
		{
			name:      "token too long",
			input:     ConfirmResetInput{Token: strings.Repeat("a", 65), NewPassword: validPass},
			wantErrs:  1,
			wantField: "token",
			wantMsg:   "64-character hex string",
		},
		{
			name:      "token contains non-hex characters",
			input:     ConfirmResetInput{Token: strings.Repeat("g", 64), NewPassword: validPass},
			wantErrs:  1,
			wantField: "token",
			wantMsg:   "64-character hex string",
		},
		{
			name:      "token uppercase hex rejected",
			input:     ConfirmResetInput{Token: strings.Repeat("A", 64), NewPassword: validPass},
			wantErrs:  1,
			wantField: "token",
			wantMsg:   "64-character hex string",
		},
		{
			name:      "password too short",
			input:     ConfirmResetInput{Token: validToken, NewPassword: "short"},
			wantErrs:  1,
			wantField: "new_password",
			wantMsg:   "at least 8 characters",
		},
		{
			name:      "password too long",
			input:     ConfirmResetInput{Token: validToken, NewPassword: strings.Repeat("a", 73)},
			wantErrs:  1,
			wantField: "new_password",
			wantMsg:   "must not exceed 72 characters",
		},
		{
			name:     "both invalid returns two errors",
			input:    ConfirmResetInput{Token: "bad", NewPassword: "x"},
			wantErrs: 2,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			errs := ValidateConfirmReset(tc.input)
			assert.Len(t, errs, tc.wantErrs)
			if tc.wantField != "" && len(errs) > 0 {
				assert.Equal(t, tc.wantField, errs[0].Field)
				assert.Contains(t, errs[0].Error, tc.wantMsg)
			}
		})
	}
}
