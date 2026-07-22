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

package auth

import "time"

// Exported for use in package auth_test only.
var SetClaimsInContext = setClaimsInContext
var SetUserInContext = setUserInContext

const Issuer = issuer

// -----------------------------------------------------------------------------
// OIDC test helpers — exported for use in package auth_test only.
// -----------------------------------------------------------------------------

const (
	OIDCFlowCookieName = oidcFlowCookieName
	OIDCPurposeLogin   = oidcPurposeLogin
	OIDCPurposeLink    = oidcPurposeLink
)

var (
	OIDCFlowStateTTL     = oidcFlowStateTTL
	GenerateState        = generateState
	GenerateNonce        = generateNonce
	GeneratePKCEVerifier = generatePKCEVerifier
	PKCEChallengeS256    = pkceChallengeS256
)

// FlowStateFields mirrors the unexported flowState struct for assertions in
// package auth_test, which cannot name that type directly.
type FlowStateFields struct {
	State, Nonce, Verifier, Provider, Purpose string
	UserID                                    int64
	ExpiresAt                                 int64
}

// SignFlowStateForTest builds and signs a flow-state token with the given
// fields and TTL, mirroring what OIDCSvc.initiate produces.
func SignFlowStateForTest(secret []byte, f FlowStateFields, ttl time.Duration) (string, error) {
	return signFlowState(flowState{
		State:     f.State,
		Nonce:     f.Nonce,
		Verifier:  f.Verifier,
		Provider:  f.Provider,
		Purpose:   f.Purpose,
		UserID:    f.UserID,
		ExpiresAt: time.Now().Add(ttl).Unix(),
	}, secret)
}

// DecodeFlowStateForTest decodes a flow-state token, returning its fields as
// the exported FlowStateFields mirror.
func DecodeFlowStateForTest(token string, secret []byte) (FlowStateFields, error) {
	st, err := decodeFlowState(token, secret)
	if err != nil {
		return FlowStateFields{}, err
	}
	return FlowStateFields{
		State: st.State, Nonce: st.Nonce, Verifier: st.Verifier,
		Provider: st.Provider, Purpose: st.Purpose, UserID: st.UserID, ExpiresAt: st.ExpiresAt,
	}, nil
}
