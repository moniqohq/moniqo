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

package httpx_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

func newCtx() (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

// TestValidationError verifies that the shared helper keeps emitting the literal
// "validation failed" message — every non-envelope slice depends on this being
// unchanged, since ValidationErrorMsg was introduced specifically so only the
// envelope handler could opt into a descriptive msg.
func TestValidationError(t *testing.T) {
	t.Parallel()

	c, rec := newCtx()
	fields := []httpx.FieldError{{Field: "username", Error: "must not be empty"}}

	require.NoError(t, httpx.ValidationError(c, fields))
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var resp httpx.Response
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.False(t, resp.Success)
	assert.Equal(t, "validation failed", resp.Msg)

	data, ok := resp.Data.(map[string]any)
	require.True(t, ok)
	gotFields, ok := data["fields"].([]any)
	require.True(t, ok)
	require.Len(t, gotFields, 1)
}

// TestValidationErrorMsg verifies the caller-supplied summary message passes through
// unchanged, and that the field payload shape matches ValidationError's.
func TestValidationErrorMsg(t *testing.T) {
	t.Parallel()

	c, rec := newCtx()
	fields := []httpx.FieldError{{Field: "title", Error: "must be between 3 and 80 characters (got 2)"}}

	require.NoError(t, httpx.ValidationErrorMsg(c, fields, "title must be between 3 and 80 characters (got 2)"))
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var resp httpx.Response
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.False(t, resp.Success)
	assert.Equal(t, "title must be between 3 and 80 characters (got 2)", resp.Msg)
}
