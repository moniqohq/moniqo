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

package authz_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/moniqohq/moniqo/apps/backend/internal/authz"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func TestCan(t *testing.T) {
	t.Parallel()

	tests := []struct {
		role   models.Role
		action authz.Action
		want   bool
	}{
		// OWNER — full access
		{models.RoleOwner, authz.BudgetView, true},
		{models.RoleOwner, authz.BudgetEdit, true},
		{models.RoleOwner, authz.BudgetDelete, true},
		{models.RoleOwner, authz.ManageMembers, true},
		{models.RoleOwner, authz.TransferOwnership, true},
		// ADMIN — view + edit, no destructive or membership actions
		{models.RoleAdmin, authz.BudgetView, true},
		{models.RoleAdmin, authz.BudgetEdit, true},
		{models.RoleAdmin, authz.BudgetDelete, false},
		{models.RoleAdmin, authz.ManageMembers, false},
		{models.RoleAdmin, authz.TransferOwnership, false},
		// EDITOR — view only at budget level
		{models.RoleEditor, authz.BudgetView, true},
		{models.RoleEditor, authz.BudgetEdit, false},
		{models.RoleEditor, authz.BudgetDelete, false},
		{models.RoleEditor, authz.ManageMembers, false},
		{models.RoleEditor, authz.TransferOwnership, false},
		// VIEWER — read-only
		{models.RoleViewer, authz.BudgetView, true},
		{models.RoleViewer, authz.BudgetEdit, false},
		{models.RoleViewer, authz.BudgetDelete, false},
		{models.RoleViewer, authz.ManageMembers, false},
		{models.RoleViewer, authz.TransferOwnership, false},
		// Accounts
		{models.RoleOwner, authz.AccountView, true},
		{models.RoleOwner, authz.AccountEdit, true},
		{models.RoleOwner, authz.AccountDelete, true},
		{models.RoleViewer, authz.AccountView, true},
		{models.RoleViewer, authz.AccountEdit, false},
		{models.RoleViewer, authz.AccountDelete, false},
		{models.RoleEditor, authz.AccountEdit, true},
		{models.RoleEditor, authz.AccountDelete, false},
		{models.RoleAdmin, authz.AccountDelete, true},
		// Envelopes — mirror Accounts
		{models.RoleOwner, authz.EnvelopeView, true},
		{models.RoleOwner, authz.EnvelopeEdit, true},
		{models.RoleOwner, authz.EnvelopeDelete, true},
		{models.RoleAdmin, authz.EnvelopeView, true},
		{models.RoleAdmin, authz.EnvelopeEdit, true},
		{models.RoleAdmin, authz.EnvelopeDelete, true},
		{models.RoleEditor, authz.EnvelopeView, true},
		{models.RoleEditor, authz.EnvelopeEdit, true},
		{models.RoleEditor, authz.EnvelopeDelete, false},
		{models.RoleViewer, authz.EnvelopeView, true},
		{models.RoleViewer, authz.EnvelopeEdit, false},
		{models.RoleViewer, authz.EnvelopeDelete, false},
		// Unknown role
		{models.Role("SUPERADMIN"), authz.BudgetView, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.role)+"_"+actionName(tt.action), func(t *testing.T) {
			t.Parallel()
			got := authz.Can(tt.role, tt.action)
			assert.Equal(t, tt.want, got)
		})
	}
}

func actionName(a authz.Action) string {
	switch a {
	case authz.BudgetView:
		return "BudgetView"
	case authz.BudgetEdit:
		return "BudgetEdit"
	case authz.BudgetDelete:
		return "BudgetDelete"
	case authz.ManageMembers:
		return "ManageMembers"
	case authz.TransferOwnership:
		return "TransferOwnership"
	case authz.AccountView:
		return "AccountView"
	case authz.AccountEdit:
		return "AccountEdit"
	case authz.AccountDelete:
		return "AccountDelete"
	case authz.EnvelopeView:
		return "EnvelopeView"
	case authz.EnvelopeEdit:
		return "EnvelopeEdit"
	case authz.EnvelopeDelete:
		return "EnvelopeDelete"
	default:
		return "Unknown"
	}
}
