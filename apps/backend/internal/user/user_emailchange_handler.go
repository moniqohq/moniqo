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

package user

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

// RequestEmailChange handles POST /api/v1/users/{id}/email-change.
func (h *Handler) RequestEmailChange(c echo.Context) error {
	h.log.Debug("received request email change request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	var req RequestEmailChangeRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind request email change body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidateRequestEmailChange(validator.RequestEmailChangeInput{
		NewEmail:        req.NewEmail,
		CurrentPassword: req.CurrentPassword,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	status, err := h.svc.RequestEmailChange(c.Request().Context(), userID, req)
	if err == nil {
		return httpx.OK(c, status, "verification code sent to the new email address")
	}
	if errors.Is(err, ErrSameEmail) {
		return httpx.ValidationError(c, []httpx.FieldError{
			{Field: "new_email", Error: "must be different from your current email"},
		})
	}
	return h.mapEmailChangeError(c, userID, "request email change", err)
}

// VerifyEmailChange handles POST /api/v1/users/{id}/email-change/verify.
func (h *Handler) VerifyEmailChange(c echo.Context) error {
	h.log.Debug("received verify email change request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	var req VerifyEmailChangeRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind verify email change body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidateVerifyEmailChange(req.Code); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	pub, err := h.svc.VerifyEmailChange(c.Request().Context(), userID, req)
	if err == nil {
		return httpx.OK(c, pub, "email address updated successfully")
	}
	var invalidErr *InvalidCodeError
	if errors.As(err, &invalidErr) {
		return httpx.ValidationError(c, []httpx.FieldError{
			{Field: "code", Error: fmt.Sprintf("invalid or expired code, %d attempts remaining", invalidErr.AttemptsRemaining)},
		})
	}
	if errors.Is(err, ErrNoPendingEmailChange) {
		return httpx.BadRequest(c, "no pending email change request")
	}
	return h.mapEmailChangeError(c, userID, "verify email change", err)
}

// CancelEmailChange handles DELETE /api/v1/users/{id}/email-change. Always
// idempotent: canceling with nothing pending is a 200, matching this API's
// DELETE convention.
func (h *Handler) CancelEmailChange(c echo.Context) error {
	h.log.Debug("received cancel email change request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	if err := h.svc.CancelEmailChange(c.Request().Context(), userID); err != nil {
		h.log.Error("cancel email change failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "email change request cancelled")
}

// GetEmailChangeStatus handles GET /api/v1/users/{id}/email-change, letting
// the settings page re-open the verification dialog after a refresh.
func (h *Handler) GetEmailChangeStatus(c echo.Context) error {
	h.log.Debug("received get email change status request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	status, err := h.svc.GetEmailChangeStatus(c.Request().Context(), userID)
	if err != nil {
		h.log.Error("get email change status failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, status, "email change status fetched successfully")
}

// mapEmailChangeError maps the sentinel/typed errors shared by
// RequestEmailChange and VerifyEmailChange to their HTTP responses. Errors
// unique to one endpoint (ErrSameEmail, InvalidCodeError,
// ErrNoPendingEmailChange) are handled by the caller before reaching here;
// anything left unrecognized is logged and reported as a 500.
func (h *Handler) mapEmailChangeError(c echo.Context, userID int64, op string, err error) error {
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "user not found")
	}
	if errors.Is(err, ErrWrongPassword) {
		return httpx.Forbidden(c, "current password is incorrect")
	}
	if errors.Is(err, ErrConflict) {
		return httpx.Conflict(c, "email already in use")
	}
	var lockedErr *LockedError
	if errors.As(err, &lockedErr) {
		c.Response().Header().Set("Retry-After", strconv.Itoa(int(lockedErr.RetryAfter.Seconds())))
		return httpx.TooManyRequestsMsg(c, "too many verification attempts")
	}
	h.log.Error(op+" failed", zap.Int64("user_id", userID), zap.Error(err))
	return httpx.InternalError(c)
}
