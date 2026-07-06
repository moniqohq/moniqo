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

// Package auth provides JWT-based authentication handlers and token utilities.
package auth

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

const refreshCookieName = "moniqo_refresh"

const (
	invalidBodyField = "body"
	invalidJSONMsg   = "invalid json"
)

// Service is the service contract required by Handler.
type Service interface {
	Login(ctx context.Context, req LoginRequest) (LoginResult, error)
	Logout(ctx context.Context, params LogoutParams) error
	RefreshAccessToken(ctx context.Context, rawToken string) (RefreshResult, error)
}

// Handler holds HTTP handlers for auth endpoints.
type Handler struct {
	svc          Service
	log          *zap.Logger
	secureCookie bool
}

// NewHandler returns an auth Handler wired to the given service.
// secureCookie should be true in production (sets the Secure flag on the refresh cookie).
func NewHandler(svc Service, log *zap.Logger, secureCookie bool) *Handler {
	return &Handler{svc: svc, log: log, secureCookie: secureCookie}
}

func (h *Handler) setRefreshCookie(c echo.Context, raw string, expiresAt time.Time) {
	cookie := new(http.Cookie)
	cookie.Name = refreshCookieName
	cookie.Value = raw
	cookie.HttpOnly = true
	cookie.Secure = h.secureCookie
	cookie.SameSite = http.SameSiteLaxMode
	cookie.Path = "/"
	cookie.MaxAge = int(time.Until(expiresAt).Seconds())
	c.SetCookie(cookie)
}

func (h *Handler) clearRefreshCookie(c echo.Context) {
	cookie := new(http.Cookie)
	cookie.Name = refreshCookieName
	cookie.Value = ""
	cookie.HttpOnly = true
	cookie.Secure = h.secureCookie
	cookie.SameSite = http.SameSiteLaxMode
	cookie.Path = "/"
	cookie.MaxAge = -1
	c.SetCookie(cookie)
}

// Login handles POST /api/v1/auth/login.
func (h *Handler) Login(c echo.Context) error {
	h.log.Debug("received login request")

	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind login request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: invalidBodyField, Error: invalidJSONMsg}})
	}

	h.log.Debug("validating login input", zap.String("email", req.Email))
	if errs := validator.ValidateLogin(validator.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	}); len(errs) > 0 {
		h.log.Debug("login input validation failed", zap.String("email", req.Email), zap.Int("error_count", len(errs)))
		return httpx.ValidationError(c, errs)
	}

	h.log.Info("dispatching login to service", zap.String("email", req.Email))
	result, err := h.svc.Login(c.Request().Context(), req)
	if errors.Is(err, ErrInvalidCredentials) {
		h.log.Debug("login rejected: invalid credentials", zap.String("email", req.Email))
		return httpx.Unauthorized(c, "invalid credentials")
	}
	if errors.Is(err, ErrPendingVerification) {
		h.log.Debug("login rejected: account not yet verified", zap.String("email", req.Email))
		return httpx.Forbidden(c, "account not yet verified")
	}
	if err != nil {
		h.log.Error("login failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	h.setRefreshCookie(c, result.RefreshToken, result.RefreshTokenExpiresAt)

	h.log.Info("login request completed", zap.String("email", req.Email))
	return httpx.OK(c, LoginResponseData{
		AccessToken: result.AccessToken,
		TokenType:   result.TokenType,
	}, "login successful")
}

// Refresh handles POST /api/v1/auth/refresh.
// It reads the refresh token from the HttpOnly cookie, rotates it, sets a new
// cookie, and returns a fresh access token in the response body.
func (h *Handler) Refresh(c echo.Context) error {
	h.log.Debug("received token refresh request")

	cookie, err := c.Cookie(refreshCookieName)
	if err != nil {
		h.log.Debug("refresh: missing cookie", zap.Error(err))
		return httpx.Unauthorized(c, "missing refresh token")
	}

	result, err := h.svc.RefreshAccessToken(c.Request().Context(), cookie.Value)
	if errors.Is(err, ErrRefreshTokenInvalid) {
		h.log.Debug("refresh: token invalid or expired")
		h.clearRefreshCookie(c)
		return httpx.Unauthorized(c, "session expired, please log in again")
	}
	if err != nil {
		h.log.Error("refresh: service error", zap.Error(err))
		return httpx.InternalError(c)
	}

	h.setRefreshCookie(c, result.Refresh.RawToken, result.Refresh.ExpiresAt)

	h.log.Debug("token refresh completed")
	return httpx.OK(c, RefreshResponseData{
		AccessToken: result.AccessToken,
		TokenType:   result.TokenType,
	}, "token refreshed")
}

// PasswordResetService is the service contract required by PasswordResetHandler.
type PasswordResetService interface {
	RequestReset(ctx context.Context, req RequestResetRequest) error
	ConfirmReset(ctx context.Context, req ConfirmResetRequest) error
}

// PasswordResetHandler holds HTTP handlers for the password reset flow.
type PasswordResetHandler struct {
	svc PasswordResetService
	log *zap.Logger
}

// NewPasswordResetHandler returns a PasswordResetHandler wired to the given service.
func NewPasswordResetHandler(svc PasswordResetService, log *zap.Logger) *PasswordResetHandler {
	return &PasswordResetHandler{svc: svc, log: log}
}

// RequestReset handles POST /api/v1/auth/password-reset.
// Always returns 200 regardless of whether the email exists or the send succeeds.
func (h *PasswordResetHandler) RequestReset(c echo.Context) error {
	h.log.Debug("received password reset request")

	var req RequestResetRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: invalidBodyField, Error: invalidJSONMsg}})
	}

	if errs := validator.ValidateRequestReset(validator.RequestResetInput{Email: req.Email}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	if err := h.svc.RequestReset(c.Request().Context(), req); err != nil {
		h.log.Error("password reset request failed", zap.String("email", req.Email), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "if an account with that email exists, a reset link has been sent")
}

// ConfirmReset handles POST /api/v1/auth/password-reset/confirm.
func (h *PasswordResetHandler) ConfirmReset(c echo.Context) error {
	h.log.Debug("received password reset confirmation")

	var req ConfirmResetRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: invalidBodyField, Error: invalidJSONMsg}})
	}

	if errs := validator.ValidateConfirmReset(validator.ConfirmResetInput{
		Token:       req.Token,
		NewPassword: req.NewPassword,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	err := h.svc.ConfirmReset(c.Request().Context(), req)
	if errors.Is(err, ErrInvalidResetToken) {
		return httpx.Unauthorized(c, "unauthorized")
	}
	if err != nil {
		h.log.Error("password reset confirmation failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "password reset successfully, please log in")
}

// Logout handles POST /api/v1/auth/logout.
func (h *Handler) Logout(c echo.Context) error {
	h.log.Debug("received logout request")

	claims, ok := ClaimsFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		h.log.Error("logout: malformed sub claim in token", zap.String("sub", claims.Subject))
		return httpx.InternalError(c)
	}

	jti, err := uuid.Parse(claims.ID)
	if err != nil {
		h.log.Error("logout: malformed jti claim in token", zap.String("jti", claims.ID))
		return httpx.InternalError(c)
	}

	params := LogoutParams{
		JTI:       jti,
		UserID:    userID,
		ExpiresAt: claims.ExpiresAt.Time,
	}
	if cookie, err := c.Cookie(refreshCookieName); err == nil && cookie.Value != "" {
		params.RefreshTokenHash = HashRefreshToken(cookie.Value)
	}

	if err := h.svc.Logout(c.Request().Context(), params); err != nil {
		h.log.Error("logout failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	h.clearRefreshCookie(c)

	h.log.Info("logout request completed", zap.Int64("user_id", userID))
	return httpx.OK(c, nil, "logged out successfully")
}
