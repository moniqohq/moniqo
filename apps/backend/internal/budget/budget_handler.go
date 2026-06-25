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

package budget

import (
	"context"
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

const (
	fieldBody      = "body"
	errInvalidJSON = "invalid json"
)

// Service is the service contract required by Handler.
type Service interface {
	Create(ctx context.Context, creatorID int64, req CreateRequest) (models.Budget, error)
	List(ctx context.Context, userID int64) ([]models.Budget, error)
	GetByID(ctx context.Context, budgetID int64) (models.Budget, error)
	Replace(ctx context.Context, ownerID, budgetID int64, req ReplaceRequest) (models.Budget, error)
	Patch(ctx context.Context, ownerID, budgetID int64, req PatchRequest) (models.Budget, error)
	SoftDelete(ctx context.Context, budgetID int64) error
}

// Handler holds HTTP handlers for budget endpoints.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a Handler wired to the given service.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// Create handles POST /api/v1/budgets.
func (h *Handler) Create(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	var req CreateRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidateCreateBudget(validator.CreateBudgetInput{Title: req.Title, Notes: req.Notes}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	b, err := h.svc.Create(c.Request().Context(), user.ID, req)
	if errors.Is(err, ErrBudgetAlreadyExists) {
		return httpx.Conflict(c, "budget with that title already exists")
	}
	if err != nil {
		h.log.Error("create budget failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.Created(c, b, "budget created successfully")
}

// List handles GET /api/v1/budgets.
func (h *Handler) List(c echo.Context) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	budgets, err := h.svc.List(c.Request().Context(), user.ID)
	if err != nil {
		h.log.Error("list budgets failed", zap.Int64("user_id", user.ID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, budgets, "budgets fetched successfully")
}

// Get handles GET /api/v1/budgets/:id.
// Membership is already verified by RequireBudgetAccess middleware.
func (h *Handler) Get(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	b, err := h.svc.GetByID(c.Request().Context(), budgetID)
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "budget not found")
	}
	if err != nil {
		h.log.Error("get budget failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, b, "budget fetched successfully")
}

// Replace handles PUT /api/v1/budgets/:id.
func (h *Handler) Replace(c echo.Context) error {
	membership, ok := MembershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	var req ReplaceRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidateReplaceBudget(validator.ReplaceBudgetInput{Title: req.Title, Notes: req.Notes}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	b, err := h.svc.Replace(c.Request().Context(), membership.UserID, budgetID, req)
	if errors.Is(err, ErrConflict) {
		return httpx.Conflict(c, "budget title already in use")
	}
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "budget not found")
	}
	if err != nil {
		h.log.Error("replace budget failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, b, "budget updated successfully")
}

// Patch handles PATCH /api/v1/budgets/:id.
func (h *Handler) Patch(c echo.Context) error {
	membership, ok := MembershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	var req PatchRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidatePatchBudget(validator.PatchBudgetInput{Title: req.Title, Notes: req.Notes}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	b, err := h.svc.Patch(c.Request().Context(), membership.UserID, budgetID, req)
	if errors.Is(err, ErrConflict) {
		return httpx.Conflict(c, "budget title already in use")
	}
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "budget not found")
	}
	if err != nil {
		h.log.Error("patch budget failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, b, "budget updated successfully")
}

// Delete handles DELETE /api/v1/budgets/:id.
func (h *Handler) Delete(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	if err := h.svc.SoftDelete(c.Request().Context(), budgetID); err != nil {
		h.log.Error("delete budget failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "budget deleted successfully")
}
