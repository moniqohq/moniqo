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

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"
)

const (
	// oidcFlowCookieName is the signed, short-lived cookie that carries the
	// OAuth state/nonce/PKCE verifier across the redirect to the identity
	// provider and back. It is scoped to the OIDC subtree and cleared
	// unconditionally on every callback, success or failure.
	oidcFlowCookieName = "moniqo_oidc_flow"
	oidcFlowCookiePath = "/api/v1/auth"
	oidcFlowStateTTL   = 10 * time.Minute

	oidcPurposeLogin = "login"
	oidcPurposeLink  = "link"

	stateNonceSize    = 32 // random bytes
	pkceVerifierSize  = 64 // random bytes, base64url-encoded -> ~86 chars, within RFC 7636's 43-128
	flowTokenPartsLen = 2
)

// flowState is the payload carried by the signed OIDC flow cookie. JSON is
// used (rather than the colon-delimited format of the email verification
// token) because there are more fields here and UserID is conditional.
type flowState struct {
	State     string `json:"st"`
	Nonce     string `json:"n"`
	Verifier  string `json:"v"`
	Provider  string `json:"p"`
	Purpose   string `json:"pu"`
	UserID    int64  `json:"u,omitempty"`
	ExpiresAt int64  `json:"e"`
}

// generateRandomURLToken returns n cryptographically random bytes, base64url
// (unpadded) encoded. Used for state, nonce, and the PKCE verifier.
func generateRandomURLToken(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func generateState() (string, error) { return generateRandomURLToken(stateNonceSize) }
func generateNonce() (string, error) { return generateRandomURLToken(stateNonceSize) }

// generatePKCEVerifier returns a PKCE code verifier per RFC 7636 (unreserved
// characters, 43-128 chars long). base64url of 64 random bytes yields an
// 86-character string comfortably inside that range.
func generatePKCEVerifier() (string, error) { return generateRandomURLToken(pkceVerifierSize) }

// pkceChallengeS256 returns the S256 PKCE code challenge for verifier.
func pkceChallengeS256(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// signFlowState serializes and HMAC-signs st, returning a cookie-safe token
// in the form base64url(json) "." base64url(sig).
func signFlowState(st flowState, secret []byte) (string, error) {
	payload, err := json.Marshal(st)
	if err != nil {
		return "", fmt.Errorf("marshal flow state: %w", err)
	}
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(payload)
	sig := mac.Sum(nil)
	return base64.RawURLEncoding.EncodeToString(payload) + "." + base64.RawURLEncoding.EncodeToString(sig), nil
}

// decodeFlowState verifies the HMAC signature and expiry of a token produced
// by signFlowState, returning ErrInvalidState for any tampering, malformed
// input, or expiry.
func decodeFlowState(token string, secret []byte) (flowState, error) {
	parts := splitFlowToken(token)
	if len(parts) != flowTokenPartsLen {
		return flowState{}, ErrInvalidState
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return flowState{}, ErrInvalidState
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return flowState{}, ErrInvalidState
	}

	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(payload)
	if !hmac.Equal(mac.Sum(nil), sig) {
		return flowState{}, ErrInvalidState
	}

	var st flowState
	if err := json.Unmarshal(payload, &st); err != nil {
		return flowState{}, ErrInvalidState
	}
	if time.Now().Unix() > st.ExpiresAt {
		return flowState{}, ErrInvalidState
	}
	return st, nil
}

func splitFlowToken(token string) []string {
	for i := 0; i < len(token); i++ {
		if token[i] == '.' {
			return []string{token[:i], token[i+1:]}
		}
	}
	return []string{token}
}
