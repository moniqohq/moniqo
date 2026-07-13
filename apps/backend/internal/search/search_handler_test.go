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

package search_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/search"
)

func newSearchCtx(e *echo.Echo, target string, withUser bool) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(http.MethodGet, target, nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("budget_id")
	c.SetParamValues("10")
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

func TestHandler_Search_Success(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.SearchService{
		SearchFn: func(_ context.Context, budgetID, userID int64, query string, _ int) (search.Results, error) {
			assert.Equal(t, testBudgetID, budgetID)
			assert.Equal(t, testUserID, userID)
			assert.Equal(t, "groc", query)
			return search.Results{
				Transactions: []search.TxnHit{{ID: 1, AccountName: "Checking"}},
				Accounts:     []search.AccountHit{},
				Envelopes:    []search.EnvelopeHit{{ID: 2, Title: "Groceries"}},
				Budgets:      []search.BudgetHit{},
			}, nil
		},
	}

	c, rec := newSearchCtx(e, "/?q=groc", true)
	require.NoError(t, search.NewHandler(svc, zap.NewNop()).Search(c))
	assert.Equal(t, http.StatusOK, rec.Code)

	resp := parseResp(t, rec.Body.String())
	assert.True(t, resp.Success)
	assert.Equal(t, "search results fetched successfully", resp.Msg)
}

func TestHandler_Search_ShortQueryReturns400(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.SearchService{
		SearchFn: func(_ context.Context, _, _ int64, _ string, _ int) (search.Results, error) {
			return search.Results{}, search.ErrValidation
		},
	}

	c, rec := newSearchCtx(e, "/?q=a", true)
	require.NoError(t, search.NewHandler(svc, zap.NewNop()).Search(c))
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.False(t, parseResp(t, rec.Body.String()).Success)
}

func TestHandler_Search_MissingUserReturns401(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.SearchService{
		SearchFn: func(_ context.Context, _, _ int64, _ string, _ int) (search.Results, error) {
			t.Fatal("service should not be called without an authenticated user")
			return search.Results{}, nil
		},
	}

	c, rec := newSearchCtx(e, "/?q=groc", false)
	require.NoError(t, search.NewHandler(svc, zap.NewNop()).Search(c))
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestHandler_Search_InvalidBudgetIDReturns400(t *testing.T) {
	t.Parallel()
	e := echo.New()

	svc := &internalmock.SearchService{}
	req := httptest.NewRequest(http.MethodGet, "/?q=groc", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("budget_id")
	c.SetParamValues("not-an-int")
	c.Set(string(auth.ContextKeyUser), &models.User{ID: testUserID})

	require.NoError(t, search.NewHandler(svc, zap.NewNop()).Search(c))
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}
