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
