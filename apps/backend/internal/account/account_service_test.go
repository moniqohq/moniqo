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

package account_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/account"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

const (
	testBudgetID  int64 = 10
	testAccountID int64 = 1
)

func makeAccount(name string) models.Account {
	return models.Account{
		ID:         testAccountID,
		BudgetID:   testBudgetID,
		Name:       name,
		Type:       models.AccountTypeChecking,
		IsOnBudget: true,
	}
}

// TestSvc_Create covers account.Svc.Create.
func TestSvc_Create(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success — zero initial balance", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("ExistsByName", testBudgetID, "Checking", (*int64)(nil)).Return(false, nil)
		repo.On("Create", account.CreateParams{
			BudgetID:   testBudgetID,
			Name:       "Checking",
			Type:       models.AccountTypeChecking,
			IsOnBudget: true,
		}).Return(makeAccount("Checking"), nil)

		svc := account.NewSvc(repo, log)
		a, err := svc.Create(context.Background(), testBudgetID, account.CreateRequest{
			Name: "Checking",
			Type: models.AccountTypeChecking,
		})

		require.NoError(t, err)
		assert.Equal(t, "Checking", a.Name)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "CreateOpeningTransaction")
	})

	t.Run("success — positive initial balance", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("ExistsByName", testBudgetID, "Savings", (*int64)(nil)).Return(false, nil)
		repo.On("Create", account.CreateParams{
			BudgetID:   testBudgetID,
			Name:       "Savings",
			Type:       models.AccountTypeSavings,
			IsOnBudget: true,
		}).Return(makeAccount("Savings"), nil)
		repo.On("CreateOpeningTransaction", testBudgetID, testAccountID, money.FromMinorUnits(1000)).Return(nil)
		repo.On("SumBalance", testAccountID, testBudgetID).Return(money.FromMinorUnits(1000), nil)

		svc := account.NewSvc(repo, log)
		a, err := svc.Create(context.Background(), testBudgetID, account.CreateRequest{
			Name:           "Savings",
			Type:           models.AccountTypeSavings,
			InitialBalance: money.FromMinorUnits(1000),
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(1000), a.Balance)
		repo.AssertExpectations(t)
	})

	t.Run("duplicate name returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("ExistsByName", testBudgetID, "Taken", (*int64)(nil)).Return(true, nil)

		svc := account.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, account.CreateRequest{
			Name: "Taken",
			Type: models.AccountTypeChecking,
		})

		assert.ErrorIs(t, err, account.ErrConflict)
		repo.AssertExpectations(t)
	})

	t.Run("credit card defaults is_on_budget to false", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("ExistsByName", testBudgetID, "CC", (*int64)(nil)).Return(false, nil)
		// IsOnBudget must be false because the type is CREDIT_CARD and no override was given.
		expectedParams := account.CreateParams{
			BudgetID:   testBudgetID,
			Name:       "CC",
			Type:       models.AccountTypeCreditCard,
			IsOnBudget: false,
		}
		ccAccount := models.Account{
			ID:         testAccountID,
			BudgetID:   testBudgetID,
			Name:       "CC",
			Type:       models.AccountTypeCreditCard,
			IsOnBudget: false,
		}
		repo.On("Create", expectedParams).Return(ccAccount, nil)

		svc := account.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, account.CreateRequest{
			Name:       "CC",
			Type:       models.AccountTypeCreditCard,
			IsOnBudget: nil, // not explicitly set
		})

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})
}

// TestSvc_GetByID covers account.Svc.GetByID.
func TestSvc_GetByID(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Main"), nil)
		repo.On("SumBalance", testAccountID, testBudgetID).Return(money.FromMinorUnits(5000), nil)

		svc := account.NewSvc(repo, log)
		a, err := svc.GetByID(context.Background(), testAccountID, testBudgetID)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(5000), a.Balance)
		repo.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(models.Account{}, account.ErrNotFound)

		svc := account.NewSvc(repo, log)
		_, err := svc.GetByID(context.Background(), testAccountID, testBudgetID)

		assert.ErrorIs(t, err, account.ErrNotFound)
		repo.AssertExpectations(t)
	})
}

// TestSvc_List covers account.Svc.List.
func TestSvc_List(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("returns empty slice not nil for no accounts", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("ListByBudget", testBudgetID).Return(nil, nil)

		svc := account.NewSvc(repo, log)
		accounts, err := svc.List(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.NotNil(t, accounts)
		assert.Empty(t, accounts)
		repo.AssertExpectations(t)
	})

	t.Run("attaches balance to each account", func(t *testing.T) {
		t.Parallel()
		acc1 := models.Account{ID: 1, BudgetID: testBudgetID, Name: "Acc1", Type: models.AccountTypeChecking}
		acc2 := models.Account{ID: 2, BudgetID: testBudgetID, Name: "Acc2", Type: models.AccountTypeSavings}

		repo := &internalmock.AccountRepository{}
		repo.On("ListByBudget", testBudgetID).Return([]models.Account{acc1, acc2}, nil)
		repo.On("SumBalance", int64(1), testBudgetID).Return(money.FromMinorUnits(100), nil)
		repo.On("SumBalance", int64(2), testBudgetID).Return(money.FromMinorUnits(200), nil)

		svc := account.NewSvc(repo, log)
		accounts, err := svc.List(context.Background(), testBudgetID)

		require.NoError(t, err)
		require.Len(t, accounts, 2)
		assert.Equal(t, money.FromMinorUnits(100), accounts[0].Balance)
		assert.Equal(t, money.FromMinorUnits(200), accounts[1].Balance)
		repo.AssertExpectations(t)
	})
}

// TestSvc_Replace covers account.Svc.Replace.
func TestSvc_Replace(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		excludeID := testAccountID
		updated := models.Account{ID: testAccountID, BudgetID: testBudgetID, Name: "Updated", Type: models.AccountTypeChecking, IsOnBudget: true}

		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Original"), nil)
		repo.On("ExistsByName", testBudgetID, "Updated", &excludeID).Return(false, nil)
		repo.On("Update", account.UpdateParams{
			ID:         testAccountID,
			BudgetID:   testBudgetID,
			Name:       "Updated",
			Type:       models.AccountTypeChecking,
			IsOnBudget: true,
		}).Return(updated, nil)
		repo.On("SumBalance", testAccountID, testBudgetID).Return(money.FromMinorUnits(300), nil)

		svc := account.NewSvc(repo, log)
		a, err := svc.Replace(context.Background(), testAccountID, testBudgetID, account.ReplaceRequest{
			Name: "Updated",
			Type: models.AccountTypeChecking,
		})

		require.NoError(t, err)
		assert.Equal(t, "Updated", a.Name)
		assert.Equal(t, money.FromMinorUnits(300), a.Balance)
		repo.AssertExpectations(t)
	})

	t.Run("name conflict", func(t *testing.T) {
		t.Parallel()
		excludeID := testAccountID

		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Original"), nil)
		repo.On("ExistsByName", testBudgetID, "Taken", &excludeID).Return(true, nil)

		svc := account.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testAccountID, testBudgetID, account.ReplaceRequest{
			Name: "Taken",
			Type: models.AccountTypeChecking,
		})

		assert.ErrorIs(t, err, account.ErrConflict)
		repo.AssertExpectations(t)
	})
}

// TestSvc_Patch covers account.Svc.Patch.
func TestSvc_Patch(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success partial update", func(t *testing.T) {
		t.Parallel()
		notes := "some notes"
		excludeID := testAccountID
		patchedName := "NewName"

		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Original"), nil)
		repo.On("ExistsByName", testBudgetID, "NewName", &excludeID).Return(false, nil)
		repo.On("Patch", account.PatchParams{
			ID:       testAccountID,
			BudgetID: testBudgetID,
			Name:     &patchedName,
			Notes:    &notes,
		}).Return(models.Account{ID: testAccountID, BudgetID: testBudgetID, Name: "NewName"}, nil)
		repo.On("SumBalance", testAccountID, testBudgetID).Return(money.FromMinorUnits(0), nil)

		svc := account.NewSvc(repo, log)
		a, err := svc.Patch(context.Background(), testAccountID, testBudgetID, account.PatchRequest{
			Name:  &patchedName,
			Notes: &notes,
		})

		require.NoError(t, err)
		assert.Equal(t, "NewName", a.Name)
		repo.AssertExpectations(t)
	})

	t.Run("empty patch body — no repo calls for name uniqueness", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Original"), nil)
		repo.On("Patch", account.PatchParams{
			ID:       testAccountID,
			BudgetID: testBudgetID,
		}).Return(makeAccount("Original"), nil)
		repo.On("SumBalance", testAccountID, testBudgetID).Return(money.FromMinorUnits(0), nil)

		svc := account.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testAccountID, testBudgetID, account.PatchRequest{})

		require.NoError(t, err)
		repo.AssertNotCalled(t, "ExistsByName")
		repo.AssertExpectations(t)
	})
}

// TestSvc_Delete covers account.Svc.Delete.
func TestSvc_Delete(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("owner with no transactions — hard delete", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Main"), nil)
		repo.On("HasTransactions", testAccountID, testBudgetID).Return(false, nil)
		repo.On("HardDelete", testAccountID, testBudgetID).Return(nil)

		svc := account.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testAccountID, testBudgetID, models.RoleOwner)

		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "SoftDelete")
	})

	t.Run("admin with transactions — soft delete", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(makeAccount("Main"), nil)
		repo.On("HasTransactions", testAccountID, testBudgetID).Return(true, nil)
		repo.On("SoftDelete", testAccountID, testBudgetID).Return(nil)

		svc := account.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testAccountID, testBudgetID, models.RoleAdmin)

		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "HardDelete")
	})

	t.Run("viewer returns ErrForbidden — no repo calls", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}

		svc := account.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testAccountID, testBudgetID, models.RoleViewer)

		assert.ErrorIs(t, err, account.ErrForbidden)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("editor returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}

		svc := account.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testAccountID, testBudgetID, models.RoleEditor)

		assert.ErrorIs(t, err, account.ErrForbidden)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("idempotent — already deleted returns nil", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.AccountRepository{}
		repo.On("GetByID", testAccountID, testBudgetID).Return(models.Account{}, account.ErrNotFound)

		svc := account.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testAccountID, testBudgetID, models.RoleOwner)

		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "HardDelete")
		repo.AssertNotCalled(t, "SoftDelete")
	})
}
