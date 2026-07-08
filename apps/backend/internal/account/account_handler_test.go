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

package account_test

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

	"github.com/moniqohq/moniqo/apps/backend/internal/account"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// ---------------------------------------------------------------------------
// Handler test helpers
// ---------------------------------------------------------------------------

func newCtx(e *echo.Echo, method, path, body string) (echo.Context, *httptest.ResponseRecorder) {
	t := strings.NewReader(body)
	req := httptest.NewRequest(method, path, t)
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
	return models.BudgetUser{
		ID:       1,
		BudgetID: testBudgetID,
		UserID:   99,
		Role:     role,
	}
}

// ---------------------------------------------------------------------------
// TestHandler_ListAccounts
// ---------------------------------------------------------------------------

func TestHandler_ListAccounts(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200 with accounts", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ListFn: func(_ context.Context, _ int64, _ *bool) ([]models.Account, error) {
				return []models.Account{makeAccount("Acc1"), makeAccount("Acc2")}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "accounts fetched successfully", resp.Msg)
		arr, ok := resp.Data.([]any)
		require.True(t, ok, "data must be an array")
		assert.Len(t, arr, 2)
	})

	t.Run("empty list returns 200 with empty array", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ListFn: func(_ context.Context, _ int64, _ *bool) ([]models.Account, error) {
				return []models.Account{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		arr, ok := resp.Data.([]any)
		require.True(t, ok, "data must be an array, not null")
		assert.Empty(t, arr)
	})

	t.Run("invalid budget_id returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("abc")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_GetAccount
// ---------------------------------------------------------------------------

func TestHandler_GetAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			GetByIDFn: func(_ context.Context, _, _ int64) (models.Account, error) {
				return makeAccount("Main"), nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.GetAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.True(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			GetByIDFn: func(_ context.Context, _, _ int64) (models.Account, error) {
				return models.Account{}, account.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.GetAccount(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("invalid account id returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "abc")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.GetAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_CreateAccount
// ---------------------------------------------------------------------------

func TestHandler_CreateAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 201", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			CreateFn: func(_ context.Context, _ int64, _ account.CreateRequest) (models.Account, error) {
				return makeAccount("New"), nil
			},
		}
		body := `{"name":"New","type":"CHECKING"}`
		c, rec := newCtx(e, http.MethodPost, "/", body)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.CreateAccount(c))
		assert.Equal(t, http.StatusCreated, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "account created successfully", resp.Msg)
	})

	t.Run("invalid JSON returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPost, "/", `{bad json`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.CreateAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("empty name returns 400", func(t *testing.T) {
		t.Parallel()
		body := `{"name":"","type":"CHECKING"}`
		c, rec := newCtx(e, http.MethodPost, "/", body)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.CreateAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Equal(t, "validation failed", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("invalid type returns 400", func(t *testing.T) {
		t.Parallel()
		body := `{"name":"Test","type":"INVALID"}`
		c, rec := newCtx(e, http.MethodPost, "/", body)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.CreateAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Equal(t, "validation failed", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("name conflict returns 409", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			CreateFn: func(_ context.Context, _ int64, _ account.CreateRequest) (models.Account, error) {
				return models.Account{}, account.ErrConflict
			},
		}
		body := `{"name":"Taken","type":"CHECKING"}`
		c, rec := newCtx(e, http.MethodPost, "/", body)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.CreateAccount(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("credit card with is_on_budget true returns 400", func(t *testing.T) {
		t.Parallel()
		body := `{"name":"CC","type":"CREDIT_CARD","is_on_budget":true}`
		c, rec := newCtx(e, http.MethodPost, "/", body)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.CreateAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Equal(t, "validation failed", parseResp(t, rec.Body.String()).Msg)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_ReplaceAccount
// ---------------------------------------------------------------------------

func TestHandler_ReplaceAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ account.ReplaceRequest) (models.Account, error) {
				return makeAccount("Updated"), nil
			},
		}
		body := `{"name":"Updated","type":"CHECKING"}`
		c, rec := newCtx(e, http.MethodPut, "/", body)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ReplaceAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.True(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ account.ReplaceRequest) (models.Account, error) {
				return models.Account{}, account.ErrNotFound
			},
		}
		body := `{"name":"Gone","type":"CHECKING"}`
		c, rec := newCtx(e, http.MethodPut, "/", body)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ReplaceAccount(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("conflict returns 409", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ account.ReplaceRequest) (models.Account, error) {
				return models.Account{}, account.ErrConflict
			},
		}
		body := `{"name":"Taken","type":"CHECKING"}`
		c, rec := newCtx(e, http.MethodPut, "/", body)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ReplaceAccount(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_PatchAccount
// ---------------------------------------------------------------------------

func TestHandler_PatchAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		notes := "my note"
		svc := &internalmock.AccountService{
			PatchFn: func(_ context.Context, _, _ int64, req account.PatchRequest, _ models.Role) (models.Account, error) {
				a := makeAccount("Main")
				a.Notes = req.Notes
				return a, nil
			},
		}
		body := `{"notes":"my note"}`
		c, rec := newCtx(e, http.MethodPatch, "/", body)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleEditor))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.PatchAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		dataMap, ok := resp.Data.(map[string]any)
		require.True(t, ok)
		assert.Equal(t, notes, dataMap["notes"])
	})

	t.Run("empty body returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPatch, "/", `{}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.PatchAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		assert.Equal(t, "validation failed", parseResp(t, rec.Body.String()).Msg)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_DeleteAccount
// ---------------------------------------------------------------------------

func TestHandler_DeleteAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error { return nil },
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.DeleteAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "account deleted successfully", resp.Msg)
	})

	t.Run("forbidden returns 403", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error {
				return account.ErrForbidden
			},
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleViewer))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.DeleteAccount(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("no membership in context returns 401", func(t *testing.T) {
		t.Parallel()
		// Membership is deliberately not injected.
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.DeleteAccount(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_ReconcileAccount
// ---------------------------------------------------------------------------

func TestHandler_ReconcileAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ReconcileFn: func(_ context.Context, _, _ int64) (models.Account, error) {
				return makeAccount("Main"), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ReconcileAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "account reconciled successfully", resp.Msg)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ReconcileFn: func(_ context.Context, _, _ int64) (models.Account, error) {
				return models.Account{}, account.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ReconcileAccount(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
		assert.False(t, parseResp(t, rec.Body.String()).Success)
	})

	t.Run("invalid account id returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "abc")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.ReconcileAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_ListAccounts_StatusFilter
// ---------------------------------------------------------------------------

func TestHandler_ListAccounts_StatusFilter(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("invalid status returns 400", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodGet, "/?status=bogus", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("status=archived passes true filter", func(t *testing.T) {
		t.Parallel()
		var gotArchived *bool
		svc := &internalmock.AccountService{
			ListFn: func(_ context.Context, _ int64, archived *bool) ([]models.Account, error) {
				gotArchived = archived
				return []models.Account{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/?status=archived", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		require.NotNil(t, gotArchived)
		assert.True(t, *gotArchived)
	})

	t.Run("status=all passes nil filter", func(t *testing.T) {
		t.Parallel()
		called := false
		svc := &internalmock.AccountService{
			ListFn: func(_ context.Context, _ int64, archived *bool) ([]models.Account, error) {
				called = true
				assert.Nil(t, archived)
				return []models.Account{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/?status=all", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.True(t, called)
	})

	t.Run("default status passes false filter", func(t *testing.T) {
		t.Parallel()
		var gotArchived *bool
		svc := &internalmock.AccountService{
			ListFn: func(_ context.Context, _ int64, archived *bool) ([]models.Account, error) {
				gotArchived = archived
				return []models.Account{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ListAccounts(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		require.NotNil(t, gotArchived)
		assert.False(t, *gotArchived)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_ArchiveAccount
// ---------------------------------------------------------------------------

func TestHandler_ArchiveAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ArchiveFn: func(_ context.Context, _, _ int64, _ models.Role) (models.Account, error) {
				a := makeAccount("Main")
				a.IsArchived = true
				return a, nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ArchiveAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "account archived successfully", resp.Msg)
	})

	t.Run("forbidden returns 403", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ArchiveFn: func(_ context.Context, _, _ int64, _ models.Role) (models.Account, error) {
				return models.Account{}, account.ErrForbidden
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleEditor))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ArchiveAccount(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("non-zero balance returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ArchiveFn: func(_ context.Context, _, _ int64, _ models.Role) (models.Account, error) {
				return models.Account{}, account.ErrArchiveNonZeroBalance
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ArchiveAccount(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			ArchiveFn: func(_ context.Context, _, _ int64, _ models.Role) (models.Account, error) {
				return models.Account{}, account.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.ArchiveAccount(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("no membership returns 401", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.ArchiveAccount(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_UnarchiveAccount
// ---------------------------------------------------------------------------

func TestHandler_UnarchiveAccount(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			UnarchiveFn: func(_ context.Context, _, _ int64, _ models.Role) (models.Account, error) {
				return makeAccount("Main"), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.UnarchiveAccount(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "account unarchived successfully", resp.Msg)
	})

	t.Run("forbidden returns 403", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.AccountService{
			UnarchiveFn: func(_ context.Context, _, _ int64, _ models.Role) (models.Account, error) {
				return models.Account{}, account.ErrForbidden
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleEditor))
		h := account.NewHandler(svc, log)

		require.NoError(t, h.UnarchiveAccount(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("no membership returns 401", func(t *testing.T) {
		t.Parallel()
		c, rec := newCtx(e, http.MethodPost, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		h := account.NewHandler(nil, log)

		require.NoError(t, h.UnarchiveAccount(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
}
