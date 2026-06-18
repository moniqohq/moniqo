package user_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

const testUserID = int64(7)

// withClaims injects a verified-claims value into an Echo context, simulating
// a request that has passed through auth.Middleware.
func withClaims(c echo.Context, userID int64) {
	claims := &auth.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", userID),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	c.Set("auth_claims", claims)
}

// newProfileCtx builds an Echo context for authenticated profile endpoints.
func newProfileCtx(e *echo.Echo, method, pathID, body string, authedAs int64) (echo.Context, *httptest.ResponseRecorder) {
	var bodyReader *strings.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	} else {
		bodyReader = strings.NewReader("")
	}
	req := httptest.NewRequest(method, "/api/v1/users/"+pathID, bodyReader)
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(pathID)
	if authedAs != 0 {
		withClaims(c, authedAs)
	}
	return c, rec
}

func profileUser() models.User {
	return models.User{
		ID:        testUserID,
		Username:  "saqibtest",
		Email:     "saqib@example.com",
		Name:      ptr("Saqib"),
		Picture:   "",
		Status:    models.UserStatusActive,
		CreatedAt: time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC),
	}
}

// TestHandler_GetProfile covers GET /api/v1/users/{id}.
func TestHandler_GetProfile(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		pathID      string
		authedAs    int64
		svc         user.UserService
		wantStatus  int
		wantSuccess bool
		wantMsg     string
	}{
		{
			name:        "no auth claims returns 401",
			pathID:      "7",
			authedAs:    0,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
		},
		{
			name:        "id mismatch returns 403",
			pathID:      "99",
			authedAs:    testUserID,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
		},
		{
			name:     "user not found returns 404",
			pathID:   "7",
			authedAs: testUserID,
			svc: &mock.MockUserService{
				GetByIDFn: func(_ context.Context, _ int64) (models.User, error) {
					return models.User{}, user.ErrNotFound
				},
			},
			wantStatus:  http.StatusNotFound,
			wantSuccess: false,
			wantMsg:     "user not found",
		},
		{
			name:     "service error returns 500",
			pathID:   "7",
			authedAs: testUserID,
			svc: &mock.MockUserService{
				GetByIDFn: func(_ context.Context, _ int64) (models.User, error) {
					return models.User{}, errors.New("db down")
				},
			},
			wantStatus:  http.StatusInternalServerError,
			wantSuccess: false,
		},
		{
			name:     "success returns 200 with profile",
			pathID:   "7",
			authedAs: testUserID,
			svc: &mock.MockUserService{
				GetByIDFn: func(_ context.Context, id int64) (models.User, error) {
					return profileUser(), nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "user fetched successfully",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, rec := newProfileCtx(e, http.MethodGet, tc.pathID, "", tc.authedAs)
			h := user.NewHandler(tc.svc, log)
			require.NoError(t, h.GetProfile(c))
			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, _ := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
		})
	}
}

// TestHandler_ReplaceProfile covers PUT /api/v1/users/{id}.
func TestHandler_ReplaceProfile(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		pathID      string
		authedAs    int64
		body        string
		svc         user.UserService
		wantStatus  int
		wantSuccess bool
		wantMsg     string
	}{
		{
			name:        "no auth claims returns 401",
			pathID:      "7",
			authedAs:    0,
			body:        `{"username":"saqibtest","email":"saqib@example.com","picture":""}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
		},
		{
			name:        "id mismatch returns 403",
			pathID:      "99",
			authedAs:    testUserID,
			body:        `{"username":"saqibtest","email":"saqib@example.com","picture":""}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
		},
		{
			name:        "invalid username returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			body:        `{"username":"ab","email":"saqib@example.com","picture":""}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
		},
		{
			name:        "invalid email returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			body:        `{"username":"saqibtest","email":"not-an-email","picture":""}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
		},
		{
			name:     "conflict returns 409",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"username":"saqibtest","email":"saqib@example.com","picture":""}`,
			svc: &mock.MockUserService{
				ReplaceProfileFn: func(_ context.Context, _ int64, _ user.ReplaceProfileRequest) (models.User, error) {
					return models.User{}, user.ErrConflict
				},
			},
			wantStatus:  http.StatusConflict,
			wantSuccess: false,
			wantMsg:     "username or email already exists",
		},
		{
			name:     "success returns 200 with updated profile",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"username":"saqibtest","email":"saqib@example.com","picture":""}`,
			svc: &mock.MockUserService{
				ReplaceProfileFn: func(_ context.Context, _ int64, _ user.ReplaceProfileRequest) (models.User, error) {
					return profileUser(), nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "user updated successfully",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, rec := newProfileCtx(e, http.MethodPut, tc.pathID, tc.body, tc.authedAs)
			h := user.NewHandler(tc.svc, log)
			require.NoError(t, h.ReplaceProfile(c))
			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, _ := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
		})
	}
}

// TestHandler_PatchProfile covers PATCH /api/v1/users/{id}.
func TestHandler_PatchProfile(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		pathID      string
		authedAs    int64
		body        string
		svc         user.UserService
		wantStatus  int
		wantSuccess bool
		wantMsg     string
	}{
		{
			name:        "no auth claims returns 401",
			pathID:      "7",
			authedAs:    0,
			body:        `{"picture":"https://cdn.moniqo.app/new.png"}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
		},
		{
			name:        "id mismatch returns 403",
			pathID:      "99",
			authedAs:    testUserID,
			body:        `{"picture":"https://cdn.moniqo.app/new.png"}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
		},
		{
			name:        "empty body returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			body:        `{}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
		},
		{
			name:        "password change with only new_password returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			body:        `{"new_password":"NewSecure99"}`,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
		},
		{
			name:     "wrong current password returns 403",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"current_password":"wrong","new_password":"NewSecure99"}`,
			svc: &mock.MockUserService{
				PatchProfileFn: func(_ context.Context, _ int64, _ user.PatchProfileRequest) (models.User, error) {
					return models.User{}, user.ErrWrongPassword
				},
			},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
			wantMsg:     "current password is incorrect",
		},
		{
			name:     "conflict on username/email returns 409",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"username":"saqibtest"}`,
			svc: &mock.MockUserService{
				PatchProfileFn: func(_ context.Context, _ int64, _ user.PatchProfileRequest) (models.User, error) {
					return models.User{}, user.ErrConflict
				},
			},
			wantStatus:  http.StatusConflict,
			wantSuccess: false,
			wantMsg:     "username or email already exists",
		},
		{
			name:     "partial update succeeds",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"picture":"https://cdn.moniqo.app/new.png"}`,
			svc: &mock.MockUserService{
				PatchProfileFn: func(_ context.Context, _ int64, _ user.PatchProfileRequest) (models.User, error) {
					u := profileUser()
					u.Picture = "https://cdn.moniqo.app/new.png"
					return u, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "user updated successfully",
		},
		{
			name:     "password change succeeds",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"current_password":"OldSecure1","new_password":"NewSecure99"}`,
			svc: &mock.MockUserService{
				PatchProfileFn: func(_ context.Context, _ int64, _ user.PatchProfileRequest) (models.User, error) {
					return profileUser(), nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "user updated successfully",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, rec := newProfileCtx(e, http.MethodPatch, tc.pathID, tc.body, tc.authedAs)
			h := user.NewHandler(tc.svc, log)
			require.NoError(t, h.PatchProfile(c))
			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, _ := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
		})
	}
}

// TestHandler_DeleteProfile covers DELETE /api/v1/users/{id}.
func TestHandler_DeleteProfile(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		pathID      string
		authedAs    int64
		svc         user.UserService
		wantStatus  int
		wantSuccess bool
		wantMsg     string
	}{
		{
			name:        "no auth claims returns 401",
			pathID:      "7",
			authedAs:    0,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
		},
		{
			name:        "id mismatch returns 403",
			pathID:      "99",
			authedAs:    testUserID,
			svc:         &mock.MockUserService{},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
		},
		{
			name:     "service error returns 500",
			pathID:   "7",
			authedAs: testUserID,
			svc: &mock.MockUserService{
				DeleteFn: func(_ context.Context, _ int64) error {
					return errors.New("db failure")
				},
			},
			wantStatus:  http.StatusInternalServerError,
			wantSuccess: false,
		},
		{
			name:     "success returns 200",
			pathID:   "7",
			authedAs: testUserID,
			svc: &mock.MockUserService{
				DeleteFn: func(_ context.Context, _ int64) error {
					return nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "user deleted successfully",
		},
		{
			name:     "already-deleted user returns 200 (idempotent)",
			pathID:   "7",
			authedAs: testUserID,
			svc: &mock.MockUserService{
				DeleteFn: func(_ context.Context, _ int64) error {
					return nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "user deleted successfully",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c, rec := newProfileCtx(e, http.MethodDelete, tc.pathID, "", tc.authedAs)
			h := user.NewHandler(tc.svc, log)
			require.NoError(t, h.DeleteProfile(c))
			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, _ := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
		})
	}
}
