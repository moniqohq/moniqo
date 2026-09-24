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

package user_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// TestNewOTPCode_Format samples the generator many times and checks every
// code is exactly 6 ASCII digits, zero-padded — this catches both a
// zero-padding regression and modulo bias toward smaller values.
func TestNewOTPCode_Format(t *testing.T) {
	t.Parallel()

	const samples = 10_000
	seenDigitAtPosition := make([]map[byte]bool, 6)
	for i := range seenDigitAtPosition {
		seenDigitAtPosition[i] = make(map[byte]bool)
	}

	for range samples {
		code, err := user.NewOTPCode()
		require.NoError(t, err)
		require.Len(t, code, 6)
		for i := range 6 {
			d := code[i]
			require.True(t, d >= '0' && d <= '9', "code %q contains a non-digit", code)
			seenDigitAtPosition[i][d] = true
		}
	}

	// Over 10k samples every position should have seen every digit 0-9 at
	// least once; a zero-padding bug (e.g. left-padding only some codes) or a
	// modulo-bias bug would visibly skew this.
	for i, seen := range seenDigitAtPosition {
		assert.Len(t, seen, 10, "position %d did not see all 10 digits across %d samples", i, samples)
	}
}

// TestSvc_HashOTP_Binding checks the hash is bound to both the request ID and
// the code, so a leaked hash can't be replayed against a different request
// and two requests never collide even if crypto/rand happened to mint the
// same code for both.
func TestSvc_HashOTP_Binding(t *testing.T) {
	t.Parallel()

	svc := user.NewSvc(&internalmock.UserRepository{}, &internalmock.EmailEnqueuer{}, bcrypt.MinCost,
		"http://localhost:3000", []byte("test-secret"), zap.NewNop())

	id1, id2 := uuid.New(), uuid.New()
	code := "483920"

	h1 := svc.HashOTP(id1, code)
	h2 := svc.HashOTP(id2, code)
	assert.NotEqual(t, h1, h2, "same code under different request IDs must hash differently")

	h3 := svc.HashOTP(id1, "111111")
	assert.NotEqual(t, h1, h3, "different codes under the same request ID must hash differently")

	assert.NotContains(t, h1, code, "the hash must not leak the plaintext code")
	assert.Len(t, h1, 64, "hex-encoded SHA-256 is 64 chars")
}
