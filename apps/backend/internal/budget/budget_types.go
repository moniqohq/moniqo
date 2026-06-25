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

// Package budget implements the Budget domain: CRUD, membership management,
// RBAC guard, and ownership transfer.
package budget

import (
	"errors"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// -----------------------------------------------------------------------------
// Sentinel errors
// -----------------------------------------------------------------------------

// ErrNotFound is returned when a budget lookup finds no matching active row.
var ErrNotFound = errors.New("budget not found")

// ErrBudgetAlreadyExists is returned when a duplicate title is found on create.
var ErrBudgetAlreadyExists = errors.New("budget with that title already exists")

// ErrConflict is returned when a duplicate title is found on update.
var ErrConflict = errors.New("budget title already in use")

// ErrMembershipNotFound is returned when a (budget_id, user_id) membership cannot be found.
var ErrMembershipNotFound = errors.New("membership not found")

// ErrAlreadyMember is returned when adding a user who is already an active member.
var ErrAlreadyMember = errors.New("user is already a member of this budget")

// ErrLastOwner is returned when an operation would leave a budget without an owner.
var ErrLastOwner = errors.New("cannot remove or downgrade the last owner")

// ErrNotMember is returned when a non-member attempts a member-only operation.
var ErrNotMember = errors.New("user is not a member of this budget")

// ErrSelfTransfer is returned when an ownership transfer targets the current owner.
var ErrSelfTransfer = errors.New("cannot transfer ownership to yourself")

// ErrCannotAssignOwner is returned when AddMember tries to grant the OWNER role
// (ownership transfer is a separate, explicit operation).
var ErrCannotAssignOwner = errors.New("cannot assign OWNER role via add member; use transfer ownership")

// -----------------------------------------------------------------------------
// Request types — HTTP handler → service
// -----------------------------------------------------------------------------

// CreateRequest is the payload for POST /api/v1/budgets.
type CreateRequest struct {
	Title string  `json:"title"`
	Notes *string `json:"notes"`
}

// ReplaceRequest is the payload for PUT /api/v1/budgets/:id.
type ReplaceRequest struct {
	Title string  `json:"title"`
	Notes *string `json:"notes"`
}

// PatchRequest is the payload for PATCH /api/v1/budgets/:id.
// Only non-nil fields are applied.
type PatchRequest struct {
	Title *string `json:"title"`
	Notes *string `json:"notes"`
}

// AddMemberRequest is the payload for POST /api/v1/budgets/:id/members.
type AddMemberRequest struct {
	UserID int64       `json:"user_id"`
	Role   models.Role `json:"role"`
}

// UpdateRoleRequest is the payload for PATCH /api/v1/budgets/:id/members/:userId.
type UpdateRoleRequest struct {
	Role models.Role `json:"role"`
}

// TransferOwnershipRequest is the payload for POST /api/v1/budgets/:id/transfer-ownership.
type TransferOwnershipRequest struct {
	TargetUserID int64 `json:"target_user_id"`
}

// -----------------------------------------------------------------------------
// Repository params
// -----------------------------------------------------------------------------

// CreateParams holds the values for inserting a new budget row.
type CreateParams struct {
	Title string
	Notes *string
}

// UpdateParams holds the values for a full budget update.
type UpdateParams struct {
	ID    int64
	Title string
	Notes *string
}

// PatchParams holds the optional values for a partial budget update.
type PatchParams struct {
	ID    int64
	Title *string
	Notes *string
}
