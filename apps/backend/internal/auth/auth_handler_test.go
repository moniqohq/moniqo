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

	successSvc := &mock.MockAuthService{
		LoginFn: func(_ context.Context, _ auth.LoginRequest) (auth.LoginResult, error) {
			return auth.LoginResult{AccessToken: "tok.en.value", TokenType: "Bearer"}, nil
		},
	}

	tests := []struct {
		name        string
		body        string
		svc         auth.AuthService
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
			svc: &mock.MockAuthService{
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
			svc: &mock.MockAuthService{
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
			svc: &mock.MockAuthService{
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
			svc: func() auth.AuthService {
				var captured auth.LoginRequest
				return &mock.MockAuthService{
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
			h := auth.NewHandler(tc.svc, log)

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
	svc := &mock.MockAuthService{
		LoginFn: func(_ context.Context, req auth.LoginRequest) (auth.LoginResult, error) {
			captured = req
			return auth.LoginResult{AccessToken: "t", TokenType: "Bearer"}, nil
		},
	}

	c, _ := newLoginCtx(e, `{"email":"user@example.com","password":"SecurePass1"}`)
	h := auth.NewHandler(svc, log)
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
		svc         auth.AuthService
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
			svc: &mock.MockAuthService{
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
			svc: &mock.MockAuthService{
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
			h := auth.NewHandler(tc.svc, log)

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
	svc := &mock.MockAuthService{
		LogoutFn: func(_ context.Context, p auth.LogoutParams) error {
			captured = p
			return nil
		},
	}

	c, _ := newLogoutCtx(e)
	auth.SetClaimsInContext(c, claims)
	h := auth.NewHandler(svc, log)
	require.NoError(t, h.Logout(c))

	parsedJTI, err := uuid.Parse(claims.ID)
	require.NoError(t, err)
	assert.Equal(t, parsedJTI, captured.JTI)
	assert.Equal(t, int64(1), captured.UserID)
	assert.WithinDuration(t, claims.ExpiresAt.Time, captured.ExpiresAt, time.Second)
}
