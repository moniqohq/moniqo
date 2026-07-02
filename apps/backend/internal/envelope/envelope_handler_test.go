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

package envelope_test

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

	"github.com/moniqohq/moniqo/apps/backend/internal/envelope"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
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
	return models.BudgetUser{
		ID:       1,
		BudgetID: testBudgetID,
		UserID:   99,
		Role:     role,
	}
}

func fixedEnvelope() models.BudgetEnvelope {
	return models.BudgetEnvelope{
		ID:           testEnvelopeID,
		BudgetID:     testBudgetID,
		Title:        "Groceries",
		AllocatedAmt: money.FromMinorUnits(50000),
		SpentAmt:     money.FromMinorUnits(0),
		IsOverspent:  false,
	}
}

func fixedSummary() models.BudgetSummary {
	return models.BudgetSummary{
		ToBeBudgeted:       money.FromMinorUnits(40000),
		TotalAllocated:     money.FromMinorUnits(60000),
		TotalSpent:         money.FromMinorUnits(20000),
		OverspentEnvelopes: 0,
	}
}

// ---------------------------------------------------------------------------
// TestHandler_ListEnvelopes
// ---------------------------------------------------------------------------

func TestHandler_ListEnvelopes(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200 with envelopes", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			ListFn: func(_ context.Context, _ int64) ([]models.BudgetEnvelope, error) {
				return []models.BudgetEnvelope{fixedEnvelope()}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).ListEnvelopes(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		resp := parseResp(t, rec.Body.String())
		assert.True(t, resp.Success)
		assert.Equal(t, "budget envelopes fetched successfully", resp.Msg)
	})

	t.Run("empty list returns 200 with empty array", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			ListFn: func(_ context.Context, _ int64) ([]models.BudgetEnvelope, error) {
				return []models.BudgetEnvelope{}, nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).ListEnvelopes(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		arr, ok := parseResp(t, rec.Body.String()).Data.([]any)
		require.True(t, ok)
		assert.Empty(t, arr)
	})

	t.Run("invalid budget_id returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("abc")

		require.NoError(t, envelope.NewHandler(svc, log).ListEnvelopes(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_GetEnvelope
// ---------------------------------------------------------------------------

func TestHandler_GetEnvelope(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			GetByIDFn: func(_ context.Context, _, _ int64) (models.BudgetEnvelope, error) {
				return fixedEnvelope(), nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).GetEnvelope(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "budget envelope fetched successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			GetByIDFn: func(_ context.Context, _, _ int64) (models.BudgetEnvelope, error) {
				return models.BudgetEnvelope{}, envelope.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "999")

		require.NoError(t, envelope.NewHandler(svc, log).GetEnvelope(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("invalid id returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "abc")

		require.NoError(t, envelope.NewHandler(svc, log).GetEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_CreateEnvelope
// ---------------------------------------------------------------------------

func TestHandler_CreateEnvelope(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 201", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			CreateFn: func(_ context.Context, _ int64, _ envelope.CreateRequest) (models.BudgetEnvelope, error) {
				return fixedEnvelope(), nil
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", `{"title":"Groceries","allocated_amt":500.00}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).CreateEnvelope(c))
		assert.Equal(t, http.StatusCreated, rec.Code)
		assert.Equal(t, "budget envelope created successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("duplicate title returns 409", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			CreateFn: func(_ context.Context, _ int64, _ envelope.CreateRequest) (models.BudgetEnvelope, error) {
				return models.BudgetEnvelope{}, envelope.ErrConflict
			},
		}
		c, rec := newCtx(e, http.MethodPost, "/", `{"title":"Taken","allocated_amt":100.00}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).CreateEnvelope(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})

	t.Run("title too short returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodPost, "/", `{"title":"AB","allocated_amt":100.00}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).CreateEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("negative allocated_amt returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodPost, "/", `{"title":"Valid","allocated_amt":-1.00}`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).CreateEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("malformed JSON returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodPost, "/", `{bad json`)
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).CreateEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_ReplaceEnvelope
// ---------------------------------------------------------------------------

func TestHandler_ReplaceEnvelope(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ envelope.ReplaceRequest) (models.BudgetEnvelope, error) {
				return fixedEnvelope(), nil
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/", `{"title":"Groceries","allocated_amt":600.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).ReplaceEnvelope(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "budget envelope updated successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("not found returns 404", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ envelope.ReplaceRequest) (models.BudgetEnvelope, error) {
				return models.BudgetEnvelope{}, envelope.ErrNotFound
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/", `{"title":"Groceries","allocated_amt":600.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "999")

		require.NoError(t, envelope.NewHandler(svc, log).ReplaceEnvelope(c))
		assert.Equal(t, http.StatusNotFound, rec.Code)
	})

	t.Run("title conflict returns 409", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ envelope.ReplaceRequest) (models.BudgetEnvelope, error) {
				return models.BudgetEnvelope{}, envelope.ErrConflict
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/", `{"title":"Taken","allocated_amt":600.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).ReplaceEnvelope(c))
		assert.Equal(t, http.StatusConflict, rec.Code)
	})

	t.Run("allocated_amt < spent returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			ReplaceFn: func(_ context.Context, _, _ int64, _ envelope.ReplaceRequest) (models.BudgetEnvelope, error) {
				return models.BudgetEnvelope{}, envelope.ErrValidation
			},
		}
		c, rec := newCtx(e, http.MethodPut, "/", `{"title":"Food","allocated_amt":1.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).ReplaceEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_PatchEnvelope
// ---------------------------------------------------------------------------

func TestHandler_PatchEnvelope(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success partial update returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			PatchFn: func(_ context.Context, _, _ int64, _ envelope.PatchRequest) (models.BudgetEnvelope, error) {
				return fixedEnvelope(), nil
			},
		}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"title":"New Title"}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).PatchEnvelope(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("empty body returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).PatchEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("spent_amt in body returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"spent_amt":100.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).PatchEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("allocated_amt < spent returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			PatchFn: func(_ context.Context, _, _ int64, _ envelope.PatchRequest) (models.BudgetEnvelope, error) {
				return models.BudgetEnvelope{}, envelope.ErrValidation
			},
		}
		c, rec := newCtx(e, http.MethodPatch, "/", `{"allocated_amt":1.00}`)
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")

		require.NoError(t, envelope.NewHandler(svc, log).PatchEnvelope(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_DeleteEnvelope
// ---------------------------------------------------------------------------

func TestHandler_DeleteEnvelope(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error { return nil },
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))

		require.NoError(t, envelope.NewHandler(svc, log).DeleteEnvelope(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "budget envelope deleted successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("idempotent — already deleted returns 200", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error { return nil },
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleOwner))

		require.NoError(t, envelope.NewHandler(svc, log).DeleteEnvelope(c))
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("viewer role returns 403", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error {
				return envelope.ErrForbidden
			},
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleViewer))

		require.NoError(t, envelope.NewHandler(svc, log).DeleteEnvelope(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("editor role returns 403", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			DeleteFn: func(_ context.Context, _, _ int64, _ models.Role) error {
				return envelope.ErrForbidden
			},
		}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		injectMembership(c, fixedMembership(models.RoleEditor))

		require.NoError(t, envelope.NewHandler(svc, log).DeleteEnvelope(c))
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("no membership in context returns 401", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodDelete, "/", "")
		c.SetParamNames("budget_id", "id")
		c.SetParamValues("10", "1")
		// no injectMembership call

		require.NoError(t, envelope.NewHandler(svc, log).DeleteEnvelope(c))
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
}

// ---------------------------------------------------------------------------
// TestHandler_GetBudgetSummary
// ---------------------------------------------------------------------------

func TestHandler_GetBudgetSummary(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	e := echo.New()

	t.Run("success returns 200 with summary", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{
			GetBudgetSummaryFn: func(_ context.Context, _ int64) (models.BudgetSummary, error) {
				return fixedSummary(), nil
			},
		}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("10")

		require.NoError(t, envelope.NewHandler(svc, log).GetBudgetSummary(c))
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "budget summary fetched successfully", parseResp(t, rec.Body.String()).Msg)
	})

	t.Run("invalid budget_id returns 400", func(t *testing.T) {
		t.Parallel()
		svc := &internalmock.EnvelopeService{}
		c, rec := newCtx(e, http.MethodGet, "/", "")
		c.SetParamNames("budget_id")
		c.SetParamValues("abc")

		require.NoError(t, envelope.NewHandler(svc, log).GetBudgetSummary(c))
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}
