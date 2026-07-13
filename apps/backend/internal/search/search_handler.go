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

package search

import (
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

const (
	fieldBudgetID = "budget_id"
	errInvalidID  = "must be a positive integer"
	errShortQuery = "search query must be at least 2 characters"
)

// Handler exposes the search domain over HTTP.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a Handler wired to svc and log.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// parseOptionalLimit parses the limit query param; returns 0 (service default)
// when the value is missing or invalid.
func parseOptionalLimit(s string) int {
	if s == "" {
		return 0
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 1 {
		return 0
	}
	return v
}

// Search handles GET /api/v1/budgets/:budget_id/search.
func (h *Handler) Search(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("budget_id"), 10, 64)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	query := c.QueryParam("q")
	limit := parseOptionalLimit(c.QueryParam("limit"))

	results, err := h.svc.Search(c.Request().Context(), budgetID, user.ID, query, limit)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return httpx.BadRequest(c, errShortQuery)
		}
		h.log.Error("Search failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, results, "search results fetched successfully")
}
