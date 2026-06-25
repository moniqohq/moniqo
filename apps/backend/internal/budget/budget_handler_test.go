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

package budget_test

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

	"github.com/moniqohq/moniqo/apps/backend/internal/budget"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// injectUser sets the authenticated user into the echo context, simulating
// what auth.Middleware does after validating the JWT.
func injectUser(c echo.Context, u *models.User) {
	c.Set("authenticated_user", u)
}

// injectMembership sets the resolved BudgetUser into context, simulating
// what RequireBudgetAccess does.
func injectMembership(c echo.Context, m models.BudgetUser) {
	c.Set("budget_membership", m)
}

func newCtx(e *echo.Echo, method, path, body string) (echo.Context, *httptest.ResponseRecorder) {
	var r *strings.Reader
	if body != "" {
		r = strings.NewReader(body)
	} else {
		r = strings.NewReader("")
	}
	req := httptest.NewRequest(method, path, r)
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func parseResp(t *testing.T, body string) httpx.Response {
	t.Helper()
	var resp httpx.Response
	require.NoError(t, json.Unmarshal([]byte(body), &resp))
	return resp
}

func fixedAuthUser() *models.User {
	return &models.User{ID: testUserID, Username: "saqibtest", Email: "test@example.com", CreatedAt: time.Now()}
}

func fixedBudget() models.Budget {
	notes := "some notes"
	return models.Budget{ID: testBudgetID, Title: "My Budget", Notes: &notes, CreatedAt: time.Now()}
}

// TestHandler_Create covers POST /api/v1/budgets.
func TestHandler_Create(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("malformed JSON returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPost, "/api/v1/budgets", `{bad json`)
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(nil, log)

		require.NoError(t, h.Create(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("title too short returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPost, "/api/v1/budgets", `{"title":"ab"}`)
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(nil, log)

		require.NoError(t, h.Create(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Equal(t, "validation failed", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("duplicate title returns 409", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.BudgetService{
			CreateFn: func(_ context.Context, _ int64, _ budget.CreateRequest) (models.Budget, error) {
				return models.Budget{}, budget.ErrBudgetAlreadyExists
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/api/v1/budgets", `{"title":"My Budget"}`)
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(svc, log)

		require.NoError(t, h.Create(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})

	t.Run("unexpected error returns 500", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.BudgetService{
			CreateFn: func(_ context.Context, _ int64, _ budget.CreateRequest) (models.Budget, error) {
				return models.Budget{}, errors.New("db error")
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/api/v1/budgets", `{"title":"My Budget"}`)
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(svc, log)

		require.NoError(t, h.Create(c))
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
	})

	t.Run("success returns 201 with budget payload", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.BudgetService{
			CreateFn: func(_ context.Context, _ int64, _ budget.CreateRequest) (models.Budget, error) {
				return fixedBudget(), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/api/v1/budgets", `{"title":"My Budget"}`)
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(svc, log)

		require.NoError(t, h.Create(c))
		assert.Equal(t, http.StatusCreated, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "budget created successfully", resp.Msg)
		dataMap, ok := resp.Data.(map[string]any)
		require.True(t, ok)
		assert.Equal(t, "My Budget", dataMap["title"])
		_, hasDeletedAt := dataMap["deleted_at"]
		assert.False(t, hasDeletedAt, "deleted_at must not appear in response")
	})
}

// TestHandler_List covers GET /api/v1/budgets.
func TestHandler_List(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("empty list returns 200 with data []", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.BudgetService{
			ListFn: func(_ context.Context, _ int64) ([]models.Budget, error) {
				return []models.Budget{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/api/v1/budgets", "")
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(svc, log)

		require.NoError(t, h.List(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		arr, ok := resp.Data.([]any)
		require.True(t, ok, "data must be an array")
		assert.Empty(t, arr)
	})

	t.Run("returns populated list", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.BudgetService{
			ListFn: func(_ context.Context, _ int64) ([]models.Budget, error) {
				return []models.Budget{fixedBudget()}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/api/v1/budgets", "")
		injectUser(c, fixedAuthUser())
		h := budget.NewHandler(svc, log)

		require.NoError(t, h.List(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		arr, ok := parseResp(t, rec.Body.String()).Data.([]any)
		require.True(t, ok)
		assert.Len(t, arr, 1)
	})
}

// TestHandler_Delete covers DELETE /api/v1/budgets/:id (idempotent).
func TestHandler_Delete(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.BudgetService{
			SoftDeleteFn: func(_ context.Context, _ int64) error { return nil },
		}
		c, rec := newCtx(e, http.MethodDelete, "/api/v1/budgets/10", "")
		c.SetParamNames("id")
		c.SetParamValues("10")
		h := budget.NewHandler(svc, log)

		require.NoError(t, h.Delete(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "budget deleted successfully", resp.Msg)
	})

	t.Run("invalid id returns 404", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodDelete, "/api/v1/budgets/notanid", "")
		c.SetParamNames("id")
		c.SetParamValues("notanid")
		h := budget.NewHandler(nil, log)

		require.NoError(t, h.Delete(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})
}

// TestHandler_Patch covers empty PATCH body rejection.
func TestHandler_Patch(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("empty body returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPatch, "/api/v1/budgets/10", `{}`)
		c.SetParamNames("id")
		c.SetParamValues("10")
		membership := models.BudgetUser{UserID: testUserID, BudgetID: testBudgetID, Role: models.RoleOwner}
		injectMembership(c, membership)
		h := budget.NewHandler(nil, log)

		require.NoError(t, h.Patch(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Equal(t, "validation failed", parseResp(t, rec.Body.String()).Msg)
	})
}
