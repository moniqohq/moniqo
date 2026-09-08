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

package onboarding_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/onboarding"
)

func newOnboardingCtx(e *echo.Echo, method, target, body string, withUser bool) (echo.Context, *httptest.ResponseRecorder) {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, target, strings.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if withUser {
		c.Set(string(auth.ContextKeyUser), &models.User{ID: testUserID})
	}
	return c, rec
}

func parseResp(tb testing.TB, body string) httpx.Response {
	tb.Helper()
	var resp httpx.Response
	require.NoError(tb, json.Unmarshal([]byte(body), &resp))
	return resp
}

func TestHandler_UpdateProfile_Success(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		UpdateProfileFn: func(_ context.Context, userID int64, req onboarding.ProfileRequest) (models.User, error) {
			assert.Equal(t, testUserID, userID)
			assert.Equal(t, "USD", req.Currency)
			return models.User{ID: userID}, nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodPatch, "/", `{"currency":"USD","timezone":"America/New_York"}`, true)
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).UpdateProfile(c))
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.True(t, parseResp(t, rec.Body.String()).Success)
}

func TestHandler_UpdateProfile_MissingCurrencyReturns400(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		UpdateProfileFn: func(_ context.Context, _ int64, _ onboarding.ProfileRequest) (models.User, error) {
			t.Fatal("service should not be called for an invalid request")
			return models.User{}, nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodPatch, "/", `{"timezone":"America/New_York"}`, true)
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).UpdateProfile(c))
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandler_UpdateProfile_MissingUserReturns401(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		UpdateProfileFn: func(_ context.Context, _ int64, _ onboarding.ProfileRequest) (models.User, error) {
			t.Fatal("service should not be called without an authenticated user")
			return models.User{}, nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodPatch, "/", `{"currency":"USD","timezone":"UTC"}`, false)
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).UpdateProfile(c))
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestHandler_CompleteStep_Success(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		CompleteStepFn: func(_ context.Context, userID int64, step int16, budgetID *int64) (models.OnboardingProgress, error) {
			assert.Equal(t, testUserID, userID)
			assert.Equal(t, int16(2), step)
			require.NotNil(t, budgetID)
			assert.Equal(t, int64(7), *budgetID)
			return models.OnboardingProgress{UserID: userID, CurrentStep: 3}, nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodPost, "/", `{"budget_id":7}`, true)
	c.SetParamNames("step")
	c.SetParamValues("2")
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).CompleteStep(c))
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestHandler_CompleteStep_InvalidStepReturns400(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{}
	c, rec := newOnboardingCtx(e, http.MethodPost, "/", "", true)
	c.SetParamNames("step")
	c.SetParamValues("not-a-number")
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).CompleteStep(c))
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandler_RewindStep_Success(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		RewindStepFn: func(_ context.Context, userID int64, step int16) (models.OnboardingProgress, error) {
			assert.Equal(t, testUserID, userID)
			assert.Equal(t, int16(3), step)
			return models.OnboardingProgress{UserID: userID, CurrentStep: 3, CompletedSteps: []int16{1, 2}}, nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodPost, "/", "", true)
	c.SetParamNames("step")
	c.SetParamValues("3")
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).RewindStep(c))
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestHandler_RewindStep_InvalidStepReturns400(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{}
	c, rec := newOnboardingCtx(e, http.MethodPost, "/", "", true)
	c.SetParamNames("step")
	c.SetParamValues("not-a-number")
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).RewindStep(c))
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandler_GetProgress_Success(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		GetProgressFn: func(_ context.Context, userID int64) (models.OnboardingProgress, error) {
			assert.Equal(t, testUserID, userID)
			return models.OnboardingProgress{UserID: userID, CurrentStep: 1}, nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodGet, "/", "", true)
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).GetProgress(c))
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestHandler_Complete_Success(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.OnboardingService{
		CompleteFn: func(_ context.Context, userID int64) error {
			assert.Equal(t, testUserID, userID)
			return nil
		},
	}

	c, rec := newOnboardingCtx(e, http.MethodPost, "/", "", true)
	require.NoError(t, onboarding.NewHandler(svc, zap.NewNop()).Complete(c))
	assert.Equal(t, http.StatusOK, rec.Code)
}
