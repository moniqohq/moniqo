package models_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func TestParseRole(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input   string
		want    models.Role
		wantErr bool
	}{
		{"OWNER", models.RoleOwner, false},
		{"ADMIN", models.RoleAdmin, false},
		{"EDITOR", models.RoleEditor, false},
		{"VIEWER", models.RoleViewer, false},
		{"owner", "", true},
		{"", "", true},
		{"SUPERADMIN", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			t.Parallel()
			got, err := models.ParseRole(tt.input)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestRoleRankOrdering(t *testing.T) {
	t.Parallel()

	assert.Greater(t, models.RoleOwner.Rank(), models.RoleAdmin.Rank())
	assert.Greater(t, models.RoleAdmin.Rank(), models.RoleEditor.Rank())
	assert.Greater(t, models.RoleEditor.Rank(), models.RoleViewer.Rank())
	assert.Greater(t, models.RoleViewer.Rank(), 0)
}

func TestRoleIsValid(t *testing.T) {
	t.Parallel()

	assert.True(t, models.RoleOwner.IsValid())
	assert.True(t, models.RoleAdmin.IsValid())
	assert.True(t, models.RoleEditor.IsValid())
	assert.True(t, models.RoleViewer.IsValid())
	assert.False(t, models.Role("SUPERUSER").IsValid())
	assert.False(t, models.Role("").IsValid())
}
