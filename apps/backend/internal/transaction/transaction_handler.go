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

package transaction

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

const (
	membershipContextKey = "budget_membership"
	fieldBody            = "body"
	fieldBudgetID        = "budget_id"
	fieldTransactionID   = "id"
	errInvalidJSON       = "invalid JSON"
	errInvalidID         = "must be a positive integer"
	errAmountNonZero     = "amount must be non-zero"
	errEnvelopeRequired  = "budget_envelope_id is required for non-transfer expense transactions"
	errTransferConflict  = "transfer_account_id and budget_envelope_id are mutually exclusive"
	errSelfTransfer      = "transfer_account_id must differ from account_id"
	errValidationFailed  = "validation failed"

	fieldAmount        = "amount"
	fieldEnvelopeID    = "budget_envelope_id"
	fieldStatus        = "status"
	fieldAccountID     = "account_id"
	errInvalidStatus   = "must be one of uncleared, cleared, reconciled"
	errAccountArchived = "account is archived and cannot accept new transactions"
	errAccountLocked   = "account has transaction locking enabled; unlock the account to delete this transaction"

	defaultPageSize = 20
)

// Handler exposes the transaction domain over HTTP.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a Handler wired to svc and log.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

func membershipFromContext(c echo.Context) (models.BudgetUser, bool) {
	v := c.Get(membershipContextKey)
	m, ok := v.(models.BudgetUser)
	return m, ok
}

func parseBudgetID(c echo.Context) (int64, error) {
	return strconv.ParseInt(c.Param("budget_id"), 10, 64) //nolint:wrapcheck
}

func parseTransactionID(c echo.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64) //nolint:wrapcheck
}

func parseOptionalInt64(s string) *int64 {
	if s == "" {
		return nil
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return nil
	}
	return &v
}

func parseOptionalTime(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return nil
	}
	return &t
}

func parseOptionalPage(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 1 {
		return defaultVal
	}
	return v
}

// appendStatusError appends a field error to errs if status is set but invalid.
func appendStatusError(errs []httpx.FieldError, status *models.TransactionStatus) []httpx.FieldError {
	if status != nil && !status.IsValid() {
		errs = append(errs, httpx.FieldError{Field: fieldStatus, Error: errInvalidStatus})
	}
	return errs
}

// validateCreateRequest validates POST/transfer body.
//
//nolint:revive
func validateCreateRequest(req CreateRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if req.AccountID <= 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAccountID, Error: errInvalidID})
	}
	if req.Amount.Int64() == 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAmount, Error: errAmountNonZero})
	}
	if req.Date.IsZero() {
		errs = append(errs, httpx.FieldError{Field: "date", Error: "must be a valid date"})
	}
	if req.TransferAccountID != nil {
		// Transfer: envelope must be absent, no self-transfer
		if req.EnvelopeID != nil {
			errs = append(errs, httpx.FieldError{Field: fieldEnvelopeID, Error: errTransferConflict})
		}
		if *req.TransferAccountID == req.AccountID {
			errs = append(errs, httpx.FieldError{Field: "transfer_account_id", Error: errSelfTransfer})
		}
	} else if req.EnvelopeID == nil && req.Amount.Int64() < 0 {
		// Standard expense: envelope required. Income flows to "To Be Budgeted"
		// and is not required to reference an envelope.
		errs = append(errs, httpx.FieldError{Field: fieldEnvelopeID, Error: errEnvelopeRequired})
	}
	return appendStatusError(errs, req.Status)
}

// validateReplaceRequest validates PUT body.
func validateReplaceRequest(req ReplaceRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if req.AccountID <= 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAccountID, Error: errInvalidID})
	}
	if req.Amount.Int64() == 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAmount, Error: errAmountNonZero})
	}
	if req.Date.IsZero() {
		errs = append(errs, httpx.FieldError{Field: "date", Error: "must be a valid date"})
	}
	if req.TransferAccountID != nil && req.EnvelopeID != nil {
		errs = append(errs, httpx.FieldError{Field: fieldEnvelopeID, Error: errTransferConflict})
	}
	if req.TransferAccountID != nil && *req.TransferAccountID == req.AccountID {
		errs = append(errs, httpx.FieldError{Field: "transfer_account_id", Error: errSelfTransfer})
	}
	return appendStatusError(errs, req.Status)
}

// validatePatchRequest validates PATCH body; also checks raw bytes for amount=0.
//
//nolint:revive
func validatePatchRequest(req PatchRequest, rawBody []byte) []httpx.FieldError {
	if req.AccountID == nil && req.TransferAccountID == nil && req.EnvelopeID == nil &&
		req.Amount == nil && req.Date == nil && req.Status == nil && req.Memo == nil {
		return []httpx.FieldError{{Field: fieldBody, Error: "request body must contain at least one field"}}
	}

	// Reject explicit spend_amt key.
	var raw map[string]json.RawMessage
	if json.Unmarshal(rawBody, &raw) == nil {
		if _, ok := raw["spent_amt"]; ok {
			return []httpx.FieldError{{Field: "spent_amt", Error: "spent_amt is read-only"}}
		}
	}

	var errs []httpx.FieldError
	if req.Amount != nil && req.Amount.Int64() == 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAmount, Error: errAmountNonZero})
	}
	if req.Status != nil && !req.Status.IsValid() {
		errs = append(errs, httpx.FieldError{Field: fieldStatus, Error: errInvalidStatus})
	}
	return errs
}

// ListTransactions handles GET /api/v1/budgets/:budget_id/transactions.
func (h *Handler) ListTransactions(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	f := ListFilters{
		AccountID:  parseOptionalInt64(c.QueryParam("account_id")),
		EnvelopeID: parseOptionalInt64(c.QueryParam("budget_envelope_id")),
		DateFrom:   parseOptionalTime(c.QueryParam("date_from")),
		DateTo:     parseOptionalTime(c.QueryParam("date_to")),
		Page:       parseOptionalPage(c.QueryParam("page"), 1),
		PageSize:   parseOptionalPage(c.QueryParam("page_size"), defaultPageSize),
	}

	txns, total, err := h.svc.List(c.Request().Context(), budgetID, f)
	if err != nil {
		h.log.Error("List transactions failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	page, pageSize := normalisePage(f.Page, f.PageSize)
	return httpx.OKPaginated(c, txns, httpx.PaginationMeta{
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	}, "transactions fetched successfully")
}

// GetTransaction handles GET /api/v1/budgets/:budget_id/transactions/:id.
func (h *Handler) GetTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldTransactionID, Error: errInvalidID}})
	}

	txn, err := h.svc.GetByID(c.Request().Context(), id, budgetID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "transaction not found")
		}
		h.log.Error("GetByID failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, txn, "transaction fetched successfully")
}

// CreateTransaction handles POST /api/v1/budgets/:budget_id/transactions.
// Routes to CreateTransfer when transfer_account_id is present.
//
//nolint:revive,cyclop
func (h *Handler) CreateTransaction(c echo.Context) error {
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

	var txn models.Transaction
	if req.TransferAccountID != nil {
		txn, err = h.svc.CreateTransfer(c.Request().Context(), budgetID, req)
	} else {
		txn, err = h.svc.Create(c.Request().Context(), budgetID, req)
	}
	if err != nil {
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "transaction business rule violation")
		}
		if errors.Is(err, ErrValidation) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errValidationFailed}})
		}
		if errors.Is(err, ErrAccountArchived) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errAccountArchived}})
		}
		h.log.Error("Create transaction failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.Created(c, txn, "transaction created successfully")
}

// ReplaceTransaction handles PUT /api/v1/budgets/:budget_id/transactions/:id.
//
//nolint:revive
func (h *Handler) ReplaceTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldTransactionID, Error: errInvalidID}})
	}

	var req ReplaceRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validateReplaceRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	txn, err := h.svc.Replace(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "transaction not found")
		}
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "transaction business rule violation")
		}
		if errors.Is(err, ErrValidation) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errValidationFailed}})
		}
		if errors.Is(err, ErrAccountArchived) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errAccountArchived}})
		}
		h.log.Error("Replace transaction failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, txn, "transaction updated successfully")
}

// PatchTransaction handles PATCH /api/v1/budgets/:budget_id/transactions/:id.
//
//nolint:revive
func (h *Handler) PatchTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldTransactionID, Error: errInvalidID}})
	}

	rawBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}
	c.Request().Body = io.NopCloser(bytes.NewBuffer(rawBytes))

	var req PatchRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validatePatchRequest(req, rawBytes); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	txn, err := h.svc.Patch(c.Request().Context(), id, budgetID, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.NotFound(c, "transaction not found")
		}
		if errors.Is(err, ErrConflict) {
			return httpx.Conflict(c, "transaction business rule violation")
		}
		if errors.Is(err, ErrValidation) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errValidationFailed}})
		}
		if errors.Is(err, ErrAccountArchived) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errAccountArchived}})
		}
		h.log.Error("Patch transaction failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return httpx.InternalError(c)
	}

	return httpx.OK(c, txn, "transaction updated successfully")
}

// DeleteTransaction handles DELETE /api/v1/budgets/:budget_id/transactions/:id.
func (h *Handler) DeleteTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBudgetID, Error: errInvalidID}})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldTransactionID, Error: errInvalidID}})
	}

	membership, ok := membershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.Delete(c.Request().Context(), id, budgetID, membership.Role); err != nil {
		return h.handleDeleteTransactionError(c, err, id, budgetID)
	}

	return httpx.OK(c, nil, "transaction deleted successfully")
}

func (h *Handler) handleDeleteTransactionError(c echo.Context, err error, id, budgetID int64) error {
	if errors.Is(err, ErrForbidden) {
		return httpx.Forbidden(c, "insufficient role")
	}
	if errors.Is(err, ErrAccountLocked) {
		return httpx.Conflict(c, errAccountLocked)
	}
	h.log.Error("Delete transaction failed",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
		zap.Error(err),
	)
	return httpx.InternalError(c)
}
