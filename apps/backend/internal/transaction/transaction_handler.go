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
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

const (
	membershipContextKey = "budget_membership"
	fieldBody            = "body"
	fieldBudgetID        = "budget_id"
	fieldTransactionID   = "id"

	fieldAccountID         = "account_id"
	fieldTransferAccountID = "transfer_account_id"
	fieldEnvelopeID        = "budget_envelope_id"
	fieldAmount            = "amount"
	fieldDate              = "date"
	fieldStatus            = "status"
	fieldMemo              = "memo"
	fieldSpentAmt          = "spent_amt"

	errInvalidID        = "must be a positive integer"
	errAmountNonZero    = "amount must be non-zero; use a negative value for outflows and a positive value for inflows"
	errInvalidDate      = "must be an RFC 3339 timestamp, e.g. 2026-03-01T00:00:00Z"
	errEnvelopeRequired = "budget_envelope_id is required for expense transactions; " +
		"omit it for income transactions or when transfer_account_id is set"
	errEnvelopeOnIncome = "budget_envelope_id is not applicable to income transactions; " +
		"income is unallocated and flows into \"To Be Budgeted\" instead"
	errTransferConflict = "budget_envelope_id must be omitted when transfer_account_id is set; " +
		"a transfer moves money between accounts and cannot be assigned to an envelope"
	errTransferAccountRequired = "transfer_account_id is required when creating a transfer"
	errSelfTransfer            = "transfer_account_id must differ from account_id; a transfer requires two distinct accounts"
	errInvalidStatus           = "must be one of uncleared, cleared, reconciled"
	errAccountArchived         = "account is archived and cannot accept new transactions"
	errAccountLocked           = "account has transaction locking enabled; unlock the account to delete this transaction"
	errPatchBodyEmpty          = "request body must contain at least one updatable field: " +
		"account_id, transfer_account_id, budget_envelope_id, amount, date, status, memo"
	errSpentAmtReadOnly = "spent_amt is read-only and derived from transactions; remove it from the request body"
	errBodyUnreadable   = "must be readable"
	errValidationFailed = "validation failed"
	errEnvelopeArchived = "envelope is archived and cannot accept new transactions"
	errEnvelopeNotFound = "envelope not found in this budget"

	receivedValueMaxLen = 40

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

// truncateValue strips control characters and shortens s for safe, readable
// inclusion inside a validation message.
func truncateValue(s string) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, strings.TrimSpace(s))
	if len(s) > receivedValueMaxLen {
		return s[:receivedValueMaxLen] + "..."
	}
	return s
}

// paramFieldError builds a field error for an invalid path parameter, naming
// the raw value the client sent.
func paramFieldError(field, value string) httpx.FieldError {
	return httpx.FieldError{
		Field: field,
		Error: fmt.Sprintf("%s (received %q)", errInvalidID, truncateValue(value)),
	}
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

// parseOptionalBool parses a boolean query param, defaulting to false for
// missing or malformed values (consistent with the lenient handling of the
// other list query params above).
func parseOptionalBool(s string) bool {
	v, err := strconv.ParseBool(s)
	if err != nil {
		return false
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

// envelopeRuleError returns the field error for a non-transfer amount/envelope
// pairing that violates the envelope rule (income: none; expense: required), or
// nil if compliant. Must only be called when transfer_account_id is absent.
func envelopeRuleError(amount money.Amount, envelopeID *int64) *httpx.FieldError {
	if amount.Int64() > 0 {
		if envelopeID != nil {
			return &httpx.FieldError{Field: fieldEnvelopeID, Error: errEnvelopeOnIncome}
		}
		return nil
	}
	if envelopeID == nil {
		return &httpx.FieldError{Field: fieldEnvelopeID, Error: errEnvelopeRequired}
	}
	return nil
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
		errs = append(errs, httpx.FieldError{Field: fieldDate, Error: errInvalidDate})
	}
	if req.TransferAccountID != nil {
		// Transfer: envelope must be absent, no self-transfer
		if req.EnvelopeID != nil {
			errs = append(errs, httpx.FieldError{Field: fieldEnvelopeID, Error: errTransferConflict})
		}
		if *req.TransferAccountID == req.AccountID {
			errs = append(errs, httpx.FieldError{Field: fieldTransferAccountID, Error: errSelfTransfer})
		}
	} else if fe := envelopeRuleError(req.Amount, req.EnvelopeID); fe != nil {
		errs = append(errs, *fe)
	}
	return appendStatusError(errs, req.Status)
}

// validateReplaceRequest validates PUT body.
//
//nolint:revive
func validateReplaceRequest(req ReplaceRequest) []httpx.FieldError {
	var errs []httpx.FieldError
	if req.AccountID <= 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAccountID, Error: errInvalidID})
	}
	if req.Amount.Int64() == 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAmount, Error: errAmountNonZero})
	}
	if req.Date.IsZero() {
		errs = append(errs, httpx.FieldError{Field: fieldDate, Error: errInvalidDate})
	}
	if req.TransferAccountID != nil && req.EnvelopeID != nil {
		errs = append(errs, httpx.FieldError{Field: fieldEnvelopeID, Error: errTransferConflict})
	}
	if req.TransferAccountID != nil && *req.TransferAccountID == req.AccountID {
		errs = append(errs, httpx.FieldError{Field: fieldTransferAccountID, Error: errSelfTransfer})
	}
	if req.TransferAccountID == nil {
		if fe := envelopeRuleError(req.Amount, req.EnvelopeID); fe != nil {
			errs = append(errs, *fe)
		}
	}
	return appendStatusError(errs, req.Status)
}

// validatePatchRequest validates PATCH body; also checks raw bytes for amount=0.
//
//nolint:revive,cyclop
func validatePatchRequest(req PatchRequest, rawBody []byte) []httpx.FieldError {
	// Reject explicit spent_amt key before the empty-body check, since a body
	// containing only spent_amt decodes to an all-nil PatchRequest and the
	// spent_amt-specific message is more actionable than "body is empty".
	var raw map[string]json.RawMessage
	if json.Unmarshal(rawBody, &raw) == nil {
		if _, ok := raw[fieldSpentAmt]; ok {
			return []httpx.FieldError{{Field: fieldSpentAmt, Error: errSpentAmtReadOnly}}
		}
	}

	if req.AccountID == nil && req.TransferAccountID == nil && req.EnvelopeID == nil &&
		req.Amount == nil && req.Date == nil && req.Status == nil && req.Memo == nil {
		return []httpx.FieldError{{Field: fieldBody, Error: errPatchBodyEmpty}}
	}

	var errs []httpx.FieldError
	if req.Amount != nil && req.Amount.Int64() == 0 {
		errs = append(errs, httpx.FieldError{Field: fieldAmount, Error: errAmountNonZero})
	}
	// Envelopes do not apply to income. This only catches the case where the request
	// itself is self-evidently income (explicit positive amount, no transfer) with an
	// explicit envelope; whether an amount-only patch flips an existing expense into
	// income is resolved against the existing row in the service layer.
	if req.TransferAccountID == nil && req.Amount != nil && req.Amount.Int64() > 0 && req.EnvelopeID != nil {
		errs = append(errs, httpx.FieldError{Field: fieldEnvelopeID, Error: errEnvelopeOnIncome})
	}
	if req.Status != nil && !req.Status.IsValid() {
		errs = append(errs, httpx.FieldError{Field: fieldStatus, Error: errInvalidStatus})
	}
	return errs
}

// decodeFieldProbe decodes a single known JSON key into its expected Go type,
// used to attribute a bind failure to the specific field that caused it.
type decodeFieldProbe struct {
	field  string
	decode func(raw json.RawMessage) error
	expect string
}

// transactionDecodeProbes covers every JSON key shared by CreateRequest,
// ReplaceRequest and PatchRequest, in request-body declaration order.
//
//nolint:gochecknoglobals // read-only lookup table, not mutable state.
var transactionDecodeProbes = []decodeFieldProbe{
	{
		field:  fieldAccountID,
		decode: func(raw json.RawMessage) error { var v int64; return json.Unmarshal(raw, &v) },
		expect: "must be a JSON integer",
	},
	{
		field:  fieldTransferAccountID,
		decode: func(raw json.RawMessage) error { var v *int64; return json.Unmarshal(raw, &v) },
		expect: "must be a JSON integer or null",
	},
	{
		field:  fieldEnvelopeID,
		decode: func(raw json.RawMessage) error { var v *int64; return json.Unmarshal(raw, &v) },
		expect: "must be a JSON integer or null",
	},
	{
		field:  fieldAmount,
		decode: func(raw json.RawMessage) error { var v money.Amount; return json.Unmarshal(raw, &v) },
		expect: "must be a JSON number in major units, e.g. 12.34",
	},
	{
		field:  fieldDate,
		decode: func(raw json.RawMessage) error { var v time.Time; return json.Unmarshal(raw, &v) },
		expect: errInvalidDate,
	},
	{
		field:  fieldStatus,
		decode: func(raw json.RawMessage) error { var v *models.TransactionStatus; return json.Unmarshal(raw, &v) },
		expect: errInvalidStatus,
	},
	{
		field:  fieldMemo,
		decode: func(raw json.RawMessage) error { var v *string; return json.Unmarshal(raw, &v) },
		expect: "must be a string or null",
	},
}

// decodeFieldErrors is used when c.Bind fails on a transaction write request.
// It re-inspects the raw body key-by-key so the response names every field
// that failed to decode, along with the value that was received, instead of
// collapsing everything into a single "invalid JSON" message.
func decodeFieldErrors(rawBody []byte) []httpx.FieldError {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(rawBody, &raw); err != nil {
		return []httpx.FieldError{{
			Field: fieldBody,
			Error: "malformed JSON: " + truncateValue(err.Error()),
		}}
	}

	var errs []httpx.FieldError
	for _, probe := range transactionDecodeProbes {
		value, present := raw[probe.field]
		if !present {
			continue
		}
		if err := probe.decode(value); err != nil {
			errs = append(errs, httpx.FieldError{
				Field: probe.field,
				Error: fmt.Sprintf("%s (received %s)", probe.expect, truncateValue(string(value))),
			})
		}
	}
	if len(errs) == 0 {
		// Bind failed for a structural reason none of the known-key probes caught
		// (e.g. the body is not a JSON object at all).
		errs = []httpx.FieldError{{Field: fieldBody, Error: "must be a JSON object"}}
	}
	return errs
}

// bufferBody reads and restores the request body so it can be read twice:
// once for field-level decode diagnostics, once by c.Bind.
func bufferBody(c echo.Context) ([]byte, error) {
	raw, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return nil, err //nolint:wrapcheck
	}
	c.Request().Body = io.NopCloser(bytes.NewBuffer(raw))
	return raw, nil
}

// serviceErrorFields maps a FieldViolationError returned by the service layer
// onto the matching HTTP response, preserving the field/reason detail the
// service attached. Returns false if err is not a FieldViolationError.
func serviceErrorFields(c echo.Context, err error) (bool, error) {
	var fv *FieldViolationError
	if !errors.As(err, &fv) {
		return false, nil
	}
	if errors.Is(fv.Sentinel, ErrConflict) {
		return true, httpx.Conflict(c, fv.Reason)
	}
	return true, httpx.ValidationError(c, []httpx.FieldError{{Field: fv.Field, Error: fv.Reason}})
}

// ListTransactions handles GET /api/v1/budgets/:budget_id/transactions.
func (h *Handler) ListTransactions(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldBudgetID, c.Param("budget_id"))})
	}

	f := ListFilters{
		AccountID:       parseOptionalInt64(c.QueryParam("account_id")),
		EnvelopeID:      parseOptionalInt64(c.QueryParam("budget_envelope_id")),
		DateFrom:        parseOptionalTime(c.QueryParam("date_from")),
		DateTo:          parseOptionalTime(c.QueryParam("date_to")),
		IncludeArchived: parseOptionalBool(c.QueryParam("include_archived")),
		Page:            parseOptionalPage(c.QueryParam("page"), 1),
		PageSize:        parseOptionalPage(c.QueryParam("page_size"), defaultPageSize),
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
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldBudgetID, c.Param("budget_id"))})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldTransactionID, c.Param("id"))})
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
//nolint:revive
func (h *Handler) CreateTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldBudgetID, c.Param("budget_id"))})
	}

	rawBody, err := bufferBody(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errBodyUnreadable}})
	}

	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, decodeFieldErrors(rawBody))
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
		return h.handleCreateTransactionError(c, err, budgetID)
	}

	return httpx.Created(c, txn, "transaction created successfully")
}

// ReplaceTransaction handles PUT /api/v1/budgets/:budget_id/transactions/:id.
//
//nolint:revive,nestif
func (h *Handler) ReplaceTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldBudgetID, c.Param("budget_id"))})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldTransactionID, c.Param("id"))})
	}

	rawBody, err := bufferBody(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errBodyUnreadable}})
	}

	var req ReplaceRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, decodeFieldErrors(rawBody))
	}

	if errs := validateReplaceRequest(req); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	txn, err := h.svc.Replace(c.Request().Context(), id, budgetID, req)
	if err != nil {
		return h.handleReplaceTransactionError(c, err, id, budgetID)
	}

	return httpx.OK(c, txn, "transaction updated successfully")
}

// PatchTransaction handles PATCH /api/v1/budgets/:budget_id/transactions/:id.
//
//nolint:revive,nestif
func (h *Handler) PatchTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldBudgetID, c.Param("budget_id"))})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldTransactionID, c.Param("id"))})
	}

	rawBytes, err := bufferBody(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errBodyUnreadable}})
	}

	var req PatchRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, decodeFieldErrors(rawBytes))
	}

	if errs := validatePatchRequest(req, rawBytes); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	txn, err := h.svc.Patch(c.Request().Context(), id, budgetID, req)
	if err != nil {
		return h.handlePatchTransactionError(c, err, id, budgetID)
	}

	return httpx.OK(c, txn, "transaction updated successfully")
}

// DeleteTransaction handles DELETE /api/v1/budgets/:budget_id/transactions/:id.
func (h *Handler) DeleteTransaction(c echo.Context) error {
	budgetID, err := parseBudgetID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldBudgetID, c.Param("budget_id"))})
	}

	id, err := parseTransactionID(c)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{paramFieldError(fieldTransactionID, c.Param("id"))})
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
	if errors.Is(err, ErrBudgetArchived) {
		return httpx.Conflict(c, "budget is archived")
	}
	h.log.Error("Delete transaction failed",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
		zap.Error(err),
	)
	return httpx.InternalError(c)
}

// mapCommonTransactionError maps the error cases shared by create, replace,
// and patch — everything except the not-found case, which only replace and
// patch have — into their HTTP response. Returns ok=false if err doesn't
// match any of them.
func mapCommonTransactionError(c echo.Context, err error) (ok bool, resp error) {
	switch {
	case errors.Is(err, ErrConflict):
		return true, httpx.Conflict(c, "transaction business rule violation")
	case errors.Is(err, ErrValidation):
		return true, httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errValidationFailed}})
	case errors.Is(err, ErrAccountArchived):
		return true, httpx.ValidationError(c, []httpx.FieldError{{Field: fieldAccountID, Error: errAccountArchived}})
	case errors.Is(err, ErrBudgetArchived):
		return true, httpx.Conflict(c, "budget is archived")
	case errors.Is(err, ErrEnvelopeArchived):
		return true, httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errEnvelopeArchived}})
	case errors.Is(err, ErrEnvelopeNotFound):
		return true, httpx.ValidationError(c, []httpx.FieldError{{Field: fieldEnvelopeID, Error: errEnvelopeNotFound}})
	default:
		return false, nil
	}
}

func (h *Handler) handleCreateTransactionError(c echo.Context, err error, budgetID int64) error {
	if ok, resp := serviceErrorFields(c, err); ok {
		return resp
	}
	if ok, resp := mapCommonTransactionError(c, err); ok {
		return resp
	}
	h.log.Error("Create transaction failed",
		zap.Int64("budget_id", budgetID),
		zap.Error(err),
	)
	return httpx.InternalError(c)
}

func (h *Handler) handleReplaceTransactionError(c echo.Context, err error, id, budgetID int64) error {
	if ok, resp := serviceErrorFields(c, err); ok {
		return resp
	}
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "transaction not found")
	}
	if ok, resp := mapCommonTransactionError(c, err); ok {
		return resp
	}
	h.log.Error("Replace transaction failed",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
		zap.Error(err),
	)
	return httpx.InternalError(c)
}

func (h *Handler) handlePatchTransactionError(c echo.Context, err error, id, budgetID int64) error {
	if ok, resp := serviceErrorFields(c, err); ok {
		return resp
	}
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "transaction not found")
	}
	if ok, resp := mapCommonTransactionError(c, err); ok {
		return resp
	}
	h.log.Error("Patch transaction failed",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
		zap.Error(err),
	)
	return httpx.InternalError(c)
}
