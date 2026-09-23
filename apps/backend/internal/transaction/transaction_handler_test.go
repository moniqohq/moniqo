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
	"time"

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

// fieldErrors extracts the []httpx.FieldError payload from a validation-error
// response's data.fields, so tests can assert which field failed and why.
func fieldErrors(tb testing.TB, resp httpx.Response) []httpx.FieldError {
	tb.Helper()
	raw, err := json.Marshal(resp.Data)
	require.NoError(tb, err)
	var wrapper struct {
		Fields []httpx.FieldError `json:"fields"`
	}
	require.NoError(tb, json.Unmarshal(raw, &wrapper))
	return wrapper.Fields
}

// findFieldError returns the FieldError for field, failing the test if absent.
func findFieldError(tb testing.TB, errs []httpx.FieldError, field string) httpx.FieldError {
	tb.Helper()
	for _, e := range errs {
		if e.Field == field {
			return e
		}
	}
	tb.Fatalf("no field error for %q in %+v", field, errs)
	return httpx.FieldError{}
}

// assertFieldError asserts that body is a validation-error envelope whose
// first field error is for the given field.
func assertFieldError(tb testing.TB, body, field string) {
	tb.Helper()
	resp := parseResp(tb, body)
	assert.False(tb, resp.Success)
	data, ok := resp.Data.(map[string]any)
	require.True(tb, ok, "expected data to be an object")
	fields, ok := data["fields"].([]any)
	require.True(tb, ok, "expected data.fields to be an array")
	require.NotEmpty(tb, fields)
	first, ok := fields[0].(map[string]any)
	require.True(tb, ok)
	assert.Equal(tb, field, first["field"])
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

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "budget_id")
		assert.Contains(t, fe.Error, "positive integer")
		assert.Contains(t, fe.Error, `"abc"`)
	})

	t.Run("query params map onto ListFilters", func(t *testing.T) {
		t.Parallel()
		var got transaction.ListFilters
		svc := &internalmock.TransactionService{
			ListFn: func(_ context.Context, _ int64, f transaction.ListFilters) ([]models.Transaction, int, error) {
				got = f
				return []models.Transaction{}, 0, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet,
			"/?account_id=42&budget_envelope_id=7&date_from=2026-01-01T00:00:00Z&date_to=2026-02-01T00:00:00Z&page=2&page_size=10",
			"")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		require.NotNil(t, got.AccountID)
		assert.Equal(t, int64(42), *got.AccountID)
		require.NotNil(t, got.EnvelopeID)
		assert.Equal(t, int64(7), *got.EnvelopeID)
		require.NotNil(t, got.DateFrom)
		assert.Equal(t, "2026-01-01T00:00:00Z", got.DateFrom.Format(time.RFC3339))
		require.NotNil(t, got.DateTo)
		assert.Equal(t, "2026-02-01T00:00:00Z", got.DateTo.Format(time.RFC3339))
		assert.Equal(t, 2, got.Page)
		assert.Equal(t, 10, got.PageSize)
		assert.False(t, got.IncludeArchived)
	})

	t.Run("include_archived=true maps to IncludeArchived true", func(t *testing.T) {
		t.Parallel()
		var got transaction.ListFilters
		svc := &internalmock.TransactionService{
			ListFn: func(_ context.Context, _ int64, f transaction.ListFilters) ([]models.Transaction, int, error) {
				got = f
				return []models.Transaction{}, 0, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/?include_archived=true", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.True(t, got.IncludeArchived)
	})

	t.Run("include_archived omitted defaults to false", func(t *testing.T) {
		t.Parallel()
		var got transaction.ListFilters
		svc := &internalmock.TransactionService{
			ListFn: func(_ context.Context, _ int64, f transaction.ListFilters) ([]models.Transaction, int, error) {
				got = f
				return []models.Transaction{}, 0, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.False(t, got.IncludeArchived)
	})

	t.Run("include_archived malformed value defaults to false", func(t *testing.T) {
		t.Parallel()
		var got transaction.ListFilters
		svc := &internalmock.TransactionService{
			ListFn: func(_ context.Context, _ int64, f transaction.ListFilters) ([]models.Transaction, int, error) {
				got = f
				return []models.Transaction{}, 0, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/?include_archived=not-a-bool", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).ListTransactions(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.False(t, got.IncludeArchived)
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

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "amount")
		assert.Contains(t, fe.Error, "non-zero")
	})

	t.Run("missing envelope for non-transfer expense returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "budget_envelope_id")
		assert.Contains(t, fe.Error, "required for non-transfer transactions")
	})

	t.Run("income without envelope returns 201", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return makeTxn(150000), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"amount":1500.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusCreated, rec.Code)
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

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "budget_envelope_id")
		assert.Contains(t, fe.Error, "must be omitted when transfer_account_id is set")
	})

	t.Run("self-transfer returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"transfer_account_id":5,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "transfer_account_id")
		assert.Contains(t, fe.Error, "must differ from account_id")
	})

	t.Run("invalid budget_id param names the field and received value", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/", `{}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("not-a-number")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "budget_id")
		assert.Contains(t, fe.Error, `"not-a-number"`)
	})

	t.Run("amount sent as a string names the field and received value", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":"1500","date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "amount")
		assert.Contains(t, fe.Error, "JSON number")
		assert.Contains(t, fe.Error, `"1500"`)
	})

	t.Run("malformed date names the field and received value", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"01-03-2026"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "date")
		assert.Contains(t, fe.Error, "RFC 3339")
		assert.Contains(t, fe.Error, `"01-03-2026"`)
	})

	t.Run("account_id sent as a string names the field", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":"5","budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "account_id")
		assert.Contains(t, fe.Error, "JSON integer")
		assert.Contains(t, fe.Error, `"5"`)
	})

	t.Run("status sent as a number names the field", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z","status":1}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "status")
		assert.Contains(t, fe.Error, "uncleared, cleared, reconciled")
	})

	t.Run("multiple bad fields are all reported together", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":"5","amount":"1500","date":"01-03-2026"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		errs := fieldErrors(t, parseResp(t, rec.Body.String()))
		findFieldError(t, errs, "account_id")
		findFieldError(t, errs, "amount")
		findFieldError(t, errs, "date")
	})

	t.Run("malformed JSON syntax returns a body-level error", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPost, "/", `{"account_id":5,`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "body")
		assert.Contains(t, fe.Error, "malformed JSON")
	})

	t.Run("service field violation surfaces the specific field and reason", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.NewFieldViolation(
					"account_id", "account does not belong to this budget", transaction.ErrValidation)
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "account_id")
		assert.Equal(t, "account does not belong to this budget", fe.Error)
	})

	t.Run("service field conflict returns 409 with the specific reason", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateTransferFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.NewFieldViolation(
					"transfer_account_id", "must differ from account_id; a transfer requires two distinct accounts",
					transaction.ErrConflict)
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"transfer_account_id":6,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusConflict, rec.Code)

		resp := parseResp(t, rec.Body.String())
		assert.False(t, resp.Success)
		assert.Contains(t, resp.Msg, "must differ from account_id")
	})

	t.Run("bare ErrValidation from service still returns 400 (regression)", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.ErrValidation
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("bare ErrConflict from service still returns 409 (regression)", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.ErrConflict
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})

	t.Run("archived envelope returns 400 with budget_envelope_id field error", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.ErrEnvelopeArchived
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assertFieldError(t, rec.Body.String(), "budget_envelope_id")
	})

	t.Run("envelope not in budget returns 400 with budget_envelope_id field error", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			CreateFn: func(_ context.Context, _ int64, _ transaction.CreateRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.ErrEnvelopeNotFound
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-100.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, transaction.NewHandler(svc, log).CreateTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assertFieldError(t, rec.Body.String(), "budget_envelope_id")
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

	t.Run("invalid id param names the field and received value", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPut, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-2000.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "xyz")

		require.NoError(t, transaction.NewHandler(svc, log).ReplaceTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "id")
		assert.Contains(t, fe.Error, `"xyz"`)
	})

	t.Run("amount sent as a string names the field", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPut, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":"2000","date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).ReplaceTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "amount")
		assert.Contains(t, fe.Error, `"2000"`)
	})

	t.Run("service field violation surfaces the specific field and reason", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ transaction.ReplaceRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.NewFieldViolation(
					"account_id", "account does not belong to this budget", transaction.ErrValidation)
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-2000.00,"date":"2026-03-01T00:00:00Z"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).ReplaceTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "account_id")
		assert.Equal(t, "account does not belong to this budget", fe.Error)
	})

	t.Run("invalid status returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ transaction.ReplaceRequest) (models.Transaction, error) {
				t.Fatal("service should not be called when status is invalid")
				return models.Transaction{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/",
			`{"account_id":5,"budget_envelope_id":3,"amount":-2000.00,"date":"2026-03-01T00:00:00Z","status":"pending"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).ReplaceTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
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

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "body")
		assert.Contains(t, fe.Error, "at least one updatable field")
	})

	t.Run("spent_amt in body returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"spent_amt":100.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "spent_amt")
		assert.Contains(t, fe.Error, "read-only")
	})

	t.Run("amount sent as a string names the field", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"amount":"2500"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "amount")
		assert.Contains(t, fe.Error, `"2500"`)
	})

	t.Run("invalid id param names the field and received value", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"amount":-2500.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "xyz")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "id")
		assert.Contains(t, fe.Error, `"xyz"`)
	})

	t.Run("service field violation surfaces the specific field and reason", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.TransactionService{
			PatchFn: func(_ context.Context, _, _ int64, _ transaction.PatchRequest) (models.Transaction, error) {
				return models.Transaction{}, transaction.NewFieldViolation(
					"account_id", "account does not belong to this budget", transaction.ErrValidation)
			},
		}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"amount":-2500.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, transaction.NewHandler(svc, log).PatchTransaction(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)

		fe := findFieldError(t, fieldErrors(t, parseResp(t, rec.Body.String())), "account_id")
		assert.Equal(t, "account does not belong to this budget", fe.Error)
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
