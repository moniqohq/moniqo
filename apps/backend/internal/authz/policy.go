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

// Package authz contains the pure, database- and HTTP-free authorization
// policy for budget-scoped actions. It is the single source of truth for
// "can role R perform action A?" — call Can before executing any privileged
// operation.
package authz

import "github.com/moniqohq/moniqo/apps/backend/internal/models"

// Action represents a distinct operation that can be authorized.
type Action int

const (
	// BudgetView allows reading a budget and its contents (any member).
	BudgetView Action = iota
	// BudgetEdit allows updating budget metadata (title, notes).
	BudgetEdit
	// BudgetDelete allows soft-deleting a budget and all its memberships.
	BudgetDelete
	// ManageMembers allows adding, updating, and removing budget members.
	ManageMembers
	// TransferOwnership allows transferring the OWNER role to another member.
	TransferOwnership
	// AccountView allows reading accounts and their balances (any member).
	AccountView
	// AccountEdit allows creating and modifying accounts (EDITOR and above).
	AccountEdit
	// AccountDelete allows deleting accounts (OWNER and ADMIN only).
	AccountDelete
)

type rolePolicy = map[Action]bool

// policyTable maps each (role, action) pair to an allow/deny decision.
// Every cell must have an explicit entry — gaps are security bugs.
func policyTable() map[models.Role]rolePolicy {
	return map[models.Role]rolePolicy{
		models.RoleOwner: {
			BudgetView:        true,
			BudgetEdit:        true,
			BudgetDelete:      true,
			ManageMembers:     true,
			TransferOwnership: true,
			AccountView:       true,
			AccountEdit:       true,
			AccountDelete:     true,
		},
		models.RoleAdmin: {
			BudgetView:        true,
			BudgetEdit:        true,
			BudgetDelete:      false,
			ManageMembers:     false,
			TransferOwnership: false,
			AccountView:       true,
			AccountEdit:       true,
			AccountDelete:     true,
		},
		models.RoleEditor: {
			BudgetView:        true,
			BudgetEdit:        false,
			BudgetDelete:      false,
			ManageMembers:     false,
			TransferOwnership: false,
			AccountView:       true,
			AccountEdit:       true,
			AccountDelete:     false,
		},
		models.RoleViewer: {
			BudgetView:        true,
			BudgetEdit:        false,
			BudgetDelete:      false,
			ManageMembers:     false,
			TransferOwnership: false,
			AccountView:       true,
			AccountEdit:       false,
			AccountDelete:     false,
		},
	}
}

// Can reports whether the given role is allowed to perform action.
// Unknown roles or unknown actions return false.
func Can(role models.Role, action Action) bool {
	actions, ok := policyTable()[role]
	if !ok {
		return false
	}
	return actions[action]
}
