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

package account

import (
	"errors"
	"strconv"
	"unicode/utf8"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// membershipContextKey is the Echo context key used by budget.RequireBudgetAccess
// to store the resolved BudgetUser. Duplicated here to avoid an import cycle
// (budget → validator → account → budget). The value must stay in sync with
// budget.membershipContextKey.
const membershipContextKey = "budget_membership"

// membershipFromContext reads the BudgetUser injected by the budget authz
// middleware from the Echo context. Returns (zero, false) if not present.
func membershipFromContext(c echo.Context) (models.BudgetUser, bool) {
	v := c.Get(membershipContextKey)
	m, ok := v.(models.BudgetUser)
	return m, ok
}

const (
	fieldBody      = "body"
	fieldBudgetID  = "budget_id"
	fieldAccountID = "id"
	errInvalidJSON = "invalid JSON"
	errInvalidID   = "must be a positive integer"

	maxAccountNameLen = 255
)

// Handler exposes the account domain over HTTP.
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

// parseAccountID extracts and parses the :id path parameter.
func parseAccountID(c echo.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64) //nolint:wrapcheck
}

// validateName checks that name is non-empty and within the length limit.
func validateName(name string) *httpx.FieldError {
	n := utf8.RuneCountInString(name)
	if n == 0 {
		return &httpx.FieldError{Field: "name", Error: "must not be empty"}
	}
	if n > maxAccountNameLen {
		return &httpx.FieldError{Field: "name", Error: "must not exceed 255 characters"}
	}
	return nil
}

// validateType checks that the type string is a recognized AccountType.
func validateType(t models.AccountType) *httpx.FieldError {
	if !t.IsValid() {
		return &httpx.FieldError{Field: "type", Error: "must be one of CHECKING, SAVINGS, CREDIT_CARD, CASH, LOAN"}
	}
	return nil
}

// validateIsOnBudgetForType returns a field error when the caller explicitly
// sets is_on_budget=true for a liability account type (CREDIT_CARD or LOAN).
func validateIsOnBudgetForType(isOnBudget *bool, t models.AccountType) *httpx.FieldError {
	if isOnBudget != nil && *isOnBudget && t.IsLiability() {
		return &httpx.FieldError{Field: "is_on_budget", Error: "must be false for CREDIT_CARD and LOAN account types"}
	}
	return nil
}

// validateCreateRequest validates the payload for POST (create).
func validateCreateRequest(req CreateRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if fe := validateName(req.Name); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateType(req.Type); fe != nil {
		errs = append(errs, *fe)
	}
	if req.InitialBalance.Int64() < 0 {
		errs = append(errs, httpx.FieldError{Field: "initial_balance", Error: "must be non-negative"})
	}
	if fe := validateIsOnBudgetForType(req.IsOnBudget, req.Type); fe != nil {
		errs = append(errs, *fe)
	}
	return errs
}

// validateReplaceRequest validates the payload for PUT (full replace).
func validateReplaceRequest(req ReplaceRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if fe := validateName(req.Name); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateType(req.Type); fe != nil {
		errs = append(errs, *fe)
	}
	if fe := validateIsOnBudgetForType(req.IsOnBudget, req.Type); fe != nil {
		errs = append(errs, *fe)
	}
	return errs
}

// validatePatchRequest validates the payload for PATCH (partial update).
//
//nolint:revive
func validatePatchRequest(req PatchRequest) []httpx.FieldError {
	if req.Name == nil && req.Type == nil && req.RequiresRecon == nil &&
		req.IsOnBudget == nil && req.IsImmutable == nil && req.Notes == nil &&
		req.AccountNumber == nil && req.Institution == nil && req.Archived == nil {
		return []httpx.FieldError{{Field: fieldBody, Error: "request body must contain at least one field"}}
	}
	var errs []httpx.FieldError
	if req.Name != nil {
		if fe := validateName(*req.Name); fe != nil {
			errs = append(errs, *fe)
		}
	}
	if req.Type != nil {
		if fe := validateType(*req.Type); fe != nil {
			errs = append(errs, *fe)
		} else if fe := validateIsOnBudgetForType(req.IsOnBudget, *req.Type); fe != nil {
			errs = append(errs, *fe)
		}
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

// ListAccounts handles GET /api/v1/budgets/:budget_id/accounts.
func (h *Handler) ListAccounts(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	archived, fe := parseStatusFilter(c)
	if fe != nil {
		return httpx.ValidationError(c, []httpx.FieldError{*fe})
	}

	accounts, err := h.svc.List(c.Request().Context(), budgetID, archived)
	if err != nil {
		h.log.Error("List accounts failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, accounts, "accounts fetched successfully")
}

// GetAccount handles GET /api/v1/budgets/:budget_id/accounts/:id.
func (h *Handler) GetAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	acc, err := h.svc.GetByID(c.Request().Context(), id, budgetID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "account not found")
		}
		h.log.Error("GetByID failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, acc, "account fetched successfully")
}

// CreateAccount handles POST /api/v1/budgets/:budget_id/accounts.
func (h *Handler) CreateAccount(c echo.Context) error {
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

	acc, err := h.svc.Create(c.Request().Context(), budgetID, req)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "account name already in use")
		}
		h.log.Error("Create account failed",
			zap.Int64("budget_id", budgetID),
			zap.String("name", req.Name),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.Created(c, acc, "account created successfully")
}

// ReplaceAccount handles PUT /api/v1/budgets/:budget_id/accounts/:id.
//
//nolint:revive
func (h *Handler) ReplaceAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	var req ReplaceRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validateReplaceRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	acc, err := h.svc.Replace(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "account not found")
		}
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "account name already in use")
		}
		h.log.Error("Replace account failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, acc, "account updated successfully")
}

// PatchAccount handles PATCH /api/v1/budgets/:budget_id/accounts/:id.
//
//nolint:revive
func (h *Handler) PatchAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	var req PatchRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validatePatchRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	acc, err := h.svc.Patch(c.Request().Context(), id, budgetID, req, membership.Role)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "account not found")
		}
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "account name already in use")
		}
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		if errors.Is(err, ErrArchiveNonZeroBalance) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: "balance", Error: "must be zero before archiving"}})
		}
		h.log.Error("Patch account failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, acc, "account updated successfully")
}

// DeleteAccount handles DELETE /api/v1/budgets/:budget_id/accounts/:id.
func (h *Handler) DeleteAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.Delete(c.Request().Context(), id, budgetID, membership.Role); err != nil {
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		h.log.Error("Delete account failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "account deleted successfully")
}

// ReconcileAccount handles POST /api/v1/budgets/:budget_id/accounts/:id/reconcile.
func (h *Handler) ReconcileAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	acc, err := h.svc.Reconcile(c.Request().Context(), id, budgetID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "account not found")
		}
		h.log.Error("Reconcile account failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, acc, "account reconciled successfully")
}

// ArchiveAccount handles POST /api/v1/budgets/:budget_id/accounts/:id/archive.
//
//nolint:revive
func (h *Handler) ArchiveAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	acc, err := h.svc.Archive(c.Request().Context(), id, budgetID, membership.Role)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "account not found")
		}
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		if errors.Is(err, ErrArchiveNonZeroBalance) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: "balance", Error: "must be zero before archiving"}})
		}
		h.log.Error("Archive account failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, acc, "account archived successfully")
}

// UnarchiveAccount handles POST /api/v1/budgets/:budget_id/accounts/:id/unarchive.
//
//nolint:revive
func (h *Handler) UnarchiveAccount(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseAccountID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	acc, err := h.svc.Unarchive(c.Request().Context(), id, budgetID, membership.Role)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "account not found")
		}
		if errors.Is(err, ErrForbidden) {
			return httpx.Forbidden(c, "insufficient role")
		}
		h.log.Error("Unarchive account failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, acc, "account unarchived successfully")
}
