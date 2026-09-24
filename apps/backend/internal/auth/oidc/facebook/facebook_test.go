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

package facebook_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc/facebook"
)

const testAppSecret = "super-secret-app-secret-do-not-leak"

// fakeGraphServer stands in for graph.facebook.com. debugToken and me are
// canned JSON bodies (or a func for the rare non-200 case); tests set the
// fields they care about and leave the rest at their zero value.
type fakeGraphServer struct {
	debugTokenStatus int
	debugTokenBody   string
	meStatus         int
	meBody           string
}

func (f *fakeGraphServer) start(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/debug_token"):
			w.WriteHeader(f.debugTokenStatus)
			_, _ = w.Write([]byte(f.debugTokenBody))
		case strings.HasPrefix(r.URL.Path, "/me"):
			assert.Equal(t, "Bearer user-access-token", r.Header.Get("Authorization"))
			w.WriteHeader(f.meStatus)
			_, _ = w.Write([]byte(f.meBody))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

func newVerifierAgainst(t *testing.T, srv *httptest.Server) *facebook.Verifier {
	t.Helper()
	v := facebook.New(facebook.Config{ClientID: "our-app-id", ClientSecret: testAppSecret})
	facebook.SetGraphBaseURLForTest(v, srv.URL)
	return v
}

func TestVerifier_VerifyAccessToken(t *testing.T) {
	t.Parallel()

	t.Run("happy path resolves a verified identity", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"our-app-id","type":"USER","is_valid":true,"user_id":"fb-user-1","expires_at":9999999999}}`,
			meStatus:         http.StatusOK,
			meBody:           `{"id":"fb-user-1","name":"Ada Lovelace","email":"ada@example.com","picture":{"data":{"url":"https://example.com/pic.jpg"}}}`,
		}).start(t)
		defer srv.Close()

		identity, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		require.NoError(t, err)
		assert.Equal(t, "facebook", identity.Provider)
		assert.Equal(t, "fb-user-1", identity.Subject)
		assert.Equal(t, "ada@example.com", identity.Email)
		assert.True(t, identity.EmailVerified)
		assert.Equal(t, "Ada Lovelace", identity.Name)
	})

	t.Run("token minted for a different app is rejected", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"someone-elses-app-id","type":"USER","is_valid":true,"user_id":"fb-user-1","expires_at":9999999999}}`,
		}).start(t)
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		require.Error(t, err)
		assert.ErrorIs(t, err, facebook.ErrTokenInvalid)
	})

	t.Run("is_valid false is rejected", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"our-app-id","type":"USER","is_valid":false,"user_id":"fb-user-1","expires_at":9999999999}}`,
		}).start(t)
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		assert.ErrorIs(t, err, facebook.ErrTokenInvalid)
	})

	t.Run("an app or page token (not type USER) is rejected", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"our-app-id","type":"PAGE","is_valid":true,"user_id":"fb-user-1","expires_at":9999999999}}`,
		}).start(t)
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		assert.ErrorIs(t, err, facebook.ErrTokenInvalid)
	})

	t.Run("a never-expiring token is rejected", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"our-app-id","type":"USER","is_valid":true,"user_id":"fb-user-1","expires_at":0}}`,
		}).start(t)
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		assert.ErrorIs(t, err, facebook.ErrTokenInvalid)
	})

	t.Run("debug_token error response is rejected before decoding data", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusBadRequest,
			debugTokenBody:   `{"error":{"message":"Invalid OAuth access token.","type":"OAuthException","code":190}}`,
		}).start(t)
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		assert.ErrorIs(t, err, facebook.ErrTokenInvalid)
	})

	t.Run("mismatched profile id is rejected", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"our-app-id","type":"USER","is_valid":true,"user_id":"fb-user-1","expires_at":9999999999}}`,
			meStatus:         http.StatusOK,
			meBody:           `{"id":"a-different-user-id","name":"Eve","email":"eve@example.com"}`,
		}).start(t)
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		assert.ErrorIs(t, err, facebook.ErrProfileMismatch)
	})

	t.Run("no email means EmailVerified is false, not an error", func(t *testing.T) {
		t.Parallel()
		srv := (&fakeGraphServer{
			debugTokenStatus: http.StatusOK,
			debugTokenBody:   `{"data":{"app_id":"our-app-id","type":"USER","is_valid":true,"user_id":"fb-user-1","expires_at":9999999999}}`,
			meStatus:         http.StatusOK,
			meBody:           `{"id":"fb-user-1","name":"No Email"}`,
		}).start(t)
		defer srv.Close()

		identity, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		require.NoError(t, err)
		assert.Empty(t, identity.Email)
		assert.False(t, identity.EmailVerified)
	})

	t.Run("no error message ever contains the app secret", func(t *testing.T) {
		t.Parallel()
		// A server that hangs up mid-response forces httpClient.Do to return
		// a *url.Error, whose message embeds the full request URL —
		// including "access_token=<app_id>|<app_secret>" for debug_token.
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			hj, ok := w.(http.Hijacker)
			require.True(t, ok)
			conn, _, err := hj.Hijack()
			require.NoError(t, err)
			_ = conn.Close()
		}))
		defer srv.Close()

		_, err := newVerifierAgainst(t, srv).VerifyAccessToken(context.Background(), "user-access-token")
		require.Error(t, err)
		assert.NotContains(t, err.Error(), testAppSecret)
	})
}
