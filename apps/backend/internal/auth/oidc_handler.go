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
	"net/url"
	"time"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// OIDCService is the service contract required by OIDCHandler.
type OIDCService interface {
	InitiateLogin(providerName string) (redirectURL, flowToken string, err error)
	InitiateLink(providerName string, userID int64) (redirectURL, flowToken string, err error)
	Callback(ctx context.Context, providerName, code, stateParam, flowCookieRaw string) (OIDCCallbackResult, error)
	ListIdentities(ctx context.Context, userID int64) ([]UserIdentity, error)
	Unlink(ctx context.Context, userID int64, providerName string) error
}

// IdentityResponse is the public representation of a linked identity —
// deliberately omits provider_subject and provider_email, neither of which
// the frontend needs to render a linked-accounts list.
type IdentityResponse struct {
	Provider string    `json:"provider"`
	LinkedAt time.Time `json:"linked_at"`
}

// OIDCHandler holds HTTP handlers for the OIDC login/link/unlink endpoints.
type OIDCHandler struct {
	svc          OIDCService
	log          *zap.Logger
	secureCookie bool
	appBaseURL   string
}

// NewOIDCHandler returns an OIDCHandler wired to the given service.
func NewOIDCHandler(svc OIDCService, log *zap.Logger, secureCookie bool, appBaseURL string) *OIDCHandler {
	return &OIDCHandler{svc: svc, log: log, secureCookie: secureCookie, appBaseURL: appBaseURL}
}

// LoginRedirect handles GET /api/v1/auth/login/:provider. It always
// redirects, either to the identity provider (success) or to the frontend
// login page with a generic error (unknown/unconfigured provider).
func (h *OIDCHandler) LoginRedirect(c echo.Context) error {
	provider := c.Param("provider")

	redirectURL, flowToken, err := h.svc.InitiateLogin(provider)
	if err != nil {
		h.log.Debug("oidc login initiation failed", zap.String("provider", provider), zap.Error(err))
		return c.Redirect(http.StatusFound, h.failureRedirect())
	}

	h.setFlowCookie(c, flowToken)
	return c.Redirect(http.StatusFound, redirectURL)
}

// Link handles POST /api/v1/auth/link/:provider. Requires JWT auth — the
// authenticated user's ID is carried through the flow cookie so Callback
// knows which account to link the identity to.
func (h *OIDCHandler) Link(c echo.Context) error {
	provider := c.Param("provider")

	user, ok := UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, unauthorizedMsg)
	}

	redirectURL, flowToken, err := h.svc.InitiateLink(provider, user.ID)
	if errors.Is(err, ErrUnknownProvider) {
		return httpx.NotFound(c, "unknown identity provider")
	}
	if err != nil {
		h.log.Error("oidc link initiation failed", zap.Int64("user_id", user.ID), zap.String("provider", provider), zap.Error(err))
		return httpx.InternalError(c)
	}

	h.setFlowCookie(c, flowToken)
	return c.Redirect(http.StatusFound, redirectURL)
}

// Callback handles GET and POST /api/v1/auth/callback/:provider. This is the
// one endpoint in the API that never returns the httpx JSON envelope: it is
// reached via a top-level browser navigation (the identity provider's
// redirect), so every outcome — success or any sentinel error — is an HTTP
// redirect. Failures always redirect to a generic error page; the specific
// cause is only logged, never exposed.
func (h *OIDCHandler) Callback(c echo.Context) error {
	provider := c.Param("provider")
	code := c.FormValue("code")
	state := c.FormValue("state")

	flowCookieRaw := h.readAndClearFlowCookie(c)

	result, err := h.svc.Callback(c.Request().Context(), provider, code, state, flowCookieRaw)
	if err != nil {
		h.log.Debug("oidc callback failed", zap.String("provider", provider), zap.Error(err))
		return c.Redirect(http.StatusFound, h.failureRedirect())
	}

	if result.Purpose == oidcPurposeLink {
		return c.Redirect(http.StatusFound, h.appBaseURL+"/settings/connections?linked="+url.QueryEscape(provider))
	}

	h.setRefreshCookie(c, result.RefreshToken, result.RefreshTokenExpiresAt)
	return c.Redirect(http.StatusFound, h.appBaseURL+"/oauth/callback#access_token="+url.QueryEscape(result.AccessToken))
}

// ListIdentities handles GET /api/v1/auth/identities. Requires JWT auth.
func (h *OIDCHandler) ListIdentities(c echo.Context) error {
	user, ok := UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, unauthorizedMsg)
	}

	identities, err := h.svc.ListIdentities(c.Request().Context(), user.ID)
	if err != nil {
		h.log.Error("oidc list identities failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	resp := make([]IdentityResponse, 0, len(identities))
	for _, id := range identities {
		resp = append(resp, IdentityResponse{Provider: id.Provider, LinkedAt: id.CreatedAt})
	}
	return httpx.OK(c, resp, "identities retrieved")
}

// Unlink handles DELETE /api/v1/auth/link/:provider. Requires JWT auth.
func (h *OIDCHandler) Unlink(c echo.Context) error {
	provider := c.Param("provider")

	user, ok := UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, unauthorizedMsg)
	}

	err := h.svc.Unlink(c.Request().Context(), user.ID, provider)
	switch {
	case err == nil:
		return httpx.OK(c, nil, "identity unlinked")
	case errors.Is(err, ErrLastCredential):
		return httpx.Conflict(c, "cannot remove your only sign-in method")
	case errors.Is(err, ErrUnknownProvider):
		return httpx.NotFound(c, "unknown identity provider")
	default:
		h.log.Error("oidc unlink failed", zap.Int64("user_id", user.ID), zap.String("provider", provider), zap.Error(err))
		return httpx.InternalError(c)
	}
}

func (h *OIDCHandler) failureRedirect() string {
	return h.appBaseURL + "/login?error=oauth_failed"
}

func (h *OIDCHandler) setFlowCookie(c echo.Context, token string) {
	c.SetCookie(&http.Cookie{ //nolint:gosec // Secure is configurable; HttpOnly and SameSite are always set
		Name:     oidcFlowCookieName,
		Value:    token,
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode, // required: Apple's callback is a cross-site POST (form_post)
		Path:     oidcFlowCookiePath,
		MaxAge:   int(oidcFlowStateTTL.Seconds()),
	})
}

// readAndClearFlowCookie returns the flow cookie's value (or "" if absent)
// and clears it unconditionally — the replay defense for this flow. It is
// called first thing in Callback, before dispatching to the service, so a
// failed or duplicate callback can never be replayed with the same cookie.
func (h *OIDCHandler) readAndClearFlowCookie(c echo.Context) string {
	cookie, err := c.Cookie(oidcFlowCookieName)
	raw := ""
	if err == nil {
		raw = cookie.Value
	}
	c.SetCookie(&http.Cookie{ //nolint:gosec // Secure is configurable; HttpOnly and SameSite are always set
		Name:     oidcFlowCookieName,
		Value:    "",
		HttpOnly: true,
		Secure:   h.secureCookie,
		SameSite: http.SameSiteLaxMode,
		Path:     oidcFlowCookiePath,
		MaxAge:   -1,
	})
	return raw
}

func (h *OIDCHandler) setRefreshCookie(c echo.Context, raw string, expiresAt time.Time) {
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
