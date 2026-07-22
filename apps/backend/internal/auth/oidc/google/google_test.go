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

// Internal (package google) tests, not package google_test, because they
// construct a Provider directly with a fake KeySet — the real New() hardcodes
// Google's issuer and cannot be pointed at a local fake discovery server.
package google

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"

	moniqooidc "github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

const testIssuer = "https://issuer.test"
const testClientID = "test-client-id"

// fakeKeySet skips cryptographic signature verification and returns the raw
// JWT payload — these tests exercise this package's own wiring (AuthURL
// parameters, Exchange plumbing, claim mapping, issuer/audience/nonce
// checks performed by go-oidc's Verify()), not go-jose's signature crypto,
// which is a well-tested third-party concern.
type fakeKeySet struct{}

func (fakeKeySet) VerifySignature(_ context.Context, jwtToken string) ([]byte, error) {
	parts := strings.Split(jwtToken, ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed jwt")
	}
	return base64.RawURLEncoding.DecodeString(parts[1])
}

func buildFakeIDToken(t *testing.T, claims map[string]any) string {
	t.Helper()
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256","typ":"JWT"}`))
	payloadBytes, err := json.Marshal(claims)
	require.NoError(t, err)
	payload := base64.RawURLEncoding.EncodeToString(payloadBytes)
	sig := base64.RawURLEncoding.EncodeToString([]byte("fake-signature"))
	return header + "." + payload + "." + sig
}

func testProvider(tokenURL string) *Provider {
	verifier := oidc.NewVerifier(testIssuer, fakeKeySet{}, &oidc.Config{ClientID: testClientID})
	return &Provider{
		cfg: Config{ClientID: testClientID, ClientSecret: "test-secret", RedirectURL: "https://app.moniqo.in/callback"},
		oauth2: oauth2.Config{
			ClientID:     testClientID,
			ClientSecret: "test-secret",
			RedirectURL:  "https://app.moniqo.in/callback",
			Endpoint:     oauth2.Endpoint{AuthURL: "https://issuer.test/auth", TokenURL: tokenURL},
			Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
		},
		verifier: verifier,
	}
}

func baseClaims() map[string]any {
	now := time.Now()
	return map[string]any{
		"iss":            testIssuer,
		"aud":            testClientID,
		"sub":            "google-subject-1",
		"iat":            now.Unix(),
		"exp":            now.Add(time.Hour).Unix(),
		"nonce":          "expected-nonce",
		"email":          "user@example.com",
		"email_verified": true,
		"name":           "Test User",
		"picture":        "https://example.com/pic.png",
	}
}

func TestGoogleProvider_Name(t *testing.T) {
	t.Parallel()
	p := testProvider("")
	assert.Equal(t, "google", p.Name())
}

func TestGoogleProvider_AuthURL(t *testing.T) {
	t.Parallel()
	p := testProvider("")

	authURL, err := p.AuthURL("the-state", "the-nonce", "the-challenge")
	require.NoError(t, err)

	parsed, err := url.Parse(authURL)
	require.NoError(t, err)
	q := parsed.Query()

	assert.Equal(t, testClientID, q.Get("client_id"))
	assert.Equal(t, "https://app.moniqo.in/callback", q.Get("redirect_uri"))
	assert.Equal(t, "the-state", q.Get("state"))
	assert.Equal(t, "the-nonce", q.Get("nonce"))
	assert.Equal(t, "the-challenge", q.Get("code_challenge"))
	assert.Equal(t, "S256", q.Get("code_challenge_method"))
	assert.Equal(t, "code", q.Get("response_type"))
}

func TestGoogleProvider_Exchange(t *testing.T) {
	t.Parallel()

	t.Run("success maps the token response", func(t *testing.T) {
		t.Parallel()
		idToken := buildFakeIDToken(t, baseClaims())

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "fake-access-token",
				"token_type":   "Bearer",
				"expires_in":   3600,
				"id_token":     idToken,
			})
		}))
		defer server.Close()

		p := testProvider(server.URL)
		ts, err := p.Exchange(context.Background(), "auth-code", "pkce-verifier")
		require.NoError(t, err)
		assert.Equal(t, "fake-access-token", ts.AccessToken)
		assert.Equal(t, idToken, ts.IDToken)
	})

	t.Run("missing id_token in response is an error", func(t *testing.T) {
		t.Parallel()
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "fake-access-token",
				"token_type":   "Bearer",
				"expires_in":   3600,
			})
		}))
		defer server.Close()

		p := testProvider(server.URL)
		_, err := p.Exchange(context.Background(), "auth-code", "pkce-verifier")
		require.Error(t, err)
	})

	t.Run("provider error response is propagated as an error", func(t *testing.T) {
		t.Parallel()
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": "invalid_grant"})
		}))
		defer server.Close()

		p := testProvider(server.URL)
		_, err := p.Exchange(context.Background(), "bad-code", "pkce-verifier")
		require.Error(t, err)
	})
}

func TestGoogleProvider_VerifyIDToken(t *testing.T) {
	t.Parallel()
	p := testProvider("")

	t.Run("valid token maps to the expected identity", func(t *testing.T) {
		t.Parallel()
		idToken := buildFakeIDToken(t, baseClaims())
		identity, err := p.VerifyIDToken(context.Background(), &moniqooidc.TokenSet{IDToken: idToken}, "expected-nonce")
		require.NoError(t, err)

		assert.Equal(t, "google", identity.Provider)
		assert.Equal(t, "google-subject-1", identity.Subject)
		assert.Equal(t, "user@example.com", identity.Email)
		assert.True(t, identity.EmailVerified)
		assert.Equal(t, "Test User", identity.Name)
		assert.Equal(t, "https://example.com/pic.png", identity.Picture)
	})

	t.Run("wrong issuer is rejected", func(t *testing.T) {
		t.Parallel()
		claims := baseClaims()
		claims["iss"] = "https://not-the-issuer.test"
		idToken := buildFakeIDToken(t, claims)

		_, err := p.VerifyIDToken(context.Background(), &moniqooidc.TokenSet{IDToken: idToken}, "expected-nonce")
		require.Error(t, err)
	})

	t.Run("wrong audience is rejected", func(t *testing.T) {
		t.Parallel()
		claims := baseClaims()
		claims["aud"] = "someone-elses-client-id"
		idToken := buildFakeIDToken(t, claims)

		_, err := p.VerifyIDToken(context.Background(), &moniqooidc.TokenSet{IDToken: idToken}, "expected-nonce")
		require.Error(t, err)
	})

	t.Run("expired token is rejected", func(t *testing.T) {
		t.Parallel()
		claims := baseClaims()
		claims["exp"] = time.Now().Add(-time.Hour).Unix()
		idToken := buildFakeIDToken(t, claims)

		_, err := p.VerifyIDToken(context.Background(), &moniqooidc.TokenSet{IDToken: idToken}, "expected-nonce")
		require.Error(t, err)
	})

	t.Run("nonce mismatch is rejected", func(t *testing.T) {
		t.Parallel()
		idToken := buildFakeIDToken(t, baseClaims())

		_, err := p.VerifyIDToken(context.Background(), &moniqooidc.TokenSet{IDToken: idToken}, "a-different-nonce")
		require.Error(t, err)
	})

	t.Run("unverified email is passed through faithfully, not silently upgraded", func(t *testing.T) {
		t.Parallel()
		claims := baseClaims()
		claims["email_verified"] = false
		idToken := buildFakeIDToken(t, claims)

		identity, err := p.VerifyIDToken(context.Background(), &moniqooidc.TokenSet{IDToken: idToken}, "expected-nonce")
		require.NoError(t, err)
		assert.False(t, identity.EmailVerified)
	})
}
