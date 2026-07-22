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

// oidc_flow_test.go drives the complete OIDC login and link flows end-to-end
// through a real Echo router, real OIDCSvc/OIDCHandler, and a real
// oidc.Registry — the only test doubles are the repositories and the
// IdentityProvider itself (which stands in for the network call to an
// external IdP). This is the "integration test covering the complete login
// flow" from the spec, built the way this codebase already tests everything
// else: no real Postgres, no testcontainers.
package auth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// buildOIDCTestServer wires a real Echo router with real OIDCSvc/OIDCHandler
// against a real oidc.Registry holding the given fake provider, backed by
// mocked repositories.
func buildOIDCTestServer(t *testing.T, provider oidc.IdentityProvider, oidcRepo auth.OIDCRepository, authRepo auth.Repository) *echo.Echo {
	t.Helper()
	log := zap.NewNop()

	registry := oidc.NewRegistry()
	registry.Register(provider)

	authSvc := auth.NewSvc(authRepo, testSecret, oidcTestAccessTTL, oidcTestRefreshTTL, oidcTestRefreshMaxAge, log)
	oidcSvc := auth.NewOIDCSvc(oidcRepo, registry, authSvc, []byte("flow-test-state-secret"), log)
	oidcHandler := auth.NewOIDCHandler(oidcSvc, log, false, "https://app.moniqo.in")

	e := echo.New()
	e.GET("/api/v1/auth/login/:provider", oidcHandler.LoginRedirect)
	e.GET("/api/v1/auth/callback/:provider", oidcHandler.Callback)
	e.POST("/api/v1/auth/callback/:provider", oidcHandler.Callback)
	e.POST("/api/v1/auth/link/:provider", func(c echo.Context) error {
		auth.SetUserInContext(c, &models.User{ID: oidcTestLinkUserID})
		return oidcHandler.Link(c)
	})
	e.DELETE("/api/v1/auth/link/:provider", func(c echo.Context) error {
		auth.SetUserInContext(c, &models.User{ID: oidcTestLinkUserID})
		return oidcHandler.Unlink(c)
	})
	return e
}

const (
	oidcTestAccessTTL     = 15 * time.Minute
	oidcTestRefreshTTL    = 168 * time.Hour
	oidcTestRefreshMaxAge = 720 * time.Hour
	oidcTestLinkUserID    = int64(5)
)

func fakeIdentityProviderForFlow(name string, identity oidc.Identity) *internalmock.IdentityProvider {
	return &internalmock.IdentityProvider{
		NameFn: func() string { return name },
		AuthURLFn: func(state, nonce, codeChallenge string) (string, error) {
			return "https://" + name + ".test/authorize?state=" + state, nil
		},
		ExchangeFn: func(context.Context, string, string) (*oidc.TokenSet, error) {
			return &oidc.TokenSet{IDToken: "fake-id-token"}, nil
		},
		VerifyIDTokenFn: func(context.Context, *oidc.TokenSet, string) (*oidc.Identity, error) {
			id := identity
			return &id, nil
		},
	}
}

func TestOIDCFlow_Login_EndToEnd(t *testing.T) {
	t.Parallel()

	identity := oidc.Identity{Subject: "flow-sub-1", Email: "flowuser@example.com", EmailVerified: true, Name: "Flow User"}
	provider := fakeIdentityProviderForFlow("google", identity)

	oidcRepo := &internalmock.OIDCRepository{}
	oidcRepo.On("GetIdentityByProviderSubject", "google", "flow-sub-1").
		Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
	oidcRepo.On("GetUserByEmailForLinking", "flowuser@example.com").
		Return(auth.LinkableUser{}, auth.ErrUserNotFound)
	oidcRepo.On("CreateUserFromIdentity", mock.Anything).
		Return(models.User{ID: 30, Email: "flowuser@example.com"}, nil)

	authRepo := &internalmock.AuthRepository{}
	authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
	authRepo.On("UpdateLastLogin", int64(30)).Return(nil)

	e := buildOIDCTestServer(t, provider, oidcRepo, authRepo)

	// Step 1: GET /login/google — expect a redirect to the (fake) IdP and a
	// signed flow-state cookie.
	loginReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/login/google", nil)
	loginRec := httptest.NewRecorder()
	e.ServeHTTP(loginRec, loginReq)

	require.Equal(t, http.StatusFound, loginRec.Code)
	location, err := url.Parse(loginRec.Header().Get("Location"))
	require.NoError(t, err)
	state := location.Query().Get("state")
	require.NotEmpty(t, state)

	flowCookies := loginRec.Result().Cookies()
	require.Len(t, flowCookies, 1)
	require.Equal(t, auth.OIDCFlowCookieName, flowCookies[0].Name)

	// Step 2: simulate the IdP's redirect back — GET /callback/google with
	// the captured state and the flow cookie the browser would send back.
	callbackReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/callback/google?code=fake-code&state="+state, nil)
	callbackReq.AddCookie(flowCookies[0])
	callbackRec := httptest.NewRecorder()
	e.ServeHTTP(callbackRec, callbackReq)

	assert.Equal(t, http.StatusFound, callbackRec.Code)
	assert.Contains(t, callbackRec.Header().Get("Location"), "https://app.moniqo.in/oauth/callback#access_token=")

	oidcRepo.AssertCalled(t, "CreateUserFromIdentity", mock.Anything)

	// The flow cookie must be cleared on the way out.
	respCookies := callbackRec.Result().Cookies()
	var clearedFlow bool
	for _, c := range respCookies {
		if c.Name == auth.OIDCFlowCookieName {
			clearedFlow = c.MaxAge < 0
		}
	}
	assert.True(t, clearedFlow, "flow cookie must be cleared on callback")
}

func TestOIDCFlow_Link_EndToEnd(t *testing.T) {
	t.Parallel()

	identity := oidc.Identity{Subject: "flow-sub-2", Email: "linkuser@example.com", EmailVerified: true}
	provider := fakeIdentityProviderForFlow("google", identity)

	oidcRepo := &internalmock.OIDCRepository{}
	oidcRepo.On("GetIdentityByProviderSubject", "google", "flow-sub-2").
		Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
	oidcRepo.On("GetUserByEmailForLinking", "linkuser@example.com").
		Return(auth.LinkableUser{}, auth.ErrUserNotFound)
	oidcRepo.On("LinkIdentity", oidcTestLinkUserID, "google", "flow-sub-2", "linkuser@example.com").
		Return(nil)

	e := buildOIDCTestServer(t, provider, oidcRepo, &internalmock.AuthRepository{})

	// Step 1: POST /link/google as an authenticated user.
	linkReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/link/google", nil)
	linkRec := httptest.NewRecorder()
	e.ServeHTTP(linkRec, linkReq)

	require.Equal(t, http.StatusFound, linkRec.Code)
	location, err := url.Parse(linkRec.Header().Get("Location"))
	require.NoError(t, err)
	state := location.Query().Get("state")
	require.NotEmpty(t, state)

	flowCookies := linkRec.Result().Cookies()
	require.Len(t, flowCookies, 1)

	// Step 2: the IdP redirects back to the callback.
	callbackReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/callback/google?code=fake-code&state="+state, nil)
	callbackReq.AddCookie(flowCookies[0])
	callbackRec := httptest.NewRecorder()
	e.ServeHTTP(callbackRec, callbackReq)

	assert.Equal(t, http.StatusFound, callbackRec.Code)
	assert.Contains(t, callbackRec.Header().Get("Location"), "/settings/connections?linked=google")
	oidcRepo.AssertCalled(t, "LinkIdentity", oidcTestLinkUserID, "google", "flow-sub-2", "linkuser@example.com")
	// The login-specific path (creating a new user) must never fire for a link flow.
	oidcRepo.AssertNotCalled(t, "CreateUserFromIdentity", mock.Anything)
}

func TestOIDCFlow_Unlink_EndToEnd(t *testing.T) {
	t.Parallel()

	provider := fakeIdentityProviderForFlow("google", oidc.Identity{})

	oidcRepo := &internalmock.OIDCRepository{}
	oidcRepo.On("CountIdentitiesAndHash", oidcTestLinkUserID).Return(2, false, nil)
	oidcRepo.On("UnlinkIdentity", oidcTestLinkUserID, "google").Return(nil)

	e := buildOIDCTestServer(t, provider, oidcRepo, &internalmock.AuthRepository{})

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/auth/link/google", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	oidcRepo.AssertCalled(t, "UnlinkIdentity", oidcTestLinkUserID, "google")
}
