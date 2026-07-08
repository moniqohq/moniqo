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

package user_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// newEchoCtx builds an Echo context with a JSON body for POST /api/v1/users.
func newEchoCtx(e *echo.Echo, body string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
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

func fixedUser() models.User {
	return models.User{
		ID:        7,
		Username:  "saqibtest",
		Email:     "saqib@example.com",
		Name:      ptr("Saqib"),
		Status:    models.UserStatusPendingVerification,
		CreatedAt: time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC),
	}
}

func TestHandler_Register(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		body        string
		svc         user.Service
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
			name:        "username too short returns 400 with field errors",
			body:        `{"username":"ab","password":"SecurePass1","email":"saqib@example.com"}`,
			svc:         nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
			checkData: func(t *testing.T, data map[string]any) {
				t.Helper()
				fields, ok := data["fields"].([]any)
				require.True(t, ok, "data.fields must be an array")
				assert.NotEmpty(t, fields)
			},
		},
		{
			name:        "multiple invalid fields aggregated into one 400",
			body:        `{"username":"","password":"","email":""}`,
			svc:         nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "validation failed",
			checkData: func(t *testing.T, data map[string]any) {
				t.Helper()
				fields, ok := data["fields"].([]any)
				require.True(t, ok)
				assert.GreaterOrEqual(t, len(fields), 3, "username, password, and email errors expected")
			},
		},
		{
			name: "service conflict returns 409",
			body: `{"username":"saqibtest","password":"SecurePass1","email":"saqib@example.com"}`,
			svc: &mock.UserService{
				RegisterFn: func(_ context.Context, _ user.RegisterRequest) (models.User, error) {
					return models.User{}, user.ErrConflict
				},
			},
			wantStatus:  http.StatusConflict,
			wantSuccess: false,
			wantMsg:     "username or email already exists",
		},
		{
			name: "service generic error returns 500",
			body: `{"username":"saqibtest","password":"SecurePass1","email":"saqib@example.com"}`,
			svc: &mock.UserService{
				RegisterFn: func(_ context.Context, _ user.RegisterRequest) (models.User, error) {
					return models.User{}, errors.New("unexpected db failure")
				},
			},
			wantStatus:  http.StatusInternalServerError,
			wantSuccess: false,
			wantMsg:     "internal server error",
		},
		{
			name: "success returns 201 with user payload",
			body: `{"username":"saqibtest","password":"SecurePass1","email":"saqib@example.com","name":"Saqib"}`,
			svc: &mock.UserService{
				RegisterFn: func(_ context.Context, _ user.RegisterRequest) (models.User, error) {
					return fixedUser(), nil
				},
			},
			wantStatus:  http.StatusCreated,
			wantSuccess: true,
			wantMsg:     "user created successfully",
			checkData: func(t *testing.T, data map[string]any) {
				t.Helper()
				assert.Equal(t, "saqibtest", data["username"])
				assert.Equal(t, "saqib@example.com", data["email"])
				assert.Equal(t, float64(7), data["id"])
				_, hasHash := data["hash"]
				assert.False(t, hasHash, "hash must never appear in the response")
			},
		},
		{
			name: "service receives correct input fields",
			body: `{"username":"saqibtest","password":"SecurePass1","email":"saqib@example.com","name":"Saqib"}`,
			svc: func() user.Service {
				var captured user.RegisterRequest
				return &mock.UserService{
					RegisterFn: func(_ context.Context, req user.RegisterRequest) (models.User, error) {
						captured = req
						_ = captured
						return fixedUser(), nil
					},
				}
			}(),
			wantStatus:  http.StatusCreated,
			wantSuccess: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, rec := newEchoCtx(e, tc.body)
			h := user.NewHandler(tc.svc, "http://localhost:3000", log)

			err := h.Register(c)
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

// TestHandler_Register_InputForwarding verifies each request field reaches the service.
func TestHandler_Register_InputForwarding(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	var captured user.RegisterRequest
	svc := &mock.UserService{
		RegisterFn: func(_ context.Context, req user.RegisterRequest) (models.User, error) {
			captured = req
			return fixedUser(), nil
		},
	}

	c, _ := newEchoCtx(e, `{"username":"saqibtest","password":"SecurePass1","email":"saqib@example.com","name":"Saqib"}`)
	h := user.NewHandler(svc, "http://localhost:3000", log)
	require.NoError(t, h.Register(c))

	assert.Equal(t, "saqibtest", captured.Username)
	assert.Equal(t, "SecurePass1", captured.Password)
	assert.Equal(t, "saqib@example.com", captured.Email)
	require.NotNil(t, captured.Name)
	assert.Equal(t, "Saqib", *captured.Name)
}
