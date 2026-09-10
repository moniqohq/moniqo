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
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
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

	errTitleRequired  = "title is required"
	errTitleLen       = "must be between 3 and 80 characters"
	errMustBeNonNeg   = "must be non-negative"
	errNatureInvalid  = "must be one of want, should, need, must"
	fieldTitle        = "title"
	fieldAllocatedAmt = "allocated_amt"
	fieldNature       = "nature"

	errInsufficientAvailable = "source does not have enough available balance to cover this amount"
	fieldAmount              = "amount"

	// maxEchoedValueLen bounds how much of a caller-supplied value is echoed back in an
	// error message, so an oversized or malicious payload can't inflate the response.
	maxEchoedValueLen = 60
)

// truncate shortens s to at most maxEchoedValueLen runes, appending an ellipsis marker
// when truncation occurs, so values echoed back in error messages stay bounded.
func truncate(s string) string {
	r := []rune(s)
	if len(r) <= maxEchoedValueLen {
		return s
	}
	return string(r[:maxEchoedValueLen]) + "…"
}

// readOnlyKeyErrors inspects the raw JSON body for keys that are read-only on
// update (e.g. spent_amt, nature) and returns a field error for each one present,
// regardless of whether c.Bind populated a matching struct field.
func readOnlyKeyErrors(rawBody []byte, keys ...string) []httpx.FieldError {
	var raw map[string]json.RawMessage
	if json.Unmarshal(rawBody, &raw) != nil {
		return nil
	}
	var errs []httpx.FieldError
	for _, key := range keys {
		if _, ok := raw[key]; ok {
			errs = append(errs, httpx.FieldError{Field: key, Error: key + " is read-only and cannot be set"})
		}
	}
	return errs
}

// mismatchedJSONField reports the first field in raw whose JSON kind (string vs.
// non-string) doesn't match the kind expected by envelope create/update requests,
// ignoring an explicit null (which any nilable field accepts) and unknown fields.
func mismatchedJSONField(raw map[string]json.RawMessage) (field string, wantString, found bool) {
	// For each JSON body field accepted by envelope create/update requests, whether
	// the field is expected to be a JSON string.
	kinds := map[string]bool{
		fieldTitle:        true,
		fieldAllocatedAmt: false,
		"description":     true,
		fieldNature:       true,
	}
	for name, wantStr := range kinds {
		v, ok := raw[name]
		if !ok {
			continue
		}
		s := strings.TrimSpace(string(v))
		if s == "null" || strings.HasPrefix(s, `"`) == wantStr {
			continue
		}
		return name, wantStr, true
	}
	return "", false, false
}

// bindErrorField inspects rawBody's top-level keys to identify which known field has a
// JSON value of the wrong kind (e.g. a string where a number is expected), so a bind
// failure can name the offending field instead of the opaque "body"/"invalid JSON".
// Falls back to the generic body/invalid-JSON error when the body isn't an object at
// all, or no known field looks mismatched.
func bindErrorField(rawBody []byte) httpx.FieldError {
	var raw map[string]json.RawMessage
	if json.Unmarshal(rawBody, &raw) != nil {
		return httpx.FieldError{Field: fieldBody, Error: errInvalidJSON}
	}

	field, wantString, found := mismatchedJSONField(raw)
	if !found {
		return httpx.FieldError{Field: fieldBody, Error: errInvalidJSON}
	}
	kind := "a number"
	if wantString {
		kind = "a string"
	}
	return httpx.FieldError{Field: field, Error: "must be " + kind}
}

// summarizeFieldErrors builds a descriptive top-level msg from one or more field errors,
// replacing the generic "validation failed" string with something that names the field(s)
// and rule(s) that failed.
func summarizeFieldErrors(errs []httpx.FieldError) string {
	switch len(errs) {
	case 0:
		return "validation failed"
	case 1:
		return errs[0].Field + " " + errs[0].Error
	default:
		fields := make([]string, len(errs))
		for i, fe := range errs {
			fields[i] = fe.Field
		}
		return fmt.Sprintf("%d fields failed validation: %s", len(errs), strings.Join(fields, ", "))
	}
}

// validationError writes a 400 response for errs with a msg summarizing the failure(s),
// naming the failing field(s) instead of a generic message.
func validationError(c echo.Context, errs []httpx.FieldError) error {
	return httpx.ValidationErrorMsg(c, errs, summarizeFieldErrors(errs))
}

// Handler exposes the envelope domain over HTTP.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a Handler wired to svc and log.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// errNotPositive signals that a path-parameter ID parsed as an integer but was not
// positive. Its text is never shown to the caller — the handler builds a descriptive
// field error (naming the field and echoing the offending raw value) whenever this or
// a strconv parse error is returned.
var errNotPositive = errors.New("id must be a positive integer")

// parseBudgetID extracts and parses the :budget_id path parameter, rejecting zero
// and negative values.
func parseBudgetID(c echo.Context) (int64, error) {
	return parsePositiveID(c.Param("budget_id"))
}

// parseEnvelopeID extracts and parses the :id path parameter, rejecting zero and
// negative values.
func parseEnvelopeID(c echo.Context) (int64, error) {
	return parsePositiveID(c.Param("id"))
}

// parsePositiveID parses raw as a positive int64.
func parsePositiveID(raw string) (int64, error) {
	id, err := strconv.ParseInt(raw, 10, 64) //nolint:wrapcheck
	if err != nil {
		return 0, err //nolint:wrapcheck
	}
	if id <= 0 {
		return 0, errNotPositive
	}
	return id, nil
}

// budgetIDFieldError builds a descriptive field error for an invalid :budget_id,
// echoing the raw value that was received.
func budgetIDFieldError(c echo.Context) httpx.FieldError {
	return httpx.FieldError{
		Field: fieldBudgetID,
		Error: fmt.Sprintf("%s (got %q)", errInvalidID, truncate(c.Param("budget_id"))),
	}
}

// envelopeIDFieldError builds a descriptive field error for an invalid :id,
// echoing the raw value that was received.
func envelopeIDFieldError(c echo.Context) httpx.FieldError {
	return httpx.FieldError{
		Field: fieldEnvelopeID,
		Error: fmt.Sprintf("%s (got %q)", errInvalidID, truncate(c.Param("id"))),
	}
}

// validateTitle checks title length constraints, distinguishing a missing title
// from one that is merely too short or too long.
func validateTitle(title string) *httpx.FieldError {
	n := utf8.RuneCountInString(title)
	switch {
	case n == 0:
		return &httpx.FieldError{Field: fieldTitle, Error: errTitleRequired}
	case n < minTitleLen || n > maxTitleLen:
		return &httpx.FieldError{Field: fieldTitle, Error: titleLenError(n)}
	default:
		return nil
	}
}

// validateCreateRequest validates the payload for POST (create).
func validateCreateRequest(req CreateRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if fe := validateTitle(req.Title); fe != nil {
		errs = append(errs, *fe)
	}
	if req.AllocatedAmt.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAllocatedAmt, Error: nonNegError(req.AllocatedAmt)})
	}
	if req.Nature != nil && !validNature(*req.Nature) {
		errs = append(errs, httpx.FieldError{Field: fieldNature, Error: natureError(*req.Nature)})
	}
	return errs
}

// validateReplaceRequest validates the payload for PUT (full replace).
// Rejects any body containing a "nature" key: nature is set once at creation
// and is immutable thereafter.
func validateReplaceRequest(req ReplaceRequest, rawBody []byte) []httpx.FieldError {
	if errs := readOnlyKeyErrors(rawBody, fieldNature); len(errs) > 0 {
		return errs
	}

	var errs []httpx.FieldError
	if fe := validateTitle(req.Title); fe != nil {
		errs = append(errs, *fe)
	}
	if req.AllocatedAmt.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAllocatedAmt, Error: nonNegError(req.AllocatedAmt)})
	}
	return errs
}

// validatePatchRequest validates the payload for PATCH (partial update).
// Rejects any body containing a "spent_amt" or "nature" key (both are
// read-only on update), then rejects empty bodies, then validates provided fields.
//
//nolint:revive,cyclop
func validatePatchRequest(req PatchRequest, rawBody []byte) []httpx.FieldError {
	if errs := readOnlyKeyErrors(rawBody, "spent_amt", fieldNature); len(errs) > 0 {
		return errs
	}

	if req.Title == nil && req.AllocatedAmt == nil && req.Description == nil {
		return []httpx.FieldError{{Field: fieldBody, Error: "must contain at least one of title, allocated_amt, description"}}
	}

	var errs []httpx.FieldError
	if req.Title != nil {
		if fe := validateTitle(*req.Title); fe != nil {
			errs = append(errs, *fe)
		}
	}
	if req.AllocatedAmt != nil && req.AllocatedAmt.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAllocatedAmt, Error: nonNegError(*req.AllocatedAmt)})
	}
	return errs
}

// titleLenError describes the title-length rule, naming the length actually received.
func titleLenError(gotLen int) string {
	return fmt.Sprintf("%s (got %d)", errTitleLen, gotLen)
}

// nonNegError describes the non-negative rule, echoing the offending amount.
func nonNegError(got money.Amount) string {
	return fmt.Sprintf("%s (got %s)", errMustBeNonNeg, formatAmount(got))
}

// natureError describes the nature-enum rule, echoing the offending value.
func natureError(got string) string {
	return fmt.Sprintf("%s (got %q)", errNatureInvalid, truncate(got))
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
		return nil, &httpx.FieldError{
			Field: "status",
			Error: fmt.Sprintf("must be one of active, archived, all (got %q)", truncate(status)),
		}
	}
}

// ListEnvelopes handles GET /api/v1/budgets/:budget_id/envelopes.
func (h *Handler) ListEnvelopes(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	archived, fe := parseStatusFilter(c)
	if fe != nil {
		return validationError(c, []httpx.FieldError{*fe})
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{envelopeIDFieldError(c)})
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
// mapEnvelopeServiceError maps the envelope-service sentinel errors shared
// across Create/Replace/Patch/Delete/ForceDelete into their HTTP response.
// Returns ok=false if err doesn't match any of them.
func mapEnvelopeServiceError(c echo.Context, err error) (ok bool, resp error) {
	var belowSpent *AllocatedBelowSpentError
	if errors.As(err, &belowSpent) {
		return true, validationError(c, []httpx.FieldError{{Field: fieldAllocatedAmt, Error: belowSpent.Error()}})
	}
	switch {
	case errors.Is(err, ErrNotFound):
		return true, httpx.NotFound(c, "budget envelope not found")
	case errors.Is(err, ErrConflict):
		return true, httpx.Conflict(c, "envelope title already in use")
	case errors.Is(err, ErrForbidden):
		return true, httpx.Forbidden(c, "insufficient role")
	case errors.Is(err, ErrBudgetArchived):
		return true, httpx.Conflict(c, "budget is archived")
	case errors.Is(err, ErrValidation):
		return true, validationError(c, []httpx.FieldError{{Field: fieldAllocatedAmt, Error: errMustBeNonNeg}})
	default:
		return false, nil
	}
}

// CreateEnvelope handles POST /api/v1/budgets/:budget_id/envelopes.
func (h *Handler) CreateEnvelope(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	// Read the raw body once so a bind failure can name the offending field.
	rawBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return validationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}
	c.Request().Body = io.NopCloser(bytes.NewBuffer(rawBytes))

	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return validationError(c, []httpx.FieldError{bindErrorField(rawBytes)})
	}

	if errs := validateCreateRequest(req); len(errs) > 0 {
		return validationError(c, errs)
	}

	env, err := h.svc.Create(c.Request().Context(), budgetID, req)
	if err != nil {
		if ok, resp := mapEnvelopeServiceError(c, err); ok {
			return resp
		}
		if errors.Is(err, ErrBudgetArchived) {
			return httpx.Conflict(c, "budget is archived")
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{envelopeIDFieldError(c)})
	}

	// Read the raw body once so we can both inspect keys and bind.
	rawBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return validationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}
	// Restore body so Echo's binder can read it.
	c.Request().Body = io.NopCloser(bytes.NewBuffer(rawBytes))

	var req ReplaceRequest
	if err := c.Bind(&req); err != nil {
		return validationError(c, []httpx.FieldError{bindErrorField(rawBytes)})
	}

	if errs := validateReplaceRequest(req, rawBytes); len(errs) > 0 {
		return validationError(c, errs)
	}

	env, err := h.svc.Replace(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if ok, resp := mapEnvelopeServiceError(c, err); ok {
			return resp
		}
		if errors.Is(err, ErrBudgetArchived) {
			return httpx.Conflict(c, "budget is archived")
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{envelopeIDFieldError(c)})
	}

	// Read the raw body once so we can both inspect keys and bind.
	rawBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return validationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}
	// Restore body so Echo's binder can read it.
	c.Request().Body = io.NopCloser(bytes.NewBuffer(rawBytes))

	var req PatchRequest
	if err := c.Bind(&req); err != nil {
		return validationError(c, []httpx.FieldError{bindErrorField(rawBytes)})
	}

	if errs := validatePatchRequest(req, rawBytes); len(errs) > 0 {
		return validationError(c, errs)
	}

	env, err := h.svc.Patch(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if ok, resp := mapEnvelopeServiceError(c, err); ok {
			return resp
		}
		if errors.Is(err, ErrBudgetArchived) {
			return httpx.Conflict(c, "budget is archived")
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{envelopeIDFieldError(c)})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.Delete(c.Request().Context(), id, budgetID, membership.Role); err != nil {
		if ok, resp := mapEnvelopeServiceError(c, err); ok {
			return resp
		}
		if errors.Is(err, ErrBudgetArchived) {
			return httpx.Conflict(c, "budget is archived")
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	id, err := parseEnvelopeID(c)
	if err != nil {
		return validationError(c, []httpx.FieldError{envelopeIDFieldError(c)})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.ForceDelete(c.Request().Context(), id, budgetID, membership.Role); err != nil {
		if ok, resp := mapEnvelopeServiceError(c, err); ok {
			return resp
		}
		if errors.Is(err, ErrBudgetArchived) {
			return httpx.Conflict(c, "budget is archived")
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
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
		return validationError(c, []httpx.FieldError{budgetIDFieldError(c)})
	}

	month := time.Now()
	if raw := c.QueryParam("month"); raw != "" {
		parsed, parseErr := time.Parse("2006-01", raw)
		if parseErr != nil {
			return validationError(c, []httpx.FieldError{
				{Field: "month", Error: fmt.Sprintf("must be in YYYY-MM format (got %q)", truncate(raw))},
			})
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

// validateReallocateRequest validates the payload for POST .../envelopes/reallocate.
func validateReallocateRequest(req ReallocateRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if req.Amount.Int64() <= 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAmount, Error: "must be greater than zero"})
	}
	if req.FromEnvelopeID == nil && req.ToEnvelopeID == nil {
		errs = append(errs, httpx.FieldError{Field: fieldBody, Error: "at least one of from_envelope_id, to_envelope_id is required"})
	}
	if req.FromEnvelopeID != nil && req.ToEnvelopeID != nil && *req.FromEnvelopeID == *req.ToEnvelopeID {
		errs = append(errs, httpx.FieldError{Field: fieldBody, Error: "from_envelope_id and to_envelope_id must differ"})
	}
	return errs
}

// ReallocateEnvelopes handles POST /api/v1/budgets/:budget_id/envelopes/reallocate.
//
//nolint:revive
func (h *Handler) ReallocateEnvelopes(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	var req ReallocateRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validateReallocateRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	result, err := h.svc.Reallocate(c.Request().Context(), budgetID, req, membership.Role)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "budget envelope not found")
		}
		if errors.Is(err, ErrValidation) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAmount, Error: errInsufficientAvailable}})
		}
		h.log.Error("Reallocate failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, result, "envelopes reallocated successfully")
}
