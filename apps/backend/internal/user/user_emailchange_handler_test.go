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
	"net/http"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// TestHandler_RequestEmailChange covers POST /api/v1/users/{id}/email-change.
func TestHandler_RequestEmailChange(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	tests := []struct {
		name        string
		pathID      string
		authedAs    int64
		body        string
		svc         user.Service
		wantStatus  int
		wantSuccess bool
		wantMsg     string
		wantField   string
	}{
		{
			name:        "no auth claims returns 401",
			pathID:      "7",
			authedAs:    0,
			body:        `{"new_email":"new@example.com"}`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusUnauthorized,
			wantSuccess: false,
		},
		{
			name:        "id mismatch returns 403",
			pathID:      "99",
			authedAs:    testUserID,
			body:        `{"new_email":"new@example.com"}`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
		},
		{
			name:        "invalid json returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			body:        `{not json`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
		},
		{
			name:        "invalid new_email format returns 400",
			pathID:      "7",
			authedAs:    testUserID,
			body:        `{"new_email":"notanemail"}`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "new_email",
		},
		{
			name:     "same email returns 400",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"new_email":"new@example.com"}`,
			svc: &mock.UserService{
				RequestEmailChangeFn: func(_ context.Context, _ int64, _ user.RequestEmailChangeRequest) (user.EmailChangeStatus, error) {
					return user.EmailChangeStatus{}, user.ErrSameEmail
				},
			},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "new_email",
		},
		{
			name:     "wrong password returns 403",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"new_email":"new@example.com","current_password":"wrong"}`,
			svc: &mock.UserService{
				RequestEmailChangeFn: func(_ context.Context, _ int64, _ user.RequestEmailChangeRequest) (user.EmailChangeStatus, error) {
					return user.EmailChangeStatus{}, user.ErrWrongPassword
				},
			},
			wantStatus:  http.StatusForbidden,
			wantSuccess: false,
			wantMsg:     "current password is incorrect",
		},
		{
			name:     "email already in use returns 409",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"new_email":"new@example.com"}`,
			svc: &mock.UserService{
				RequestEmailChangeFn: func(_ context.Context, _ int64, _ user.RequestEmailChangeRequest) (user.EmailChangeStatus, error) {
					return user.EmailChangeStatus{}, user.ErrConflict
				},
			},
			wantStatus:  http.StatusConflict,
			wantSuccess: false,
			wantMsg:     "email already in use",
		},
		{
			name:     "lockout returns 429 with Retry-After",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"new_email":"new@example.com"}`,
			svc: &mock.UserService{
				RequestEmailChangeFn: func(_ context.Context, _ int64, _ user.RequestEmailChangeRequest) (user.EmailChangeStatus, error) {
					return user.EmailChangeStatus{}, &user.LockedError{RetryAfter: 30 * time.Minute}
				},
			},
			wantStatus:  http.StatusTooManyRequests,
			wantSuccess: false,
			wantMsg:     "too many verification attempts",
		},
		{
			name:     "user not found returns 404",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"new_email":"new@example.com"}`,
			svc: &mock.UserService{
				RequestEmailChangeFn: func(_ context.Context, _ int64, _ user.RequestEmailChangeRequest) (user.EmailChangeStatus, error) {
					return user.EmailChangeStatus{}, user.ErrNotFound
				},
			},
			wantStatus:  http.StatusNotFound,
			wantSuccess: false,
			wantMsg:     "user not found",
		},
		{
			name:     "success returns 200 with pending status",
			pathID:   "7",
			authedAs: testUserID,
			body:     `{"new_email":"new@example.com","current_password":"CurrentPass1"}`,
			svc: &mock.UserService{
				RequestEmailChangeFn: func(_ context.Context, _ int64, _ user.RequestEmailChangeRequest) (user.EmailChangeStatus, error) {
					return user.EmailChangeStatus{Pending: true, NewEmail: "new@example.com", AttemptsRemaining: 3}, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "verification code sent to the new email address",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			h := user.NewHandler(tc.svc, "http://localhost:3000", log)
			c, rec := newProfileCtx(e, http.MethodPost, tc.pathID, tc.body, tc.authedAs)
			c.Request().URL.Path += "/email-change"

			require.NoError(t, h.RequestEmailChange(c))

			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, dataMap := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
			if tc.wantField != "" {
				fields, _ := dataMap["fields"].([]any)
				require.NotEmpty(t, fields)
				fe, _ := fields[0].(map[string]any)
				assert.Equal(t, tc.wantField, fe["field"])
			}
			if tc.name == "lockout returns 429 with Retry-After" {
				assert.NotEmpty(t, rec.Header().Get("Retry-After"))
			}
		})
	}
}

// TestHandler_VerifyEmailChange covers POST /api/v1/users/{id}/email-change/verify.
func TestHandler_VerifyEmailChange(t *testing.T) {
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
		wantField   string
	}{
		{
			name:        "empty code returns 400",
			body:        `{"code":""}`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "code",
		},
		{
			name:        "non-digit code returns 400",
			body:        `{"code":"abcdef"}`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "code",
		},
		{
			name:        "short code returns 400",
			body:        `{"code":"12345"}`,
			svc:         &mock.UserService{},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "code",
		},
		{
			name: "wrong code returns 400 with attempts remaining",
			body: `{"code":"000000"}`,
			svc: &mock.UserService{
				VerifyEmailChangeFn: func(_ context.Context, _ int64, _ user.VerifyEmailChangeRequest) (models.User, error) {
					return models.User{}, &user.InvalidCodeError{AttemptsRemaining: 2}
				},
			},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantField:   "code",
		},
		{
			name: "no pending request returns 400",
			body: `{"code":"000000"}`,
			svc: &mock.UserService{
				VerifyEmailChangeFn: func(_ context.Context, _ int64, _ user.VerifyEmailChangeRequest) (models.User, error) {
					return models.User{}, user.ErrNoPendingEmailChange
				},
			},
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
			wantMsg:     "no pending email change request",
		},
		{
			name: "lockout returns 429",
			body: `{"code":"000000"}`,
			svc: &mock.UserService{
				VerifyEmailChangeFn: func(_ context.Context, _ int64, _ user.VerifyEmailChangeRequest) (models.User, error) {
					return models.User{}, &user.LockedError{RetryAfter: 30 * time.Minute}
				},
			},
			wantStatus:  http.StatusTooManyRequests,
			wantSuccess: false,
		},
		{
			name: "conflict returns 409",
			body: `{"code":"000000"}`,
			svc: &mock.UserService{
				VerifyEmailChangeFn: func(_ context.Context, _ int64, _ user.VerifyEmailChangeRequest) (models.User, error) {
					return models.User{}, user.ErrConflict
				},
			},
			wantStatus:  http.StatusConflict,
			wantSuccess: false,
		},
		{
			name: "success returns the updated user",
			body: `{"code":"483920"}`,
			svc: &mock.UserService{
				VerifyEmailChangeFn: func(_ context.Context, _ int64, _ user.VerifyEmailChangeRequest) (models.User, error) {
					return models.User{ID: testUserID, Email: "new@example.com"}, nil
				},
			},
			wantStatus:  http.StatusOK,
			wantSuccess: true,
			wantMsg:     "email address updated successfully",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			h := user.NewHandler(tc.svc, "http://localhost:3000", log)
			c, rec := newProfileCtx(e, http.MethodPost, "7", tc.body, testUserID)

			require.NoError(t, h.VerifyEmailChange(c))

			assert.Equal(t, tc.wantStatus, rec.Code)
			resp, dataMap := parseEnvelope(t, rec.Body.String())
			assert.Equal(t, tc.wantSuccess, resp.Success)
			if tc.wantMsg != "" {
				assert.Equal(t, tc.wantMsg, resp.Msg)
			}
			if tc.wantField != "" {
				fields, _ := dataMap["fields"].([]any)
				require.NotEmpty(t, fields)
				fe, _ := fields[0].(map[string]any)
				assert.Equal(t, tc.wantField, fe["field"])
			}
		})
	}
}

// TestHandler_CancelEmailChange covers DELETE /api/v1/users/{id}/email-change.
func TestHandler_CancelEmailChange(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	t.Run("idempotent: nothing pending is still a 200", func(t *testing.T) {
		t.Parallel()

		svc := &mock.UserService{
			CancelEmailChangeFn: func(_ context.Context, _ int64) error { return nil },
		}
		h := user.NewHandler(svc, "http://localhost:3000", log)
		c, rec := newProfileCtx(e, http.MethodDelete, "7", "", testUserID)

		require.NoError(t, h.CancelEmailChange(c))

		assert.Equal(t, http.StatusOK, rec.Code)
		resp, _ := parseEnvelope(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "email change request cancelled", resp.Msg)
	})

	t.Run("id mismatch returns 403", func(t *testing.T) {
		t.Parallel()

		h := user.NewHandler(&mock.UserService{}, "http://localhost:3000", log)
		c, rec := newProfileCtx(e, http.MethodDelete, "99", "", testUserID)

		require.NoError(t, h.CancelEmailChange(c))

		assert.Equal(t, http.StatusForbidden, rec.Code)
	})
}

// TestHandler_GetEmailChangeStatus covers GET /api/v1/users/{id}/email-change.
func TestHandler_GetEmailChangeStatus(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	e := echo.New()

	svc := &mock.UserService{
		GetEmailChangeStatusFn: func(_ context.Context, _ int64) (user.EmailChangeStatus, error) {
			return user.EmailChangeStatus{Pending: true, NewEmail: "new@example.com", AttemptsRemaining: 2}, nil
		},
	}
	h := user.NewHandler(svc, "http://localhost:3000", log)
	c, rec := newProfileCtx(e, http.MethodGet, "7", "", testUserID)

	require.NoError(t, h.GetEmailChangeStatus(c))

	assert.Equal(t, http.StatusOK, rec.Code)
	resp, dataMap := parseEnvelope(t, rec.Body.String())
	assert.True(t, resp.Success)
	assert.Equal(t, true, dataMap["pending"])
	assert.Equal(t, "new@example.com", dataMap["new_email"])
}
