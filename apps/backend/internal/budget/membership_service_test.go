package budget_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/budget"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func makeMember(budgetID, userID int64, role models.Role) models.BudgetUser {
	return models.BudgetUser{ID: 1, BudgetID: budgetID, UserID: userID, Role: role}
}

func TestMembershipSvc_AddMember(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("CreateMembership", testBudgetID, int64(2), models.RoleEditor).
			Return(makeMember(testBudgetID, 2, models.RoleEditor), nil)

		svc := budget.NewMembershipSvc(repo, log)
		m, err := svc.AddMember(context.Background(), testBudgetID, 2, models.RoleEditor)

		require.NoError(t, err)
		assert.Equal(t, models.RoleEditor, m.Role)
		repo.AssertExpectations(t)
	})

	t.Run("cannot assign OWNER role", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		svc := budget.NewMembershipSvc(repo, log)

		_, err := svc.AddMember(context.Background(), testBudgetID, 2, models.RoleOwner)

		assert.ErrorIs(t, err, budget.ErrCannotAssignOwner)
		repo.AssertNotCalled(t, "CreateMembership")
	})

	t.Run("duplicate member returns ErrAlreadyMember", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("CreateMembership", testBudgetID, int64(2), models.RoleViewer).
			Return(models.BudgetUser{}, budget.ErrAlreadyMember)

		svc := budget.NewMembershipSvc(repo, log)
		_, err := svc.AddMember(context.Background(), testBudgetID, 2, models.RoleViewer)

		assert.ErrorIs(t, err, budget.ErrAlreadyMember)
	})
}

func TestMembershipSvc_UpdateMemberRole(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("cannot promote to OWNER", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		svc := budget.NewMembershipSvc(repo, log)

		_, err := svc.UpdateMemberRole(context.Background(), testBudgetID, 2, models.RoleOwner)

		assert.ErrorIs(t, err, budget.ErrCannotAssignOwner)
	})

	t.Run("cannot downgrade last owner", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, testUserID).Return(makeMember(testBudgetID, testUserID, models.RoleOwner), nil)
		repo.On("CountOwners", testBudgetID).Return(int64(1), nil)

		svc := budget.NewMembershipSvc(repo, log)
		_, err := svc.UpdateMemberRole(context.Background(), testBudgetID, testUserID, models.RoleAdmin)

		assert.ErrorIs(t, err, budget.ErrLastOwner)
		repo.AssertExpectations(t)
	})

	t.Run("success when multiple owners", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, testUserID).Return(makeMember(testBudgetID, testUserID, models.RoleOwner), nil)
		repo.On("CountOwners", testBudgetID).Return(int64(2), nil)
		repo.On("UpdateRole", testBudgetID, testUserID, models.RoleAdmin).
			Return(makeMember(testBudgetID, testUserID, models.RoleAdmin), nil)

		svc := budget.NewMembershipSvc(repo, log)
		m, err := svc.UpdateMemberRole(context.Background(), testBudgetID, testUserID, models.RoleAdmin)

		require.NoError(t, err)
		assert.Equal(t, models.RoleAdmin, m.Role)
		repo.AssertExpectations(t)
	})
}

func TestMembershipSvc_RemoveMember(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("idempotent — already removed returns success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, int64(2)).Return(models.BudgetUser{}, budget.ErrMembershipNotFound)

		svc := budget.NewMembershipSvc(repo, log)
		err := svc.RemoveMember(context.Background(), testBudgetID, 2)

		require.NoError(t, err)
		repo.AssertNotCalled(t, "RemoveMembership")
	})

	t.Run("cannot remove last owner", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, testUserID).Return(makeMember(testBudgetID, testUserID, models.RoleOwner), nil)
		repo.On("CountOwners", testBudgetID).Return(int64(1), nil)

		svc := budget.NewMembershipSvc(repo, log)
		err := svc.RemoveMember(context.Background(), testBudgetID, testUserID)

		assert.ErrorIs(t, err, budget.ErrLastOwner)
	})

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, int64(2)).Return(makeMember(testBudgetID, 2, models.RoleEditor), nil)
		repo.On("RemoveMembership", testBudgetID, int64(2)).Return(nil)

		svc := budget.NewMembershipSvc(repo, log)
		err := svc.RemoveMember(context.Background(), testBudgetID, 2)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})
}

func TestMembershipSvc_TransferOwnership(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	const targetUserID int64 = 2

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, targetUserID).Return(makeMember(testBudgetID, targetUserID, models.RoleAdmin), nil)
		repo.On("TransferOwnership", testBudgetID, testUserID, targetUserID).Return(nil)

		svc := budget.NewMembershipSvc(repo, log)
		err := svc.TransferOwnership(context.Background(), testBudgetID, testUserID, targetUserID)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("self-transfer rejected", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		svc := budget.NewMembershipSvc(repo, log)

		err := svc.TransferOwnership(context.Background(), testBudgetID, testUserID, testUserID)

		assert.ErrorIs(t, err, budget.ErrSelfTransfer)
		repo.AssertNotCalled(t, "TransferOwnership")
	})

	t.Run("target not a member", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.MembershipRepository{}
		repo.On("GetMembership", testBudgetID, targetUserID).Return(models.BudgetUser{}, budget.ErrMembershipNotFound)

		svc := budget.NewMembershipSvc(repo, log)
		err := svc.TransferOwnership(context.Background(), testBudgetID, testUserID, targetUserID)

		assert.ErrorIs(t, err, budget.ErrNotMember)
	})
}
