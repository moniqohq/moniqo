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

package transaction_test

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

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
	"github.com/moniqohq/moniqo/apps/backend/internal/transaction"
)

// ---------------------------------------------------------------------------
// Handler test helpers
// ---------------------------------------------------------------------------

func newCtx(e *echo.Echo, method, path, body string) (echo.Context, *httptest.ResponseRecorder) {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func injectMembership(c echo.Context, m models.BudgetUser) {
	c.Set("budget_membership", m)
}

func parseResp(tb testing.TB, body string) httpx.Response {
	tb.Helper()
	var resp httpx.Response
	require.NoError(tb, json.Unmarshal([]byte(body), &resp))
	return resp
}

func fixedMembership(role models.Role) models.BudgetUser {
	return models.BudgetUser{ID: 1, BudgetID: testBudgetID, UserID: 99, Role: role}
}

// ---------------------------------------------------------------------------
// TestHandler_ListTransactions
// ---------------------------------------------------------------------------

func TestHandler_ListTransactions(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200 with meta", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			ListFn: func(_ context.Context, _ int64, _ transaction.ListFilters) ([]models.Transaction, int, error) {
				return []models.Transaction{makeTxnWithEnvelope(-100000)}, 1, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp httpx.PaginatedResponse
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
		assert.True(t, resp.Success)
		assert.Equal(t, "transactions fetched successfully", resp.Msg)
		assert.Equal(t, 1, resp.Meta.Total)
	})

	t.Run("empty list returns 200 with empty array", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			ListFn: func(_ context.Context, _ int64, _ transaction.ListFilters) ([]models.Transaction, int, error) {
				return []models.Transaction{}, 0, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp httpx.PaginatedResponse
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
		arr, ok := resp.Data.([]any)
		require.True(t, ok)
		assert.Empty(t, arr)
	})

	t.Run("invalid budget_id returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("abc")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_GetTransaction
// ---------------------------------------------------------------------------

func TestHandler_GetTransaction(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			GetByIDFn: func(_ context.Context, _, _ int64) (models.Transaction, error) {
				return makeTxnWithEnvelope(-100000), nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).GetTransaction(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "transaction fetched successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			GetByIDFn: func(_ context.Context, _, _ int64) (models.Transaction, error) {
				return models.Transaction{}, transaction.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "999")

		require.NoError(t, transaction.NewHandler(svc, log).GetTransaction(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_CreateTransaction
// ---------------------------------------------------------------------------

func TestHandler_CreateTransaction(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("standard create returns 201", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return makeTxnWithEnvelope(-150000), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-1500.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusCreated, rec.Code)
		assert.Equal(t, "transaction created successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("transfer create returns 201", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateTransferFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return makeTxn(-500000), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"transfer_account_id":6,"amount":-5000.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusCreated, rec.Code)
	})

	t.Run("zero amount returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":0,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("missing envelope for non-transfer returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("transfer with envelope returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"transfer_account_id":6,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_ReplaceTransaction
// ---------------------------------------------------------------------------

func TestHandler_ReplaceTransaction(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ transaction.ReplaceRequest) (models.Transaction, error) {
				return makeTxnWithEnvelope(-200000), nil
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-2000.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).ReplaceTransaction(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "transaction updated successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ transaction.ReplaceRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-2000.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "999")

		require.NoError(t, transaction.NewHandler(svc, log).ReplaceTransaction(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_PatchTransaction
// ---------------------------------------------------------------------------

func TestHandler_PatchTransaction(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("partial update returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			PatchFn: func(_ context.Context, _, _ int64, _ transaction.PatchRequest) (models.Transaction, error) {
				return makeTxnWithEnvelope(-250000), nil
			},
		}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"amount":-2500.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("empty body returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("spent_amt in body returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"spent_amt":100.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_DeleteTransaction
// ---------------------------------------------------------------------------

func TestHandler_DeleteTransaction(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error { return nil },
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))

		require.NoError(t, transaction.NewHandler(svc, log).DeleteTransaction(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "transaction deleted successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("idempotent — already deleted returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error { return nil },
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))

		require.NoError(t, transaction.NewHandler(svc, log).DeleteTransaction(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("viewer role returns 403", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error {
				return transaction.ErrForbidden
			},
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleViewer))

		require.NoError(t, transaction.NewHandler(svc, log).DeleteTransaction(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("no membership in context returns 401", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).DeleteTransaction(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("locked account returns 409 with message", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error {
				return transaction.ErrAccountLocked
			},
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))

		require.NoError(t, transaction.NewHandler(svc, log).DeleteTransaction(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.False(t, resp.Success)
		assert.NotEmpty(t, resp.Msg)
	})
}

// Compile-time check that money import is used.
var _ = money.FromMinorUnits
