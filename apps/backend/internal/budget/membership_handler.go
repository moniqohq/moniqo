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

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// MembershipService is the service contract required by MembershipHandler.
type MembershipService interface {
	ListMembers(ctx context.Context, budgetID int64) ([]models.BudgetUser, error)
	AddMember(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error)
	UpdateMemberRole(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error)
	RemoveMember(ctx context.Context, budgetID, userID int64) error
	TransferOwnership(ctx context.Context, budgetID, currentOwnerID, targetUserID int64) error
}

const (
	fieldRole             = "role"
	errRoleMustBeNonOwner = "must be one of ADMIN, EDITOR, VIEWER"
)

// MembershipHandler holds HTTP handlers for budget membership endpoints.
type MembershipHandler struct {
	svc MembershipService
	log *zap.Logger
}

// NewMembershipHandler returns a MembershipHandler wired to the given service.
func NewMembershipHandler(svc MembershipService, log *zap.Logger) *MembershipHandler {
	return &MembershipHandler{svc: svc, log: log}
}

// ListMembers handles GET /api/v1/budgets/:id/members.
func (h *MembershipHandler) ListMembers(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	members, err := h.svc.ListMembers(c.Request().Context(), budgetID)
	if err != nil {
		h.log.Error("list members failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, members, "members fetched successfully")
}

// AddMember handles POST /api/v1/budgets/:id/members.
func (h *MembershipHandler) AddMember(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	var req AddMemberRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if req.UserID == 0 {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "user_id", Error: "required"}})
	}
	if !req.Role.IsValid() || req.Role == models.RoleOwner {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldRole, Error: errRoleMustBeNonOwner}})
	}

	m, err := h.svc.AddMember(c.Request().Context(), budgetID, req.UserID, req.Role)
	if err != nil {
		return h.mapAddMemberErr(c, budgetID, err)
	}

	return httpx.Created(c, m, "member added successfully")
}

// UpdateMemberRole handles PATCH /api/v1/budgets/:id/members/:userId.
func (h *MembershipHandler) UpdateMemberRole(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}
	targetUserID, err := strconv.ParseInt(c.Param("userId"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "member not found")
	}

	var req UpdateRoleRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if !req.Role.IsValid() || req.Role == models.RoleOwner {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldRole, Error: errRoleMustBeNonOwner}})
	}

	m, err := h.svc.UpdateMemberRole(c.Request().Context(), budgetID, targetUserID, req.Role)
	if err != nil {
		return h.mapUpdateRoleErr(c, budgetID, err)
	}

	return httpx.OK(c, m, "member role updated successfully")
}

// RemoveMember handles DELETE /api/v1/budgets/:id/members/:userId.
func (h *MembershipHandler) RemoveMember(c echo.Context) error {
	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}
	targetUserID, err := strconv.ParseInt(c.Param("userId"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "member not found")
	}

	if err := h.svc.RemoveMember(c.Request().Context(), budgetID, targetUserID); err != nil {
		if errors.Is(err, ErrLastOwner) {
			return httpx.Conflict(c, "cannot remove the last owner")
		}
		h.log.Error("remove member failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "member removed successfully")
}

// TransferOwnership handles POST /api/v1/budgets/:id/transfer-ownership.
func (h *MembershipHandler) TransferOwnership(c echo.Context) error {
	membership, ok := MembershipFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	var req TransferOwnershipRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if req.TargetUserID == 0 {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "target_user_id", Error: "required"}})
	}

	if err := h.svc.TransferOwnership(c.Request().Context(), budgetID, membership.UserID, req.TargetUserID); err != nil {
		return h.mapTransferErr(c, budgetID, err)
	}

	return httpx.OK(c, nil, "ownership transferred successfully")
}

func (h *MembershipHandler) mapAddMemberErr(c echo.Context, budgetID int64, err error) error {
	if errors.Is(err, ErrAlreadyMember) {
		return httpx.Conflict(c, "user is already a member of this budget")
	}
	if errors.Is(err, ErrCannotAssignOwner) {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldRole, Error: "cannot assign OWNER via add member"}})
	}
	h.log.Error("add member failed", zap.Int64("budget_id", budgetID), zap.Error(err))
	return httpx.InternalError(c)
}

func (h *MembershipHandler) mapUpdateRoleErr(c echo.Context, budgetID int64, err error) error {
	if errors.Is(err, ErrLastOwner) {
		return httpx.Conflict(c, "cannot downgrade the last owner")
	}
	if errors.Is(err, ErrMembershipNotFound) {
		return httpx.NotFound(c, "member not found")
	}
	if errors.Is(err, ErrCannotAssignOwner) {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldRole, Error: "cannot assign OWNER via update role"}})
	}
	h.log.Error("update member role failed", zap.Int64("budget_id", budgetID), zap.Error(err))
	return httpx.InternalError(c)
}

func (h *MembershipHandler) mapTransferErr(c echo.Context, budgetID int64, err error) error {
	if errors.Is(err, ErrSelfTransfer) {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "target_user_id", Error: "cannot transfer ownership to yourself"}})
	}
	if errors.Is(err, ErrNotMember) {
		return httpx.NotFound(c, "target user is not a member of this budget")
	}
	h.log.Error("transfer ownership failed", zap.Int64("budget_id", budgetID), zap.Error(err))
	return httpx.InternalError(c)
}
