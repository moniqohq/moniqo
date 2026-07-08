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
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/mock"
)

func newLoginCtx(e *echo.Echo, body string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func newLogoutCtx(e *echo.Echo) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func parseEnvelope(t *testing.T, body string) (httpx.Response, map[string]any) {
	t.Helper()
	var resp httpx.Response
	require.NoError(t, json.Unmarshal([]byte(body), &resp))
	dataMap, _ := resp.Data.(map[string]any)
	return resp, dataMap
}

func fixedClaims() *auth.Claims {
	now := time.Now()
	return &auth.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "1",
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			Issuer:    auth.Issuer,
		},
	}
}

func TestHandler_Login(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	successSvc := &mock.AuthService{
		LoginFn: func(_ context.Context, _ auth.LoginRequest) (auth.LoginResult, error) {
			return auth.LoginResult{AccessToken: "tok.en.value", TokenType: "Bearer"}, nil
		},
	}

	tests := []struct {
		name        string
		body        string
		svc         auth.Service
		wantStatus  int
		wantSuccess bool
		wantMsg     string
		checkData   func(t *testing.T, data map[string]any)
	}{
		{
			name:        "malformed JSON returns 400",
			body:        `{not valid json`,
			svc:         nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
		},
		{
			name:        "missing email returns 400 with field error",
			body:        `{"password":"SecurePass1"}`,
			svc:         nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
			checkData: func(t *testing.T, data map[string]any) {
				t.Helper()
				fields, ok := data["fields"].([]any)
				require.True(t, ok)
				assert.NotEmpty(t, fields)
			},
		},
		{
			name:        "invalid email format returns 400",
			body:        `{"email":"not-an-email","password":"SecurePass1"}`,
			svc:         nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
		},
		{
			name:        "missing password returns 400 with field error",
			body:        `{"email":"user@example.com"}`,
			svc:         nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
		},
		{
			name: "invalid credentials returns generic 401",
			body: `{"email":"user@example.com","password":"WrongPass1"}`,
			svc: &mock.AuthService{
				LoginFn: func(_ context.Context, _ auth.LoginRequest) (auth.LoginResult, error) {
					return auth.LoginResult{}, auth.ErrInvalidCredentials
				},
			},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
			wantMsg:     "invalid credentials",
		},
		{
			name: "pending verification returns 403",
			body: `{"email":"user@example.com","password":"SecurePass1"}`,
			svc: &mock.AuthService{
				LoginFn: func(_ context.Context, _ auth.LoginRequest) (auth.LoginResult, error) {
					return auth.LoginResult{}, auth.ErrPendingVerification
				},
			},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
			wantMsg:     "account not yet verified",
		},
		{
			name: "service error returns 500",
			body: `{"email":"user@example.com","password":"SecurePass1"}`,
			svc: &mock.AuthService{
				LoginFn: func(_ context.Context, _ auth.LoginRequest) (auth.LoginResult, error) {
					return auth.LoginResult{}, errors.New("db unavailable")
				},
			},
			wantStatus:  http.StatusInternalServerError,
			wantSuccess: false,
			wantMsg:     "internal server error",
		},
		{
			name:        "success returns 200 with access token",
			body:        `{"email":"user@example.com","password":"SecurePass1"}`,
			svc:         successSvc,
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "login successful",
			checkData: func(t *testing.T, data map[string]any) {
				t.Helper()
				assert.Equal(t, "tok.en.value", data["access_token"])
				assert.Equal(t, "Bearer", data["token_type"])
				_, hasHash := data["hash"]
				assert.False(t, hasHash, "hash must never appear in the response")
			},
		},
		{
			name: "service receives correct input fields",
			body: `{"email":"user@example.com","password":"SecurePass1"}`,
			svc: func() auth.Service {
				var captured auth.LoginRequest
				return &mock.AuthService{
					LoginFn: func(_ context.Context, req auth.LoginRequest) (auth.LoginResult, error) {
						captured = req
						_ = captured
						return auth.LoginResult{AccessToken: "t", TokenType: "Bearer"}, nil
					},
				}
			}(),
			wantStatus:  http.StatusOK,
			wantSuccess: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, rec := newLoginCtx(e, tc.body)
			h := auth.NewHandler(tc.svc, log, false)

			err := h.Login(c)
			require.NoError(t, err)

			assert.Equal(t, tc.wantStatus, rec.Code)

			resp, dataMap := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
			if tc.checkData != nil {
				tc.checkData(t, dataMap)
			}
		})
	}
}

// TestHandler_Login_InputForwarding verifies each request field reaches the service.
func TestHandler_Login_InputForwarding(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	var captured auth.LoginRequest
	svc := &mock.AuthService{
		LoginFn: func(_ context.Context, req auth.LoginRequest) (auth.LoginResult, error) {
			captured = req
			return auth.LoginResult{AccessToken: "t", TokenType: "Bearer"}, nil
		},
	}

	c, _ := newLoginCtx(e, `{"email":"user@example.com","password":"SecurePass1"}`)
	h := auth.NewHandler(svc, log, false)
	require.NoError(t, h.Login(c))

	assert.Equal(t, "user@example.com", captured.Email)
	assert.Equal(t, "SecurePass1", captured.Password)
}

func TestHandler_Logout(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		setupCtx    func(c echo.Context)
		svc         auth.Service
		wantStatus  int
		wantSuccess bool
		wantMsg     string
	}{
		{
			name:        "no claims in context returns 401",
			setupCtx:    func(_ echo.Context) {},
			svc:         nil,
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
			wantMsg:     "not authenticated",
		},
		{
			name: "service error returns 500",
			setupCtx: func(c echo.Context) {
				auth.SetClaimsInContext(c, fixedClaims())
			},
			svc: &mock.AuthService{
				LogoutFn: func(_ context.Context, _ auth.LogoutParams) error {
					return errors.New("db unavailable")
				},
			},
			wantStatus:  http.StatusInternalServerError,
			wantSuccess: false,
			wantMsg:     "internal server error",
		},
		{
			name: "success returns 200 with null data",
			setupCtx: func(c echo.Context) {
				auth.SetClaimsInContext(c, fixedClaims())
			},
			svc: &mock.AuthService{
				LogoutFn: func(_ context.Context, _ auth.LogoutParams) error {
					return nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "logged out successfully",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, rec := newLogoutCtx(e)
			tc.setupCtx(c)
			h := auth.NewHandler(tc.svc, log, false)

			err := h.Logout(c)
			require.NoError(t, err)

			assert.Equal(t, tc.wantStatus, rec.Code)

			resp, _ := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
		})
	}
}

// TestHandler_Logout_ParamsForwarding verifies that claims are correctly unpacked
// and forwarded to the service as LogoutParams.
func TestHandler_Logout_ParamsForwarding(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	claims := fixedClaims()
	var captured auth.LogoutParams
	svc := &mock.AuthService{
		LogoutFn: func(_ context.Context, p auth.LogoutParams) error {
			captured = p
			return nil
		},
	}

	c, _ := newLogoutCtx(e)
	auth.SetClaimsInContext(c, claims)
	h := auth.NewHandler(svc, log, false)
	require.NoError(t, h.Logout(c))

	parsedJTI, err := uuid.Parse(claims.ID)
	require.NoError(t, err)
	assert.Equal(t, parsedJTI, captured.JTI)
	assert.Equal(t, int64(1), captured.UserID)
	assert.WithinDuration(t, claims.ExpiresAt.Time, captured.ExpiresAt, time.Second)
}

// --- Password reset handler tests ---

type funcPasswordResetService struct {
	requestErr error
	confirmErr error
}

func (s *funcPasswordResetService) RequestReset(_ context.Context, _ auth.RequestResetRequest) error {
	return s.requestErr
}

func (s *funcPasswordResetService) ConfirmReset(_ context.Context, _ auth.ConfirmResetRequest) error {
	return s.confirmErr
}

func passwordResetServiceFunc(requestErr, confirmErr error) auth.PasswordResetService {
	return &funcPasswordResetService{requestErr: requestErr, confirmErr: confirmErr}
}

func newResetCtx(e *echo.Echo, path, body string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func TestPasswordResetHandler_RequestReset(t *testing.T) {
	t.Parallel()

	e := echo.New()

	t.Run("valid email always returns 200", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, nil), zap.NewNop())
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset", `{"email":"user@example.com"}`)

		require.NoError(t, h.RequestReset(c))
		assert.Equal(t, http.StatusOK, rec.Code)

		resp, _ := parseEnvelope(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Contains(t, resp.Msg, "if an account")
	})

	t.Run("account does not exist still returns 200", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, nil), zap.NewNop())
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset", `{"email":"ghost@example.com"}`)

		require.NoError(t, h.RequestReset(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("invalid email format returns 400", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, nil), zap.NewNop())
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset", `{"email":"not-an-email"}`)

		_ = h.RequestReset(c)
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		resp, _ := parseEnvelope(t, rec.Body.String())
		assert.False(t, resp.Success)
	})

	t.Run("service error returns 500", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(errors.New("db down"), nil), zap.NewNop())
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset", `{"email":"user@example.com"}`)

		_ = h.RequestReset(c)
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
	})
}

func TestPasswordResetHandler_ConfirmReset(t *testing.T) {
	t.Parallel()

	e := echo.New()
	validToken := strings.Repeat("a", 64)

	t.Run("valid token and password returns 200", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, nil), zap.NewNop())
		body := `{"token":"` + validToken + `","new_password":"NewSecurePass1"}`
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset/confirm", body)

		require.NoError(t, h.ConfirmReset(c))
		assert.Equal(t, http.StatusOK, rec.Code)

		resp, _ := parseEnvelope(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Contains(t, resp.Msg, "password reset successfully")
	})

	t.Run("invalid token format returns 400", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, nil), zap.NewNop())
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset/confirm", `{"token":"bad","new_password":"NewSecurePass1"}`)

		_ = h.ConfirmReset(c)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("ErrInvalidResetToken returns 401 with generic message", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, auth.ErrInvalidResetToken), zap.NewNop())
		body := `{"token":"` + validToken + `","new_password":"NewSecurePass1"}`
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset/confirm", body)

		_ = h.ConfirmReset(c)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)

		resp, _ := parseEnvelope(t, rec.Body.String())
		assert.False(t, resp.Success)
		assert.Equal(t, "unauthorized", resp.Msg)
	})

	t.Run("password too short returns 400", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, nil), zap.NewNop())
		body := `{"token":"` + validToken + `","new_password":"short"}`
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset/confirm", body)

		_ = h.ConfirmReset(c)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("service error returns 500", func(t *testing.T) {
		t.Parallel()

		h := auth.NewPasswordResetHandler(passwordResetServiceFunc(nil, errors.New("db down")), zap.NewNop())
		body := `{"token":"` + validToken + `","new_password":"NewSecurePass1"}`
		c, rec := newResetCtx(e, "/api/v1/auth/password-reset/confirm", body)

		_ = h.ConfirmReset(c)
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
	})
}
