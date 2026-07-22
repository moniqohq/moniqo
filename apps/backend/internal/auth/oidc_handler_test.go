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
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func newOIDCLoginCtx(e *echo.Echo, provider string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/login/"+provider, nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("provider")
	c.SetParamValues(provider)
	return c, rec
}

func newOIDCCallbackGetCtx(e *echo.Echo, provider, code, state, cookieValue string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/callback/"+provider+"?code="+code+"&state="+state, nil)
	if cookieValue != "" {
		req.AddCookie(&http.Cookie{Name: auth.OIDCFlowCookieName, Value: cookieValue})
	}
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("provider")
	c.SetParamValues(provider)
	return c, rec
}

func newOIDCCallbackPostCtx(e *echo.Echo, provider, code, state, cookieValue string) (echo.Context, *httptest.ResponseRecorder) {
	form := url.Values{"code": {code}, "state": {state}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/callback/"+provider, strings.NewReader(form.Encode()))
	req.Header.Set(echo.HeaderContentType, "application/x-www-form-urlencoded")
	if cookieValue != "" {
		req.AddCookie(&http.Cookie{Name: auth.OIDCFlowCookieName, Value: cookieValue})
	}
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("provider")
	c.SetParamValues(provider)
	return c, rec
}

func newOIDCUnlinkCtx(e *echo.Echo, provider string, user *models.User) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/auth/link/"+provider, nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("provider")
	c.SetParamValues(provider)
	if user != nil {
		auth.SetUserInContext(c, user)
	}
	return c, rec
}

func TestOIDCHandler_LoginRedirect(t *testing.T) {
	t.Parallel()
	e := echo.New()

	t.Run("success sets the flow cookie and redirects to the provider", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			InitiateLoginFn: func(providerName string) (string, string, error) {
				return "https://accounts.google.com/auth?x=1", "signed-flow-token", nil
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCLoginCtx(e, "google")
		require.NoError(t, h.LoginRedirect(c))

		assert.Equal(t, http.StatusFound, rec.Code)
		assert.Equal(t, "https://accounts.google.com/auth?x=1", rec.Header().Get("Location"))

		cookies := rec.Result().Cookies()
		require.Len(t, cookies, 1)
		assert.Equal(t, auth.OIDCFlowCookieName, cookies[0].Name)
		assert.Equal(t, "signed-flow-token", cookies[0].Value)
		assert.True(t, cookies[0].HttpOnly)
	})

	t.Run("unknown provider redirects to the generic failure page, not JSON", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			InitiateLoginFn: func(providerName string) (string, string, error) {
				return "", "", auth.ErrUnknownProvider
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCLoginCtx(e, "bogus")
		require.NoError(t, h.LoginRedirect(c))

		assert.Equal(t, http.StatusFound, rec.Code)
		assert.Equal(t, "https://app.moniqo.in/login?error=oauth_failed", rec.Header().Get("Location"))
	})
}

func TestOIDCHandler_Callback(t *testing.T) {
	t.Parallel()
	e := echo.New()

	t.Run("GET query params reach the service", func(t *testing.T) {
		t.Parallel()
		var gotCode, gotState, gotCookie string
		svc := &mock.OIDCService{
			CallbackFn: func(_ context.Context, providerName, code, stateParam, flowCookieRaw string) (auth.OIDCCallbackResult, error) {
				gotCode, gotState, gotCookie = code, stateParam, flowCookieRaw
				return auth.OIDCCallbackResult{Purpose: auth.OIDCPurposeLogin, AccessToken: "at", RefreshToken: "rt", RefreshTokenExpiresAt: time.Now().Add(time.Hour)}, nil
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCCallbackGetCtx(e, "google", "the-code", "the-state", "the-cookie")
		require.NoError(t, h.Callback(c))

		assert.Equal(t, "the-code", gotCode)
		assert.Equal(t, "the-state", gotState)
		assert.Equal(t, "the-cookie", gotCookie)
		assert.Equal(t, http.StatusFound, rec.Code)
		assert.Contains(t, rec.Header().Get("Location"), "#access_token=at")
	})

	t.Run("POST form body (Apple form_post) reaches the service identically", func(t *testing.T) {
		t.Parallel()
		var gotCode, gotState string
		svc := &mock.OIDCService{
			CallbackFn: func(_ context.Context, providerName, code, stateParam, flowCookieRaw string) (auth.OIDCCallbackResult, error) {
				gotCode, gotState = code, stateParam
				return auth.OIDCCallbackResult{Purpose: auth.OIDCPurposeLogin, AccessToken: "at2"}, nil
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCCallbackPostCtx(e, "apple", "apple-code", "apple-state", "apple-cookie")
		require.NoError(t, h.Callback(c))

		assert.Equal(t, "apple-code", gotCode)
		assert.Equal(t, "apple-state", gotState)
		assert.Equal(t, http.StatusFound, rec.Code)
		assert.Contains(t, rec.Header().Get("Location"), "#access_token=at2")
	})

	t.Run("the flow cookie is always cleared, even on failure", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			CallbackFn: func(context.Context, string, string, string, string) (auth.OIDCCallbackResult, error) {
				return auth.OIDCCallbackResult{}, auth.ErrInvalidState
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCCallbackGetCtx(e, "google", "code", "state", "stale-cookie")
		require.NoError(t, h.Callback(c))

		assert.Equal(t, http.StatusFound, rec.Code)
		assert.Equal(t, "https://app.moniqo.in/login?error=oauth_failed", rec.Header().Get("Location"))

		cookies := rec.Result().Cookies()
		require.Len(t, cookies, 1)
		assert.Equal(t, auth.OIDCFlowCookieName, cookies[0].Name)
		assert.Equal(t, -1, cookies[0].MaxAge)
	})

	t.Run("link purpose redirects to the connections page without setting a refresh cookie", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			CallbackFn: func(context.Context, string, string, string, string) (auth.OIDCCallbackResult, error) {
				return auth.OIDCCallbackResult{Purpose: auth.OIDCPurposeLink}, nil
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCCallbackGetCtx(e, "google", "code", "state", "cookie")
		require.NoError(t, h.Callback(c))

		assert.Contains(t, rec.Header().Get("Location"), "/settings/connections?linked=google")
	})
}

func TestOIDCHandler_ListIdentities(t *testing.T) {
	t.Parallel()
	e := echo.New()

	newListCtx := func(user *models.User) (echo.Context, *httptest.ResponseRecorder) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/identities", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		if user != nil {
			auth.SetUserInContext(c, user)
		}
		return c, rec
	}

	t.Run("requires authentication", func(t *testing.T) {
		t.Parallel()
		h := auth.NewOIDCHandler(&mock.OIDCService{}, zap.NewNop(), true, "https://app.moniqo.in")
		c, rec := newListCtx(nil)
		require.NoError(t, h.ListIdentities(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("returns the linked identities", func(t *testing.T) {
		t.Parallel()
		linkedAt := time.Now()
		svc := &mock.OIDCService{
			ListIdentitiesFn: func(context.Context, int64) ([]auth.UserIdentity, error) {
				return []auth.UserIdentity{{Provider: "google", CreatedAt: linkedAt}}, nil
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newListCtx(&models.User{ID: 1})
		require.NoError(t, h.ListIdentities(c))

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), `"provider":"google"`)
	})

	t.Run("empty list is 200 with an empty array, never 404", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			ListIdentitiesFn: func(context.Context, int64) ([]auth.UserIdentity, error) {
				return nil, nil
			},
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newListCtx(&models.User{ID: 1})
		require.NoError(t, h.ListIdentities(c))

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), `"data":[]`)
	})
}

func TestOIDCHandler_Unlink(t *testing.T) {
	t.Parallel()
	e := echo.New()

	t.Run("requires authentication", func(t *testing.T) {
		t.Parallel()
		h := auth.NewOIDCHandler(&mock.OIDCService{}, zap.NewNop(), true, "https://app.moniqo.in")
		c, rec := newOIDCUnlinkCtx(e, "google", nil)
		require.NoError(t, h.Unlink(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("last credential maps to 409", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			UnlinkFn: func(context.Context, int64, string) error { return auth.ErrLastCredential },
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCUnlinkCtx(e, "google", &models.User{ID: 1})
		require.NoError(t, h.Unlink(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &mock.OIDCService{
			UnlinkFn: func(context.Context, int64, string) error { return nil },
		}
		h := auth.NewOIDCHandler(svc, zap.NewNop(), true, "https://app.moniqo.in")

		c, rec := newOIDCUnlinkCtx(e, "google", &models.User{ID: 1})
		require.NoError(t, h.Unlink(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})
}
