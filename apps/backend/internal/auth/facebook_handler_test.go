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

func newFacebookLoginCtx(e *echo.Echo, body string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/facebook/login", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, "application/json")
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func newFacebookLinkCtx(e *echo.Echo, body string, user *models.User) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/facebook/link", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, "application/json")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if user != nil {
		auth.SetUserInContext(c, user)
	}
	return c, rec
}

func TestFacebookHandler_Login(t *testing.T) {
	t.Parallel()
	e := echo.New()

	t.Run("missing access_token is a validation error", func(t *testing.T) {
		t.Parallel()
		h := auth.NewFacebookHandler(&mock.FacebookService{}, zap.NewNop(), true)

		c, rec := newFacebookLoginCtx(e, `{}`)
		require.NoError(t, h.Login(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("success returns an access token and sets the refresh cookie", func(t *testing.T) {
		t.Parallel()
		svc := &mock.FacebookService{
			LoginWithFacebookTokenFn: func(_ context.Context, accessToken, intent string) (auth.OIDCCallbackResult, error) {
				assert.Equal(t, "fb-access-token", accessToken)
				assert.Equal(t, "login", intent)
				return auth.OIDCCallbackResult{
					AccessToken:           "moniqo-access-token",
					RefreshToken:          "moniqo-refresh-token",
					RefreshTokenExpiresAt: time.Now().Add(time.Hour),
				}, nil
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLoginCtx(e, `{"access_token":"fb-access-token"}`)
		require.NoError(t, h.Login(c))

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), "moniqo-access-token")

		cookies := rec.Result().Cookies()
		require.Len(t, cookies, 1)
		assert.Equal(t, "moniqo_refresh", cookies[0].Name)
		assert.True(t, cookies[0].HttpOnly)
		assert.True(t, cookies[0].Secure)
	})

	t.Run("signup intent is forwarded, anything else defaults to login", func(t *testing.T) {
		t.Parallel()
		var gotIntent string
		svc := &mock.FacebookService{
			LoginWithFacebookTokenFn: func(_ context.Context, _ string, intent string) (auth.OIDCCallbackResult, error) {
				gotIntent = intent
				return auth.OIDCCallbackResult{}, nil
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLoginCtx(e, `{"access_token":"t","intent":"garbage"}`)
		require.NoError(t, h.Login(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "login", gotIntent)

		c, rec = newFacebookLoginCtx(e, `{"access_token":"t","intent":"signup"}`)
		require.NoError(t, h.Login(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "signup", gotIntent)
	})

	t.Run("no account found for login intent is unauthorized, not created", func(t *testing.T) {
		t.Parallel()
		svc := &mock.FacebookService{
			LoginWithFacebookTokenFn: func(context.Context, string, string) (auth.OIDCCallbackResult, error) {
				return auth.OIDCCallbackResult{}, auth.ErrAccountNotFound
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLoginCtx(e, `{"access_token":"t"}`)
		require.NoError(t, h.Login(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("unverified identity is a bad request", func(t *testing.T) {
		t.Parallel()
		svc := &mock.FacebookService{
			LoginWithFacebookTokenFn: func(context.Context, string, string) (auth.OIDCCallbackResult, error) {
				return auth.OIDCCallbackResult{}, auth.ErrIdentityNotVerified
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLoginCtx(e, `{"access_token":"t"}`)
		require.NoError(t, h.Login(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("unconfigured facebook is not found", func(t *testing.T) {
		t.Parallel()
		svc := &mock.FacebookService{
			LoginWithFacebookTokenFn: func(context.Context, string, string) (auth.OIDCCallbackResult, error) {
				return auth.OIDCCallbackResult{}, auth.ErrUnknownProvider
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLoginCtx(e, `{"access_token":"t"}`)
		require.NoError(t, h.Login(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})
}

func TestFacebookHandler_Link(t *testing.T) {
	t.Parallel()
	e := echo.New()

	t.Run("requires authentication", func(t *testing.T) {
		t.Parallel()
		h := auth.NewFacebookHandler(&mock.FacebookService{}, zap.NewNop(), true)

		c, rec := newFacebookLinkCtx(e, `{"access_token":"t"}`, nil)
		require.NoError(t, h.Link(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("missing access_token is a validation error", func(t *testing.T) {
		t.Parallel()
		h := auth.NewFacebookHandler(&mock.FacebookService{}, zap.NewNop(), true)

		c, rec := newFacebookLinkCtx(e, `{}`, &models.User{ID: 1})
		require.NoError(t, h.Link(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("success links the identity", func(t *testing.T) {
		t.Parallel()
		svc := &mock.FacebookService{
			LinkFacebookTokenFn: func(_ context.Context, userID int64, accessToken string) error {
				assert.Equal(t, int64(1), userID)
				assert.Equal(t, "fb-access-token", accessToken)
				return nil
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLinkCtx(e, `{"access_token":"fb-access-token"}`, &models.User{ID: 1})
		require.NoError(t, h.Link(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("email already linked to another account is a conflict", func(t *testing.T) {
		t.Parallel()
		svc := &mock.FacebookService{
			LinkFacebookTokenFn: func(context.Context, int64, string) error {
				return auth.ErrEmailAlreadyExists
			},
		}
		h := auth.NewFacebookHandler(svc, zap.NewNop(), true)

		c, rec := newFacebookLinkCtx(e, `{"access_token":"t"}`, &models.User{ID: 1})
		require.NoError(t, h.Link(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})
}
