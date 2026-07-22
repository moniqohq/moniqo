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

package auth_test

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
)

var oidcStateSecret = []byte("test-oidc-state-secret")

func validFlowFields() auth.FlowStateFields {
	return auth.FlowStateFields{
		State:    "state123",
		Nonce:    "nonce456",
		Verifier: "verifier789",
		Provider: "google",
		Purpose:  auth.OIDCPurposeLogin,
	}
}

func TestFlowState_RoundTrip(t *testing.T) {
	t.Parallel()

	token, err := auth.SignFlowStateForTest(oidcStateSecret, validFlowFields(), auth.OIDCFlowStateTTL)
	require.NoError(t, err)

	decoded, err := auth.DecodeFlowStateForTest(token, oidcStateSecret)
	require.NoError(t, err)

	assert.Equal(t, "state123", decoded.State)
	assert.Equal(t, "nonce456", decoded.Nonce)
	assert.Equal(t, "verifier789", decoded.Verifier)
	assert.Equal(t, "google", decoded.Provider)
	assert.Equal(t, auth.OIDCPurposeLogin, decoded.Purpose)
}

func TestFlowState_LinkPurposeCarriesUserID(t *testing.T) {
	t.Parallel()

	fields := validFlowFields()
	fields.Purpose = auth.OIDCPurposeLink
	fields.UserID = 42

	token, err := auth.SignFlowStateForTest(oidcStateSecret, fields, auth.OIDCFlowStateTTL)
	require.NoError(t, err)

	decoded, err := auth.DecodeFlowStateForTest(token, oidcStateSecret)
	require.NoError(t, err)
	assert.Equal(t, int64(42), decoded.UserID)
}

func TestFlowState_TamperedPayloadRejected(t *testing.T) {
	t.Parallel()

	token, err := auth.SignFlowStateForTest(oidcStateSecret, validFlowFields(), auth.OIDCFlowStateTTL)
	require.NoError(t, err)

	parts := strings.SplitN(token, ".", 2)
	require.Len(t, parts, 2)
	tampered := parts[0] + "x" + "." + parts[1]

	_, err = auth.DecodeFlowStateForTest(tampered, oidcStateSecret)
	require.Error(t, err)
}

func TestFlowState_TamperedSignatureRejected(t *testing.T) {
	t.Parallel()

	token, err := auth.SignFlowStateForTest(oidcStateSecret, validFlowFields(), auth.OIDCFlowStateTTL)
	require.NoError(t, err)

	parts := strings.SplitN(token, ".", 2)
	require.Len(t, parts, 2)
	tampered := parts[0] + "." + parts[1] + "x"

	_, err = auth.DecodeFlowStateForTest(tampered, oidcStateSecret)
	require.Error(t, err)
}

func TestFlowState_ExpiredRejected(t *testing.T) {
	t.Parallel()

	token, err := auth.SignFlowStateForTest(oidcStateSecret, validFlowFields(), -time.Minute)
	require.NoError(t, err)

	_, err = auth.DecodeFlowStateForTest(token, oidcStateSecret)
	require.Error(t, err)
}

func TestFlowState_WrongSecretRejected(t *testing.T) {
	t.Parallel()

	token, err := auth.SignFlowStateForTest(oidcStateSecret, validFlowFields(), auth.OIDCFlowStateTTL)
	require.NoError(t, err)

	_, err = auth.DecodeFlowStateForTest(token, []byte("a-different-secret"))
	require.Error(t, err)
}

func TestFlowState_MalformedTokenRejected(t *testing.T) {
	t.Parallel()

	_, err := auth.DecodeFlowStateForTest("not-a-valid-token", oidcStateSecret)
	require.Error(t, err)
}

func TestPKCEChallengeS256_IsDeterministicAndDiffersFromVerifier(t *testing.T) {
	t.Parallel()

	verifier, err := auth.GeneratePKCEVerifier()
	require.NoError(t, err)
	require.NotEmpty(t, verifier)

	challenge1 := auth.PKCEChallengeS256(verifier)
	challenge2 := auth.PKCEChallengeS256(verifier)
	assert.Equal(t, challenge1, challenge2)
	assert.NotEqual(t, verifier, challenge1)
}

func TestGenerateState_And_GenerateNonce_AreRandomAndNonEmpty(t *testing.T) {
	t.Parallel()

	s1, err := auth.GenerateState()
	require.NoError(t, err)
	s2, err := auth.GenerateState()
	require.NoError(t, err)
	assert.NotEmpty(t, s1)
	assert.NotEqual(t, s1, s2)

	n1, err := auth.GenerateNonce()
	require.NoError(t, err)
	assert.NotEmpty(t, n1)
}
