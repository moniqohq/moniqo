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

package validator_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

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
			name: "password 72 bytes (max)",
			input: func() validator.RegisterInput {
				i := validInput()
				i.Password = strings.Repeat("a", 70) + "A1"
				return i
			}(),
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
		{
			name:      "password all lowercase (no uppercase or digit)",
			input:     func() validator.RegisterInput { i := validInput(); i.Password = "alllowercase"; return i }(),
			wantField: "password",
			wantMsg:   "uppercase",
		},
		{
			name:      "password no digit",
			input:     func() validator.RegisterInput { i := validInput(); i.Password = "NoDigitPass"; return i }(),
			wantField: "password",
			wantMsg:   "digit",
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

func validReplaceInput() validator.ReplaceProfileInput {
	return validator.ReplaceProfileInput{
		Username: "saqibtest",
		Email:    "saqib@example.com",
	}
}

func TestValidateReplaceProfile(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     validator.ReplaceProfileInput
		wantField string
		wantMsg   string
	}{
		// success
		{name: "all required fields", input: validReplaceInput()},
		{name: "with optional name", input: func() validator.ReplaceProfileInput {
			i := validReplaceInput()
			i.Name = strPtr("Saqib Abdul")
			return i
		}()},
		{name: "with empty picture", input: func() validator.ReplaceProfileInput {
			i := validReplaceInput()
			i.Picture = ""
			return i
		}()},
		{name: "with valid currency, timezone, and date format", input: func() validator.ReplaceProfileInput {
			i := validReplaceInput()
			i.Currency = strPtr("USD")
			i.Timezone = strPtr("America/New_York")
			i.DateFormat = strPtr("YYYY-MM-DD")
			return i
		}()},
		{name: "nil currency, timezone, and date format is valid", input: validReplaceInput()},
		{
			name: "non-empty picture is rejected as read-only",
			input: func() validator.ReplaceProfileInput {
				i := validReplaceInput()
				i.Picture = "https://example.com/avatar.png"
				return i
			}(),
			wantField: "picture",
			wantMsg:   "read-only",
		},
		// username errors
		{
			name:      "username starts with digit",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Username = "1startdig1"; return i }(),
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		{
			name:      "username too short",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Username = "short"; return i }(),
			wantField: "username",
			wantMsg:   "must be between 8 and 12 characters",
		},
		{
			name: "username too long",
			input: func() validator.ReplaceProfileInput {
				i := validReplaceInput()
				i.Username = "toolongusrname"
				return i
			}(),
			wantField: "username",
			wantMsg:   "must be between 8 and 12 characters",
		},
		// email errors
		{
			name:      "email empty",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Email = ""; return i }(),
			wantField: "email",
			wantMsg:   "required",
		},
		{
			name:      "email invalid format",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Email = "notanemail"; return i }(),
			wantField: "email",
			wantMsg:   "invalid email format",
		},
		// name errors
		{
			name:      "name empty string is invalid",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Name = new(string); return i }(),
			wantField: "name",
			wantMsg:   "must not be empty if provided",
		},
		{
			name: "name exceeds 100 chars",
			input: func() validator.ReplaceProfileInput {
				i := validReplaceInput()
				i.Name = strPtr(strings.Repeat("a", 101))
				return i
			}(),
			wantField: "name",
			wantMsg:   "must not exceed 100 characters",
		},
		// currency errors
		{
			name:      "unsupported currency code",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Currency = strPtr("JPY"); return i }(),
			wantField: "currency",
			wantMsg:   "unsupported currency code",
		},
		{
			name:      "empty currency string is invalid",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Currency = new(string); return i }(),
			wantField: "currency",
			wantMsg:   "must not be empty if provided",
		},
		{
			name:      "lowercase currency code rejected",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Currency = strPtr("usd"); return i }(),
			wantField: "currency",
			wantMsg:   "unsupported currency code",
		},
		// timezone errors
		{
			name: "invalid IANA timezone",
			input: func() validator.ReplaceProfileInput {
				i := validReplaceInput()
				i.Timezone = strPtr("Not/A_Zone")
				return i
			}(),
			wantField: "timezone",
			wantMsg:   "invalid IANA timezone",
		},
		{
			name:      "empty timezone string is invalid",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.Timezone = new(string); return i }(),
			wantField: "timezone",
			wantMsg:   "must not be empty if provided",
		},
		// date format errors
		{
			name: "unsupported date format token",
			input: func() validator.ReplaceProfileInput {
				i := validReplaceInput()
				i.DateFormat = strPtr("DD-MM-YYYY")
				return i
			}(),
			wantField: "date_format",
			wantMsg:   "unsupported date format",
		},
		{
			name:      "empty date format string is invalid",
			input:     func() validator.ReplaceProfileInput { i := validReplaceInput(); i.DateFormat = new(string); return i }(),
			wantField: "date_format",
			wantMsg:   "must not be empty if provided",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			fields := errFields(validator.ValidateReplaceProfile(tc.input))
			if tc.wantField == "" {
				assert.Empty(t, fields)
			} else {
				assert.Contains(t, fields[tc.wantField], tc.wantMsg)
			}
		})
	}
}

func TestValidateReplaceProfile_AggregatesAllErrors(t *testing.T) {
	t.Parallel()

	in := validator.ReplaceProfileInput{
		Username: "x",
		Email:    "",
	}
	fields := errFields(validator.ValidateReplaceProfile(in))
	assert.Contains(t, fields, "username")
	assert.Contains(t, fields, "email")
}

func TestValidatePatchProfile(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     validator.PatchProfileInput
		wantField string
		wantMsg   string
	}{
		// success: individual field updates
		{name: "update username only", input: validator.PatchProfileInput{Username: strPtr("newuser01")}},
		{name: "update name only", input: validator.PatchProfileInput{Name: strPtr("New Name")}},
		{name: "update currency only", input: validator.PatchProfileInput{Currency: strPtr("EUR")}},
		{name: "update timezone only", input: validator.PatchProfileInput{Timezone: strPtr("Europe/Berlin")}},
		{name: "update date format only", input: validator.PatchProfileInput{DateFormat: strPtr("DD/MM/YYYY")}},
		{
			name:      "picture is rejected as read-only",
			input:     validator.PatchProfileInput{Picture: strPtr("avatar.png")},
			wantField: "picture",
			wantMsg:   "read-only",
		},
		{name: "password change with valid new password", input: validator.PatchProfileInput{
			CurrentPassword: strPtr("OldPass1"),
			NewPassword:     strPtr("NewPass1"),
		}},
		// empty body
		{
			name:      "all nil fields rejected",
			input:     validator.PatchProfileInput{},
			wantField: "body",
			wantMsg:   "at least one field",
		},
		// username errors
		{
			name:      "invalid username",
			input:     validator.PatchProfileInput{Username: strPtr("1badstart")},
			wantField: "username",
			wantMsg:   "must start with a letter",
		},
		// email errors: read-only over PATCH regardless of the value supplied
		{
			name:      "email is rejected as read-only",
			input:     validator.PatchProfileInput{Email: strPtr("notanemail")},
			wantField: "email",
			wantMsg:   "read-only",
		},
		{
			name:      "email is rejected as read-only even when valid",
			input:     validator.PatchProfileInput{Email: strPtr("new@example.com")},
			wantField: "email",
			wantMsg:   "read-only",
		},
		// name errors
		{
			name:      "empty name string",
			input:     validator.PatchProfileInput{Name: new(string)},
			wantField: "name",
			wantMsg:   "must not be empty if provided",
		},
		// currency/timezone/date format errors
		{
			name:      "unsupported currency code",
			input:     validator.PatchProfileInput{Currency: strPtr("JPY")},
			wantField: "currency",
			wantMsg:   "unsupported currency code",
		},
		{
			name:      "invalid IANA timezone",
			input:     validator.PatchProfileInput{Timezone: strPtr("Not/A_Zone")},
			wantField: "timezone",
			wantMsg:   "invalid IANA timezone",
		},
		{
			name:      "unsupported date format token",
			input:     validator.PatchProfileInput{DateFormat: strPtr("DD-MM-YYYY")},
			wantField: "date_format",
			wantMsg:   "unsupported date format",
		},
		// password change errors
		{
			name:      "new_password without current_password",
			input:     validator.PatchProfileInput{NewPassword: strPtr("NewPass1")},
			wantField: "current_password",
			wantMsg:   "required when changing password",
		},
		{
			name:      "current_password without new_password",
			input:     validator.PatchProfileInput{CurrentPassword: strPtr("OldPass1")},
			wantField: "new_password",
			wantMsg:   "required when changing password",
		},
		{
			name:      "new_password fails strength check",
			input:     validator.PatchProfileInput{CurrentPassword: strPtr("OldPass1"), NewPassword: strPtr("alllowercase")},
			wantField: "new_password",
			wantMsg:   "uppercase",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			fields := errFields(validator.ValidatePatchProfile(tc.input))
			if tc.wantField == "" {
				assert.Empty(t, fields)
			} else {
				assert.Contains(t, fields[tc.wantField], tc.wantMsg)
			}
		})
	}
}

func TestValidatePictureURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		picture string
		wantErr bool
	}{
		{name: "empty is valid", picture: "", wantErr: false},
		{name: "minted relative URL is valid", picture: "/api/v1/users/42/picture", wantErr: false},
		{name: "valid external https URL", picture: "https://lh3.googleusercontent.com/a/avatar.png", wantErr: false},
		{name: "javascript scheme is rejected", picture: "javascript:alert(1)", wantErr: true},
		{name: "data URI is rejected", picture: "data:text/html;base64,PHNjcmlwdD4=", wantErr: true},
		{name: "protocol-relative URL is rejected", picture: "//evil.com/a.png", wantErr: true},
		{name: "plain http is rejected", picture: "http://example.com/a.png", wantErr: true},
		{name: "embedded userinfo is rejected", picture: "https://user:pass@example.com/a.png", wantErr: true},
		{name: "excessively long URL is rejected", picture: "https://example.com/" + strings.Repeat("a", 2049), wantErr: true},
		{name: "minted URL for a different id is still valid", picture: "/api/v1/users/1/picture", wantErr: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			fe := validator.ValidatePictureURL(tc.picture)
			if tc.wantErr {
				require.NotNil(t, fe)
				assert.Equal(t, "picture", fe.Field)
			} else {
				assert.Nil(t, fe)
			}
		})
	}
}
