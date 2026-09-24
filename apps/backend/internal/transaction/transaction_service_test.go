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
	"errors"
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

// fieldViolation extracts the *transaction.FieldViolationError carried by err,
// failing the test if err does not wrap one.
func fieldViolation(tb testing.TB, err error) *transaction.FieldViolationError {
	tb.Helper()
	var fv *transaction.FieldViolationError
	require.True(tb, errors.As(err, &fv), "expected a *transaction.FieldViolationError, got %v", err)
	return fv
}

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
		fv := fieldViolation(t, err)
		assert.Equal(t, "amount", fv.Field)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("missing envelope on expense returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(-100000),
			Date:      testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		fv := fieldViolation(t, err)
		assert.Equal(t, "budget_envelope_id", fv.Field)
	})

	t.Run("income without envelope succeeds", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", transaction.CreateParams{
			BudgetID:  testBudgetID,
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(100000),
			Date:      testDate,
			Status:    models.TransactionStatusUncleared,
		}).Return(makeTxn(100000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(100000),
			Date:      testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(100000), txn.Amount)
		repo.AssertExpectations(t)
	})

	t.Run("income without envelope succeeds", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", transaction.CreateParams{
			BudgetID:  testBudgetID,
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(150000),
			Date:      testDate,
			Status:    models.TransactionStatusUncleared,
		}).Return(makeTxn(150000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(150000),
			Date:      testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(150000), txn.Amount)
		repo.AssertExpectations(t)
	})

	t.Run("rejects when budget is archived", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		budgetChecker := &internalmock.BudgetChecker{}
		budgetChecker.On("IsArchived", testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetBudgetChecker(budgetChecker)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(150000),
			Date:      testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrBudgetArchived)
		repo.AssertNotCalled(t, "Create")
		budgetChecker.AssertExpectations(t)
	})

	t.Run("income with envelope returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		eid := testEnvelopeID
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(150000),
			Date:       testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("income with no envelope succeeds", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", transaction.CreateParams{
			BudgetID:  testBudgetID,
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(150000),
			Date:      testDate,
			Status:    models.TransactionStatusUncleared,
		}).Return(makeTxn(150000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(150000),
			Date:      testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(150000), txn.Amount)
		repo.AssertExpectations(t)
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
		fv := fieldViolation(t, err)
		assert.Equal(t, "budget_envelope_id", fv.Field)
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
		fv := fieldViolation(t, err)
		assert.Equal(t, "transfer_account_id", fv.Field)
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

	// Direct-by-ID access is deliberately unfiltered by archived state: deep links
	// and audit trails must never 404 just because the owning account was later
	// archived. GetByID has no AccountChecker dependency at all, so this test
	// pins the pass-through behaviour rather than exercising any guard.
	t.Run("resolves a transaction belonging to an archived account", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		archivedAccountTxn := makeTxn(-7500)
		archivedAccountTxn.AccountID = testAccount2ID
		repo.On("GetByID", testTransactionID, testBudgetID).Return(archivedAccountTxn, nil)
		svc := transaction.NewSvc(repo, log)
		txn, err := svc.GetByID(context.Background(), testTransactionID, testBudgetID)
		require.NoError(t, err)
		assert.Equal(t, testAccount2ID, txn.AccountID)
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

	// The default zero-value ListFilters excludes archived-account transactions
	// (the SQL-layer predicate defaults to exclusion; see repo/DB-level tests for
	// the actual filtering behaviour). This test guards that the service passes
	// IncludeArchived through unmodified rather than silently dropping it.
	t.Run("excludes archived by default (IncludeArchived not forced true)", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		f := transaction.ListFilters{Page: 1, PageSize: 20}
		repo.On("List", testBudgetID, f).Return([]models.Transaction{}, nil)
		repo.On("Count", testBudgetID, f).Return(0, nil)

		svc := transaction.NewSvc(repo, log)
		_, _, err := svc.List(context.Background(), testBudgetID, f)
		require.NoError(t, err)
		repo.AssertCalled(t, "List", testBudgetID, transaction.ListFilters{Page: 1, PageSize: 20, IncludeArchived: false})
	})

	t.Run("IncludeArchived override is passed through to the repo unmodified", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		f := transaction.ListFilters{Page: 1, PageSize: 20, IncludeArchived: true}
		repo.On("List", testBudgetID, f).Return([]models.Transaction{makeTxnWithEnvelope(-5000)}, nil)
		repo.On("Count", testBudgetID, f).Return(1, nil)

		svc := transaction.NewSvc(repo, log)
		txns, total, err := svc.List(context.Background(), testBudgetID, f)
		require.NoError(t, err)
		assert.Len(t, txns, 1)
		assert.Equal(t, 1, total)
		repo.AssertCalled(t, "List", testBudgetID, f)
		repo.AssertCalled(t, "Count", testBudgetID, f)
	})

	// An explicit AccountID filter is the mechanism account-detail views use to
	// list an archived account's history; it must reach the repo untouched even
	// though IncludeArchived stays false.
	t.Run("explicit AccountID filter for an archived account is passed through", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		archivedAccountID := testAccount2ID
		f := transaction.ListFilters{AccountID: &archivedAccountID, Page: 1, PageSize: 20}
		repo.On("List", testBudgetID, f).Return([]models.Transaction{makeTxn(-2500)}, nil)
		repo.On("Count", testBudgetID, f).Return(1, nil)

		svc := transaction.NewSvc(repo, log)
		txns, total, err := svc.List(context.Background(), testBudgetID, f)
		require.NoError(t, err)
		assert.Len(t, txns, 1)
		assert.Equal(t, 1, total)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Replace
// ---------------------------------------------------------------------------

func TestSvc_Replace(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("zero amount returns ErrValidation naming amount", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(0),
			Date:      testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		fv := fieldViolation(t, err)
		assert.Equal(t, "amount", fv.Field)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("expense with envelope succeeds", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Update", testifymock.MatchedBy(func(p transaction.UpdateParams) bool {
			return p.ID == testTransactionID && p.Amount.Int64() == -200000
		})).Return(makeTxnWithEnvelope(-200000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-200000),
			Date:       testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(-200000), txn.Amount)
	})

	t.Run("expense with no envelope returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(-200000),
			Date:      testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrValidation)
		repo.AssertNotCalled(t, "Update")
	})

	t.Run("income with envelope returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(200000),
			Date:       testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrValidation)
		repo.AssertNotCalled(t, "Update")
	})

	t.Run("income with no envelope succeeds", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxn(150000), nil)
		repo.On("Update", testifymock.MatchedBy(func(p transaction.UpdateParams) bool {
			return p.ID == testTransactionID && p.Amount.Int64() == 200000 && p.EnvelopeID == nil
		})).Return(makeTxn(200000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(200000),
			Date:      testDate,
		})

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(200000), txn.Amount)
	})

	t.Run("transfer with envelope returns ErrConflict naming budget_envelope_id", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		acc2 := testAccount2ID
		eid := testEnvelopeID
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:         testAccountID,
			TransferAccountID: &acc2,
			EnvelopeID:        &eid,
			Amount:            money.FromMinorUnits(-150000),
			Date:              testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrConflict)
		fv := fieldViolation(t, err)
		assert.Equal(t, "budget_envelope_id", fv.Field)
	})

	t.Run("self-transfer returns ErrConflict naming transfer_account_id", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		same := testAccountID
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:         testAccountID,
			TransferAccountID: &same,
			Amount:            money.FromMinorUnits(-150000),
			Date:              testDate,
		})
		assert.ErrorIs(t, err, transaction.ErrConflict)
		fv := fieldViolation(t, err)
		assert.Equal(t, "transfer_account_id", fv.Field)
	})

	t.Run("persists explicit status", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Update", testifymock.MatchedBy(func(p transaction.UpdateParams) bool {
			return p.Status == models.TransactionStatusCleared
		})).Return(makeTxnWithEnvelope(-200000), nil)

		clearedStatus := models.TransactionStatusCleared
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-200000),
			Date:       testDate,
			Status:     &clearedStatus,
		})
		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("defaults status to uncleared when omitted", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Update", testifymock.MatchedBy(func(p transaction.UpdateParams) bool {
			return p.Status == models.TransactionStatusUncleared
		})).Return(makeTxnWithEnvelope(-200000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-200000),
			Date:       testDate,
		})
		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("propagates status to mirror leg", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		groupID := "grp-1"
		primary := makeTxn(-500000)
		primary.TransferGroupID = &groupID
		leg2ID := testTransactionID + 1

		repo.On("GetByID", testTransactionID, testBudgetID).Return(primary, nil)
		repo.On("Update", testifymock.MatchedBy(func(p transaction.UpdateParams) bool {
			return p.ID == testTransactionID && p.Status == models.TransactionStatusCleared
		})).Return(primary, nil)
		repo.On("GetByGroupID", groupID, testBudgetID).Return([]models.Transaction{
			primary,
			{ID: leg2ID, BudgetID: testBudgetID, AccountID: testAccount2ID, TransferGroupID: &groupID},
		}, nil)
		repo.On("Update", testifymock.MatchedBy(func(p transaction.UpdateParams) bool {
			return p.ID == leg2ID && p.Status == models.TransactionStatusCleared
		})).Return(models.Transaction{}, nil)

		clearedStatus := models.TransactionStatusCleared
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID: testAccountID,
			Amount:    money.FromMinorUnits(-500000),
			Date:      testDate,
			Status:    &clearedStatus,
		})
		require.NoError(t, err)
		repo.AssertExpectations(t)
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
		fv := fieldViolation(t, err)
		assert.Equal(t, "body", fv.Field)
	})

	t.Run("zero amount returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		zero := money.FromMinorUnits(0)
		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Amount: &zero})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		fv := fieldViolation(t, err)
		assert.Equal(t, "amount", fv.Field)
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

	t.Run("status-only patch propagates to mirror leg", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		groupID := "grp-2"
		primary := makeTxn(-500000)
		primary.TransferGroupID = &groupID
		leg2ID := testTransactionID + 1
		clearedStatus := models.TransactionStatusCleared

		repo.On("GetByID", testTransactionID, testBudgetID).Return(primary, nil)
		repo.On("Patch", transaction.PatchParams{
			ID:       testTransactionID,
			BudgetID: testBudgetID,
			Status:   &clearedStatus,
		}).Return(primary, nil)
		repo.On("GetByGroupID", groupID, testBudgetID).Return([]models.Transaction{
			primary,
			{ID: leg2ID, BudgetID: testBudgetID, AccountID: testAccount2ID, TransferGroupID: &groupID},
		}, nil)
		repo.On("Patch", transaction.PatchParams{
			ID:       leg2ID,
			BudgetID: testBudgetID,
			Status:   &clearedStatus,
		}).Return(models.Transaction{}, nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Status: &clearedStatus})
		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("flipping amount sign to income clears the existing envelope", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		newAmt := money.FromMinorUnits(150000)
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Patch", transaction.PatchParams{
			ID:            testTransactionID,
			BudgetID:      testBudgetID,
			Amount:        &newAmt,
			ClearEnvelope: true,
		}).Return(makeTxn(150000), nil)

		svc := transaction.NewSvc(repo, log)
		txn, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Amount: &newAmt})
		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(150000), txn.Amount)
		repo.AssertExpectations(t)
	})

	t.Run("positive amount with explicit envelope returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		newAmt := money.FromMinorUnits(150000)
		eid := testEnvelopeID
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{
			Amount:     &newAmt,
			EnvelopeID: &eid,
		})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		repo.AssertNotCalled(t, "Patch")
	})

	t.Run("memo-only patch on an income transaction does not fail", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		memo := "updated memo"
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxn(150000), nil)
		repo.On("Patch", transaction.PatchParams{
			ID:       testTransactionID,
			BudgetID: testBudgetID,
			Memo:     &memo,
		}).Return(makeTxn(150000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Memo: &memo})
		require.NoError(t, err)
	})

	t.Run("flipping amount sign to expense without an envelope returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		newAmt := money.FromMinorUnits(-150000)
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxn(150000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Amount: &newAmt})
		assert.ErrorIs(t, err, transaction.ErrValidation)
		repo.AssertNotCalled(t, "Patch")
	})

	t.Run("expense already carrying an envelope is left untouched (ClearEnvelope false)", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		newAcc := testAccount2ID
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Patch", transaction.PatchParams{
			ID:        testTransactionID,
			BudgetID:  testBudgetID,
			AccountID: &newAcc,
		}).Return(makeTxnWithEnvelope(-150000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{AccountID: &newAcc})
		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("status-only patch on a transfer leg propagates to the mirror leg", func(t *testing.T) {
		t.Parallel()
		groupID := "test-group-id"
		status := models.TransactionStatusReconciled
		acc1 := testAccountID
		acc2 := testAccount2ID

		leg1 := makeTxn(-500000)
		leg1.TransferGroupID = &groupID
		leg1.TransferAccountID = &acc2

		leg2 := leg1
		leg2.ID = 2
		leg2.AccountID = acc2
		leg2.TransferAccountID = &acc1
		leg2.Amount = money.FromMinorUnits(500000)

		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(leg1, nil)
		repo.On("GetByGroupID", groupID, testBudgetID).Return([]models.Transaction{leg1, leg2}, nil)
		repo.On("Patch", transaction.PatchParams{
			ID:       testTransactionID,
			BudgetID: testBudgetID,
			Status:   &status,
		}).Return(leg1, nil)
		repo.On("Patch", transaction.PatchParams{
			ID:       leg2.ID,
			BudgetID: testBudgetID,
			Status:   &status,
		}).Return(leg2, nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{Status: &status})
		require.NoError(t, err)
		repo.AssertExpectations(t)
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

	t.Run("locked account returns ErrAccountLocked and does not delete", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-100000), nil)

		checker := &internalmock.AccountChecker{}
		checker.On("IsImmutable", testAccountID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleOwner)

		assert.ErrorIs(t, err, transaction.ErrAccountLocked)
		repo.AssertNotCalled(t, "SoftDelete")
		repo.AssertNotCalled(t, "SoftDeleteByGroupID")
	})

	t.Run("locked account guard also blocks transfer leg deletion", func(t *testing.T) {
		t.Parallel()
		groupID := "test-group-id"
		txnWithGroup := makeTxn(-500000)
		txnWithGroup.TransferGroupID = &groupID

		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(txnWithGroup, nil)

		checker := &internalmock.AccountChecker{}
		checker.On("IsImmutable", testAccountID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		err := svc.Delete(context.Background(), testTransactionID, testBudgetID, models.RoleOwner)

		assert.ErrorIs(t, err, transaction.ErrAccountLocked)
		repo.AssertNotCalled(t, "SoftDeleteByGroupID")
	})
}

// ---------------------------------------------------------------------------
// TestSvc_ArchivedAccountGuard covers the archived-account guard wired via
// SetAccountChecker across Create, CreateTransfer, Replace, and Patch.
// ---------------------------------------------------------------------------

func TestSvc_ArchivedAccountGuard(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("Create rejects archived account", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		checker := &internalmock.AccountChecker{}
		checker.On("IsArchived", testAccountID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrAccountArchived)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("Create succeeds when account is active", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", testifymock.Anything).Return(makeTxnWithEnvelope(-1000), nil)
		checker := &internalmock.AccountChecker{}
		checker.On("IsArchived", testAccountID, testBudgetID).Return(false, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		require.NoError(t, err)
		checker.AssertExpectations(t)
	})

	t.Run("CreateTransfer rejects when source account is archived", func(t *testing.T) {
		t.Parallel()
		dst := testAccount2ID
		repo := &internalmock.TransactionRepository{}
		checker := &internalmock.AccountChecker{}
		checker.On("IsArchived", testAccountID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		_, err := svc.CreateTransfer(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:         testAccountID,
			TransferAccountID: &dst,
			Amount:            money.FromMinorUnits(-1000),
			Date:              testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrAccountArchived)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("CreateTransfer rejects when destination account is archived", func(t *testing.T) {
		t.Parallel()
		dst := testAccount2ID
		repo := &internalmock.TransactionRepository{}
		checker := &internalmock.AccountChecker{}
		checker.On("IsArchived", testAccountID, testBudgetID).Return(false, nil)
		checker.On("IsArchived", testAccount2ID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		_, err := svc.CreateTransfer(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:         testAccountID,
			TransferAccountID: &dst,
			Amount:            money.FromMinorUnits(-1000),
			Date:              testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrAccountArchived)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("Replace rejects archived account", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		checker := &internalmock.AccountChecker{}
		checker.On("IsArchived", testAccountID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrAccountArchived)
		repo.AssertNotCalled(t, "Update")
	})

	t.Run("Patch rejects moving transaction to archived account", func(t *testing.T) {
		t.Parallel()
		newAccountID := testAccount2ID
		repo := &internalmock.TransactionRepository{}
		checker := &internalmock.AccountChecker{}
		checker.On("IsArchived", testAccount2ID, testBudgetID).Return(true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetAccountChecker(checker)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{
			AccountID: &newAccountID,
		})

		assert.ErrorIs(t, err, transaction.ErrAccountArchived)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("guard is skipped when no AccountChecker is wired", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", testifymock.Anything).Return(makeTxnWithEnvelope(-1000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		require.NoError(t, err)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_ArchivedEnvelopeGuard covers the archived/out-of-budget envelope
// guard wired via SetEnvelopeChecker across Create, Replace, and Patch.
// ---------------------------------------------------------------------------

func TestSvc_ArchivedEnvelopeGuard(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("Create rejects archived envelope", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		envelopes := &internalmock.EnvelopeChecker{}
		envelopes.On("ArchivedState", testEnvelopeID, testBudgetID).Return(true, true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrEnvelopeArchived)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("Create rejects envelope not in this budget", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		envelopes := &internalmock.EnvelopeChecker{}
		envelopes.On("ArchivedState", testEnvelopeID, testBudgetID).Return(false, false, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrEnvelopeNotFound)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("Create succeeds when envelope is active", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", testifymock.Anything).Return(makeTxnWithEnvelope(-1000), nil)
		envelopes := &internalmock.EnvelopeChecker{}
		envelopes.On("ArchivedState", testEnvelopeID, testBudgetID).Return(true, false, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		require.NoError(t, err)
		envelopes.AssertExpectations(t)
	})

	t.Run("Replace rejects moving transaction onto an archived envelope", func(t *testing.T) {
		t.Parallel()
		var newEnvelopeID int64 = 99
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		envelopes := &internalmock.EnvelopeChecker{}
		envelopes.On("ArchivedState", newEnvelopeID, testBudgetID).Return(true, true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &newEnvelopeID,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		assert.ErrorIs(t, err, transaction.ErrEnvelopeArchived)
		repo.AssertNotCalled(t, "Update")
	})

	t.Run("Replace succeeds editing a historical transaction whose envelope is unchanged and archived", func(t *testing.T) {
		t.Parallel()
		sameEnvelopeID := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Update", testifymock.Anything).Return(makeTxnWithEnvelope(-2000), nil)
		envelopes := &internalmock.EnvelopeChecker{}

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Replace(context.Background(), testTransactionID, testBudgetID, transaction.ReplaceRequest{
			AccountID:  testAccountID,
			EnvelopeID: &sameEnvelopeID,
			Amount:     money.FromMinorUnits(-2000),
			Date:       testDate,
		})

		require.NoError(t, err)
		envelopes.AssertNotCalled(t, "ArchivedState")
	})

	t.Run("Patch rejects moving transaction onto an archived envelope", func(t *testing.T) {
		t.Parallel()
		var newEnvelopeID int64 = 99
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		envelopes := &internalmock.EnvelopeChecker{}
		envelopes.On("ArchivedState", newEnvelopeID, testBudgetID).Return(true, true, nil)

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{
			EnvelopeID: &newEnvelopeID,
		})

		assert.ErrorIs(t, err, transaction.ErrEnvelopeArchived)
		repo.AssertNotCalled(t, "Patch")
	})

	t.Run("Patch with no EnvelopeID never calls the checker", func(t *testing.T) {
		t.Parallel()
		newAmount := money.FromMinorUnits(-3000)
		repo := &internalmock.TransactionRepository{}
		repo.On("GetByID", testTransactionID, testBudgetID).Return(makeTxnWithEnvelope(-150000), nil)
		repo.On("Patch", testifymock.Anything).Return(makeTxnWithEnvelope(-3000), nil)
		envelopes := &internalmock.EnvelopeChecker{}

		svc := transaction.NewSvc(repo, log)
		svc.SetEnvelopeChecker(envelopes)
		_, err := svc.Patch(context.Background(), testTransactionID, testBudgetID, transaction.PatchRequest{
			Amount: &newAmount,
		})

		require.NoError(t, err)
		envelopes.AssertNotCalled(t, "ArchivedState")
	})

	t.Run("guard is skipped when no EnvelopeChecker is wired", func(t *testing.T) {
		t.Parallel()
		eid := testEnvelopeID
		repo := &internalmock.TransactionRepository{}
		repo.On("Create", testifymock.Anything).Return(makeTxnWithEnvelope(-1000), nil)

		svc := transaction.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, transaction.CreateRequest{
			AccountID:  testAccountID,
			EnvelopeID: &eid,
			Amount:     money.FromMinorUnits(-1000),
			Date:       testDate,
		})

		require.NoError(t, err)
	})
}
