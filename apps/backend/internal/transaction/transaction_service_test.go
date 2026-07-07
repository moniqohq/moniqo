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

package transaction_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	testifymock "github.com/stretchr/testify/mock"

	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
	"github.com/moniqohq/moniqo/apps/backend/internal/transaction"
)

const (
	testBudgetID      int64 = 10
	testTransactionID int64 = 1
	testAccountID     int64 = 5
	testEnvelopeID    int64 = 3
	testAccount2ID    int64 = 6
)

var testDate = time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)

func makeTxn(amount int64) models.Transaction {
	return models.Transaction{
		ID:        testTransactionID,
		BudgetID:  testBudgetID,
		AccountID: testAccountID,
		Amount:    money.FromMinorUnits(amount),
		Date:      testDate,
	}
}

func makeTxnWithEnvelope(amount int64) models.Transaction {
	eid := testEnvelopeID
	t := makeTxn(amount)
	t.EnvelopeID = &eid
	return t
}

// ---------------------------------------------------------------------------
// TestSvc_Create
// ---------------------------------------------------------------------------

func TestSvc_Create(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		eid := testEnvelopeID
		repo.On("Create", transaction.CreateParams{
			BudgetID:   testBudgetID,
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-150000),
			Date:       testDate,
			Status:     models.TransactionStatusUncleared,
		}).Return(makeTxnWithEnvelope(-150000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-150000),
			Date:       testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(-150000), txn.Amount)
		repo.AssertExpectations(t)
	})

	t.Run("zero amount returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		eid := testEnvelopeID
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(0),
			Date:       testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("missing envelope returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(-100000),
			Date:      testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrValidation)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_CreateTransfer
// ---------------------------------------------------------------------------

func TestSvc_CreateTransfer(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("creates two legs with opposite signs", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		acc2 := testAccount2ID

		repo.On("Create", testifymock.MatchedBy(func(p transaction.CreateParams) bool {
			return p.AccountID == testAccountID && p.Amount.Int64() == -500000
		})).Return(makeTxn(-500000), nil).Once()

		repo.On("Create", testifymock.MatchedBy(func(p transaction.CreateParams) bool {
			return p.AccountID == testAccount2ID && p.Amount.Int64() == 500000
		})).Return(makeTxn(500000), nil).Once()

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.CreateTransfer(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:         testAccountID,
			TransferAccountID: &acc2,
			Amount:            money.FromMinorUnits(-500000),
			Date:              testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(-500000), txn.Amount)
		repo.AssertNumberOfCalls(t, "Create", 2)
	})

	t.Run("envelope present returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		acc2 := testAccount2ID
		eid := testEnvelopeID
		svc := transaction.NewSvc(repo, log)
		_, err := svc.CreateTransfer(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:         testAccountID,
			TransferAccountID: &acc2,
			EnvelopeID:        &eid,
			Amount:            money.FromMinorUnits(-500000),
			Date:              testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrConflict)
	})

	t.Run("self-transfer returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		same := testAccountID
		svc := transaction.NewSvc(repo, log)
		_, err := svc.CreateTransfer(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:         testAccountID,
			TransferAccountID: &same,
			Amount:            money.FromMinorUnits(-500000),
			Date:              testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrConflict)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_GetByID
// ---------------------------------------------------------------------------

func TestSvc_GetByID(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		svc := transaction.NewSvc(repo, log)
		txn, err := svc.GetByID(context.Background(), testTransactionID, testBudgetID)
		require.NoError(t, err)
		assert.Equal(t, testTransactionID, txn.ID)
	})

	t.Run("not found returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(models.Transaction{}, transaction.ErrNotFound)
		svc := transaction.NewSvc(repo, log)
		_, err := svc.GetByID(context.Background(), testTransactionID, testBudgetID)
		assert.ErrorIs(t, err, transaction.ErrNotFound)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_List
// ---------------------------------------------------------------------------

func TestSvc_List(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("returns results and total", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		f := transaction.ListFilters{Page: 1, PageSize: 20}
		repo.On("List", testBudgetID, f).Return([]models.Transaction{makeTxnWithEnvelope(-100000)}, nil)
		repo.On("Count", testBudgetID, f).Return(1, nil)

		svc := transaction.NewSvc(repo, log)
		txns, total, err := svc.List(context.Background(), testBudgetID, f)
		require.NoError(t, err)
		assert.Len(t, txns, 1)
		assert.Equal(t, 1, total)
	})

	t.Run("empty slice (not nil) for budget with no transactions", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		f := transaction.ListFilters{Page: 1, PageSize: 20}
		repo.On("List", testBudgetID, f).Return([]models.Transaction{}, nil)
		repo.On("Count", testBudgetID, f).Return(0, nil)

		svc := transaction.NewSvc(repo, log)
		txns, total, err := svc.List(context.Background(), testBudgetID, f)
		require.NoError(t, err)
		assert.NotNil(t, txns)
		assert.Empty(t, txns)
		assert.Equal(t, 0, total)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Patch
// ---------------------------------------------------------------------------

func TestSvc_Patch(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("empty body returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{})
		assert.ErrorIs(t, err, transaction.ErrValidation)
	})

	t.Run("zero amount returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		zero := money.FromMinorUnits(0)
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Amount: &zero})
		assert.ErrorIs(t, err, transaction.ErrValidation)
	})

	t.Run("partial update succeeds", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		newAmt := money.FromMinorUnits(-200000)
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Patch", transaction.PatchParams{
			ID:       testTransactionID,
			BudgetID: testBudgetID,
			Amount:   &newAmt,
		}).Return(makeTxnWithEnvelope(-200000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Amount: &newAmt})
		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(-200000), txn.Amount)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Delete
// ---------------------------------------------------------------------------

func TestSvc_Delete(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("viewer role returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		svc := transaction.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleViewer)
		assert.ErrorIs(t, err, transaction.ErrForbidden)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("single transaction soft-deleted", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-100000), nil)
		repo.On("SoftDelete", testTransactionID, testBudgetID).Return(nil)

		svc := transaction.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleOwner)
		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "SoftDeleteByGroupID")
	})

	t.Run("transfer deletes both legs via group ID", func(t *testing.T) {
		t.Parallel()
		groupID := "test-group-id"
		txnWithGroup := makeTxn(-500000)
		txnWithGroup.TransferGroupID = &groupID

		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(txnWithGroup, nil)
		repo.On("SoftDeleteByGroupID", groupID, testBudgetID).Return(nil)

		svc := transaction.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleAdmin)
		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "SoftDelete")
	})

	t.Run("idempotent — missing transaction returns nil", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(models.Transaction{}, transaction.ErrNotFound)

		svc := transaction.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleOwner)
		require.NoError(t, err)
	})

	t.Run("editor role can delete", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-100000), nil)
		repo.On("SoftDelete", testTransactionID, testBudgetID).Return(nil)

		svc := transaction.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleEditor)
		require.NoError(t, err)
	})
}
