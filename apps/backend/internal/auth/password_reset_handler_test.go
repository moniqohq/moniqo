package auth_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
)

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
