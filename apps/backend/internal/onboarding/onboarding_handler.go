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

package onboarding

import (
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// toProgressResponse converts the internal model into the snake_case JSON DTO.
func toProgressResponse(p models.OnboardingProgress) Progress {
	return Progress{
		CurrentStep:    p.CurrentStep,
		CompletedSteps: p.CompletedSteps,
		BudgetID:       p.BudgetID,
		IncomeSources:  p.IncomeSources,
		Status:         p.Status,
		StartedAt:      p.StartedAt,
		CompletedAt:    p.CompletedAt,
	}
}

const (
	fieldBody     = "body"
	fieldCurrency = "currency"
	fieldTimezone = "timezone"
	fieldStep     = "step"

	errInvalidJSON = "invalid JSON"
	errRequired    = "required"
	errInvalidStep = "must be an integer between 1 and 7"
)

// Handler exposes the onboarding domain over HTTP.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a Handler wired to svc and log.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// GetProgress handles GET /api/v1/onboarding/progress.
func (h *Handler) GetProgress(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	p, err := h.svc.GetProgress(c.Request().Context(), user.ID)
	if err != nil {
		h.log.Error("GetProgress failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, toProgressResponse(p), "onboarding progress fetched successfully")
}

// UpdateProfile handles PATCH /api/v1/onboarding/profile.
func (h *Handler) UpdateProfile(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	var req ProfileRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	var errs []httpx.FieldError
	if req.Currency == "" {
		errs = append(errs, httpx.FieldError{Field: fieldCurrency, Error: errRequired})
	}
	if req.Timezone == "" {
		errs = append(errs, httpx.FieldError{Field: fieldTimezone, Error: errRequired})
	}
	if len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	u, err := h.svc.UpdateProfile(c.Request().Context(), user.ID, req)
	if err != nil {
		h.log.Error("UpdateProfile failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, u, "onboarding profile updated successfully")
}

// SaveIncomeSources handles PUT /api/v1/onboarding/income-sources.
func (h *Handler) SaveIncomeSources(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	var req IncomeSourcesRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	p, err := h.svc.SaveIncomeSources(c.Request().Context(), user.ID, req.Sources)
	if err != nil {
		h.log.Error("SaveIncomeSources failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, toProgressResponse(p), "income sources saved successfully")
}

// CompleteStep handles POST /api/v1/onboarding/steps/:step/complete.
func (h *Handler) CompleteStep(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	step, err := strconv.ParseInt(c.Param("step"), 10, 16)
	if err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldStep, Error: errInvalidStep}})
	}

	var req CompleteStepRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	p, err := h.svc.CompleteStep(c.Request().Context(), user.ID, int16(step), req.BudgetID)
	if err != nil {
		if errors.Is(err, ErrInvalidStep) {
			return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldStep, Error: errInvalidStep}})
		}
		h.log.Error("CompleteStep failed", zap.Int64("user_id", user.ID), zap.Int64("step", step), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, toProgressResponse(p), "onboarding step completed successfully")
}

// Complete handles POST /api/v1/onboarding/complete.
func (h *Handler) Complete(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := h.svc.Complete(c.Request().Context(), user.ID); err != nil {
		h.log.Error("Complete failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "onboarding completed successfully")
}
