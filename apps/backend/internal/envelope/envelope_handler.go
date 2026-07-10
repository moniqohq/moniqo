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

package envelope

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"strconv"
	"time"
	"unicode/utf8"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// membershipContextKey is the Echo context key used by budget.RequireBudgetAccess
// to store the resolved BudgetUser. Must stay in sync with budget.membershipContextKey.
const membershipContextKey = "budget_membership"

// membershipFromContext reads the BudgetUser injected by the budget authz middleware.
func membershipFromContext(c echo.Context) (models.BudgetUser, bool) {
	v := c.Get(membershipContextKey)
	m, ok := v.(models.BudgetUser)
	return m, ok
}

const (
	fieldBody       = "body"
	fieldBudgetID   = "budget_id"
	fieldEnvelopeID = "id"
	errInvalidJSON  = "invalid JSON"
	errInvalidID    = "must be a positive integer"

	errTitleLen         = "must be between 3 and 80 characters"
	errMustBeNonNeg     = "must be non-negative"
	errAllocatedLtSpent = "cannot be less than the amount already spent"
	fieldTitle          = "title"
	fieldAllocatedAmt   = "allocated_amt"
)

// Handler exposes the envelope domain over HTTP.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a Handler wired to svc and log.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// parseBudgetID extracts and parses the :budget_id path parameter.
func parseBudgetID(c echo.Context) (int64, error) {
	return strconv.ParseInt(c.Param("budget_id"), 10, 64) //nolint:wrapcheck
}

// parseEnvelopeID extracts and parses the :id path parameter.
func parseEnvelopeID(c echo.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64) //nolint:wrapcheck
}

// validateCreateRequest validates the payload for POST (create).
func validateCreateRequest(req CreateRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	n := utf8.RuneCountInString(req.Title)
	if n < minTitleLen || n > maxTitleLen {
		errs = append(errs, httpx.FieldError{Field: fieldTitle, Error: errTitleLen})
	}
	if req.AllocatedAmt.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAllocatedAmt, Error: errMustBeNonNeg})
	}
	return errs
}

// validateReplaceRequest validates the payload for PUT (full replace).
func validateReplaceRequest(req ReplaceRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	n := utf8.RuneCountInString(req.Title)
	if n < minTitleLen || n > maxTitleLen {
		errs = append(errs, httpx.FieldError{Field: fieldTitle, Error: errTitleLen})
	}
	if req.AllocatedAmt.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAllocatedAmt, Error: errMustBeNonNeg})
	}
	return errs
}

// validatePatchRequest validates the payload for PATCH (partial update).
// Rejects empty bodies and any body containing a "spent_amt" key.
//
//nolint:revive,cyclop
func validatePatchRequest(req PatchRequest, rawBody []byte) []httpx.FieldError {
	if req.Title == nil && req.AllocatedAmt == nil && req.Description == nil {
		return []httpx.FieldError{{Field: fieldBody, Error: "request body must contain at least one field"}}
	}

	var raw map[string]json.RawMessage
	if json.Unmarshal(rawBody, &raw) == nil {
		if _, ok := raw["spent_amt"]; ok {
			return []httpx.FieldError{{Field: "spent_amt", Error: "spent_amt is read-only and cannot be set"}}
		}
	}

	var errs []httpx.FieldError
	if req.Title != nil {
		n := utf8.RuneCountInString(*req.Title)
		if n < minTitleLen || n > maxTitleLen {
			errs = append(errs, httpx.FieldError{Field: fieldTitle, Error: errTitleLen})
		}
	}
	if req.AllocatedAmt != nil && req.AllocatedAmt.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAllocatedAmt, Error: errMustBeNonNeg})
	}
	return errs
}

// parseStatusFilter parses the ?status query param into an archived filter:
// "active" (default) -> false, "archived" -> true, "all" -> nil.
func parseStatusFilter(c echo.Context) (*bool, *httpx.FieldError) {
	switch status := c.QueryParam("status"); status {
	case "", "active":
		active := false
		return &active, nil
	case "archived":
		archived := true
		return &archived, nil
	case "all":
		return nil, nil
	default:
		return nil, &httpx.FieldError{Field: "status", Error: "must be one of active, archived, all"}
	}
}

// ListEnvelopes handles GET /api/v1/budgets/:budget_id/envelopes.
func (h *Handler) ListEnvelopes(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	archived, fe := parseStatusFilter(c)
	if fe != nil {
		return httpx.ValidationError(c, []httpx.FieldError{*fe})
	}

	envelopes, err := h.svc.List(c.Request().Context(), budgetID, archived)
	if err != nil {
		h.log.Error("List envelopes failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, envelopes, "budget envelopes fetched successfully")
}

// GetEnvelope handles GET /api/v1/budgets/:budget_id/envelopes/:id.
func (h *Handler) GetEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errInvalidID}})
	}

	env, err := h.svc.GetByID(c.Request().Context(), id, budgetID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "budget envelope not found")
		}
		h.log.Error("GetByID failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, env, "budget envelope fetched successfully")
}

// CreateEnvelope handles POST /api/v1/budgets/:budget_id/envelopes.
func (h *Handler) CreateEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validateCreateRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	env, err := h.svc.Create(c.Request().Context(), budgetID, req)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "envelope title already in use")
		}
		h.log.Error("Create envelope failed",
			zap.Int64("budget_id", budgetID),
			zap.String("title", req.Title),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.Created(c, env, "budget envelope created successfully")
}

// ReplaceEnvelope handles PUT /api/v1/budgets/:budget_id/envelopes/:id.
//
//nolint:revive
func (h *Handler) ReplaceEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errInvalidID}})
	}

	var req ReplaceRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validateReplaceRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	env, err := h.svc.Replace(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "budget envelope not found")
		}
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "envelope title already in use")
		}
		if errors.Is(err, ErrValidation) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAllocatedAmt, Error: errAllocatedLtSpent}})
		}
		h.log.Error("Replace envelope failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, env, "budget envelope updated successfully")
}

// PatchEnvelope handles PATCH /api/v1/budgets/:budget_id/envelopes/:id.
//
//nolint:revive
func (h *Handler) PatchEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errInvalidID}})
	}

	// Read the raw body once so we can both inspect keys and bind.
	rawBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}
	// Restore body so Echo's binder can read it.
	c.Request().Body = io.NopCloser(bytes.NewBuffer(rawBytes))

	var req PatchRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validatePatchRequest(req, rawBytes); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	env, err := h.svc.Patch(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "budget envelope not found")
		}
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "envelope title already in use")
		}
		if errors.Is(err, ErrValidation) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAllocatedAmt, Error: errAllocatedLtSpent}})
		}
		h.log.Error("Patch envelope failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, env, "budget envelope updated successfully")
}

// DeleteEnvelope handles DELETE /api/v1/budgets/:budget_id/envelopes/:id.
func (h *Handler) DeleteEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.Delete(c.Request().Context(), id, budgetID, membership.Role); err != nil {
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		h.log.Error("Delete envelope failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "budget envelope deleted successfully")
}

// ForceDeleteEnvelope handles DELETE /api/v1/budgets/:budget_id/envelopes/:id/force.
func (h *Handler) ForceDeleteEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.ForceDelete(c.Request().Context(), id, budgetID, membership.Role); err != nil {
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		h.log.Error("Force delete envelope failed",
			zap.Int64("envelope_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "budget envelope force deleted successfully")
}

// GetBudgetSummary handles GET /api/v1/budgets/:budget_id/summary.
func (h *Handler) GetBudgetSummary(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	summary, err := h.svc.GetBudgetSummary(c.Request().Context(), budgetID)
	if err != nil {
		h.log.Error("GetBudgetSummary failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, summary, "budget summary fetched successfully")
}

// GetDashboardStats handles GET /api/v1/budgets/:budget_id/dashboard.
// Accepts an optional ?month=YYYY-MM query param; defaults to the current month.
func (h *Handler) GetDashboardStats(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	month := time.Now()
	if raw := c.QueryParam("month"); raw != "" {
		parsed, parseErr := time.Parse("2006-01", raw)
		if parseErr != nil {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: "month", Error: "must be in YYYY-MM format"}})
		}
		month = parsed
	}

	stats, err := h.svc.GetDashboardStats(c.Request().Context(), budgetID, month)
	if err != nil {
		h.log.Error("GetDashboardStats failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, stats, "dashboard stats fetched successfully")
}
