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
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// FacebookService is the service contract required by FacebookHandler. It is
// a separate, narrower interface from OIDCService — deliberately: extending
// OIDCService itself would stop mock.OIDCService (a hand-written test
// double) from satisfying it, breaking every existing OIDC handler test for
// a feature they don't exercise.
type FacebookService interface {
	LoginWithFacebookToken(ctx context.Context, accessToken, intent string) (OIDCCallbackResult, error)
	LinkFacebookToken(ctx context.Context, userID int64, accessToken string) error
}

// FacebookLoginRequest is the body of POST /api/v1/auth/facebook/login.
type FacebookLoginRequest struct {
	AccessToken string `json:"access_token"`
	Intent      string `json:"intent"`
}

// FacebookLinkRequest is the body of POST /api/v1/auth/facebook/link.
type FacebookLinkRequest struct {
	AccessToken string `json:"access_token"`
}

// FacebookHandler holds HTTP handlers for the Facebook token login/link
// endpoints. Unlike OIDCHandler's redirect-based Callback, both endpoints
// here are plain JSON POSTs — there is no browser navigation to redirect,
// since the access token was obtained client-side via the Facebook JS SDK.
type FacebookHandler struct {
	svc          FacebookService
	log          *zap.Logger
	secureCookie bool
}

// NewFacebookHandler returns a FacebookHandler wired to the given service.
func NewFacebookHandler(svc FacebookService, log *zap.Logger, secureCookie bool) *FacebookHandler {
	return &FacebookHandler{svc: svc, log: log, secureCookie: secureCookie}
}

// Login handles POST /api/v1/auth/facebook/login. On success it returns the
// same session shape as password login (internal/auth/auth_handler.go):
// access token in the JSON body, refresh token in an HttpOnly cookie.
func (h *FacebookHandler) Login(c echo.Context) error {
	var req FacebookLoginRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: invalidBodyField, Error: invalidJSONMsg}})
	}
	if req.AccessToken == "" {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "access_token", Error: "required"}})
	}

	intent := oidcIntentLogin
	if req.Intent == oidcIntentSignup {
		intent = oidcIntentSignup
	}

	result, err := h.svc.LoginWithFacebookToken(c.Request().Context(), req.AccessToken, intent)
	if err != nil {
		return h.mapLoginError(c, err)
	}

	h.setRefreshCookie(c, result.RefreshToken, result.RefreshTokenExpiresAt)
	return httpx.OK(c, LoginResponseData{AccessToken: result.AccessToken, TokenType: bearerTokenType}, "login successful")
}

// Link handles POST /api/v1/auth/facebook/link. Requires JWT auth.
func (h *FacebookHandler) Link(c echo.Context) error {
	user, ok := UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, unauthorizedMsg)
	}

	var req FacebookLinkRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: invalidBodyField, Error: invalidJSONMsg}})
	}
	if req.AccessToken == "" {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "access_token", Error: "required"}})
	}

	if err := h.svc.LinkFacebookToken(c.Request().Context(), user.ID, req.AccessToken); err != nil {
		return h.mapLinkError(c, user.ID, err)
	}
	return httpx.OK(c, nil, "identity linked")
}

func (h *FacebookHandler) mapLinkError(c echo.Context, userID int64, err error) error {
	switch {
	case errors.Is(err, ErrIdentityNotVerified):
		return httpx.BadRequest(c, "facebook did not report a confirmed email for this account")
	case errors.Is(err, ErrEmailAlreadyExists):
		return httpx.Conflict(c, "email already linked to another account")
	case errors.Is(err, ErrIdentityAlreadyLinked):
		return httpx.Conflict(c, "identity already linked to another account")
	case errors.Is(err, ErrTokenExchangeFailed):
		return httpx.BadRequest(c, "could not verify facebook access token")
	case errors.Is(err, ErrUnknownProvider):
		return httpx.NotFound(c, "unknown identity provider")
	default:
		h.log.Error("facebook link failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}
}

func (h *FacebookHandler) mapLoginError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, ErrAccountNotFound):
		return httpx.Unauthorized(c, "no account found for this identity")
	case errors.Is(err, ErrIdentityNotVerified):
		return httpx.BadRequest(c, "facebook did not report a confirmed email for this account")
	case errors.Is(err, ErrTokenExchangeFailed):
		return httpx.BadRequest(c, "could not verify facebook access token")
	case errors.Is(err, ErrUnknownProvider):
		return httpx.NotFound(c, "unknown identity provider")
	default:
		h.log.Error("facebook login failed", zap.Error(err))
		return httpx.InternalError(c)
	}
}

func (h *FacebookHandler) setRefreshCookie(c echo.Context, raw string, expiresAt time.Time) {
	c.SetCookie(&http.Cookie{ //nolint:gosec // Secure is configurable; HttpOnly and SameSite are always set
		Name:     refreshCookieName,
		Value:    raw,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   int(time.Until(expiresAt).Seconds()),
	})
}
