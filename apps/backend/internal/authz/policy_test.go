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
	default:
		return "Unknown"
	}
}
