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

package envelope_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/envelope"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

const (
	testBudgetID   int64 = 10
	testEnvelopeID int64 = 1
)

// envelopeIDPtr returns a pointer to testEnvelopeID for use in mock expectations.
func envelopeIDPtr() *int64 { v := int64(testEnvelopeID); return &v }

func makeEnvelope(title string) models.BudgetEnvelope {
	return models.BudgetEnvelope{
		ID:           testEnvelopeID,
		BudgetID:     testBudgetID,
		Title:        title,
		AllocatedAmt: money.FromMinorUnits(50000),
	}
}

// ---------------------------------------------------------------------------
// TestSvc_Create
// ---------------------------------------------------------------------------

func TestSvc_Create(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("ExistsByTitle", testBudgetID, "Groceries", (*int64)(nil)).Return(false, nil)
		repo.On("Create", envelope.CreateParams{
			BudgetID:     testBudgetID,
			Title:        "Groceries",
			AllocatedAmt: money.FromMinorUnits(50000),
		}).Return(makeEnvelope("Groceries"), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.Create(context.Background(), testBudgetID, envelope.CreateRequest{
			Title:        "Groceries",
			AllocatedAmt: money.FromMinorUnits(50000),
		})

		require.NoError(t, err)
		assert.Equal(t, "Groceries", e.Title)
		assert.Equal(t, money.FromMinorUnits(0), e.SpentAmt)
		assert.False(t, e.IsOverspent)
		repo.AssertExpectations(t)
	})

	t.Run("duplicate title returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("ExistsByTitle", testBudgetID, "Taken", (*int64)(nil)).Return(true, nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, envelope.CreateRequest{
			Title:        "Taken",
			AllocatedAmt: money.FromMinorUnits(10000),
		})

		assert.ErrorIs(t, err, envelope.ErrConflict)
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_GetByID
// ---------------------------------------------------------------------------

func TestSvc_GetByID(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success — attaches spent_amt and sets is_overspent", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Rent"), nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(30000), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.GetByID(context.Background(), testEnvelopeID, testBudgetID)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(30000), e.SpentAmt)
		assert.False(t, e.IsOverspent) // 300 spent < 500 allocated
		repo.AssertExpectations(t)
	})

	t.Run("is_overspent true when spent > allocated", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Dining"), nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(60000), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.GetByID(context.Background(), testEnvelopeID, testBudgetID)

		require.NoError(t, err)
		assert.True(t, e.IsOverspent) // 600 spent > 500 allocated
	})

	t.Run("not found returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(models.BudgetEnvelope{}, envelope.ErrNotFound)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.GetByID(context.Background(), testEnvelopeID, testBudgetID)

		assert.ErrorIs(t, err, envelope.ErrNotFound)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_List
// ---------------------------------------------------------------------------

func TestSvc_List(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("returns envelopes with spent_amt attached", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("ListByBudget", testBudgetID).Return([]models.BudgetEnvelope{makeEnvelope("Food"), makeEnvelope("Gas")}, nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(1000), nil)

		svc := envelope.NewSvc(repo, log)
		es, err := svc.List(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.Len(t, es, 2)
		assert.Equal(t, money.FromMinorUnits(1000), es[0].SpentAmt)
	})

	t.Run("returns empty slice (not nil) when no envelopes", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("ListByBudget", testBudgetID).Return([]models.BudgetEnvelope{}, nil)

		svc := envelope.NewSvc(repo, log)
		es, err := svc.List(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.NotNil(t, es)
		assert.Empty(t, es)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Replace
// ---------------------------------------------------------------------------

func TestSvc_Replace(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Old"), nil)
		repo.On("ExistsByTitle", testBudgetID, "New", envelopeIDPtr()).Return(false, nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(0), nil)
		repo.On("Update", envelope.UpdateParams{
			ID:           testEnvelopeID,
			BudgetID:     testBudgetID,
			Title:        "New",
			AllocatedAmt: money.FromMinorUnits(60000),
		}).Return(makeEnvelope("New"), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.Replace(context.Background(), testEnvelopeID, testBudgetID, envelope.ReplaceRequest{
			Title:        "New",
			AllocatedAmt: money.FromMinorUnits(60000),
		})

		require.NoError(t, err)
		assert.Equal(t, "New", e.Title)
		repo.AssertExpectations(t)
	})

	t.Run("title conflict returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Old"), nil)
		repo.On("ExistsByTitle", testBudgetID, "Taken", envelopeIDPtr()).Return(true, nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testEnvelopeID, testBudgetID, envelope.ReplaceRequest{
			Title:        "Taken",
			AllocatedAmt: money.FromMinorUnits(50000),
		})

		assert.ErrorIs(t, err, envelope.ErrConflict)
	})

	t.Run("allocated_amt < spent returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Food"), nil)
		repo.On("ExistsByTitle", testBudgetID, "Food", envelopeIDPtr()).Return(false, nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(40000), nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testEnvelopeID, testBudgetID, envelope.ReplaceRequest{
			Title:        "Food",
			AllocatedAmt: money.FromMinorUnits(20000), // less than 400 spent
		})

		assert.ErrorIs(t, err, envelope.ErrValidation)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Patch
// ---------------------------------------------------------------------------

func TestSvc_Patch(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	title := "Updated"

	t.Run("success — partial update", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Food"), nil)
		repo.On("ExistsByTitle", testBudgetID, "Updated", envelopeIDPtr()).Return(false, nil)
		repo.On("Patch", envelope.PatchParams{
			ID:       testEnvelopeID,
			BudgetID: testBudgetID,
			Title:    &title,
		}).Return(makeEnvelope("Updated"), nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(0), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.Patch(context.Background(), testEnvelopeID, testBudgetID, envelope.PatchRequest{
			Title: &title,
		})

		require.NoError(t, err)
		assert.Equal(t, "Updated", e.Title)
		repo.AssertExpectations(t)
	})

	t.Run("allocated_amt < spent returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		lowAmt := money.FromMinorUnits(100)
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Food"), nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(40000), nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testEnvelopeID, testBudgetID, envelope.PatchRequest{
			AllocatedAmt: &lowAmt,
		})

		assert.ErrorIs(t, err, envelope.ErrValidation)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Delete
// ---------------------------------------------------------------------------

func TestSvc_Delete(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("owner, no transactions — hard delete", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Old"), nil)
		repo.On("HasTransactions", testEnvelopeID, testBudgetID).Return(false, nil)
		repo.On("HardDelete", testEnvelopeID, testBudgetID).Return(nil)

		svc := envelope.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testEnvelopeID, testBudgetID, models.RoleOwner)

		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "SoftDelete")
	})

	t.Run("admin, has transactions — soft delete", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Old"), nil)
		repo.On("HasTransactions", testEnvelopeID, testBudgetID).Return(true, nil)
		repo.On("SoftDelete", testEnvelopeID, testBudgetID).Return(nil)

		svc := envelope.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testEnvelopeID, testBudgetID, models.RoleAdmin)

		require.NoError(t, err)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "HardDelete")
	})

	t.Run("viewer role returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}

		svc := envelope.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testEnvelopeID, testBudgetID, models.RoleViewer)

		assert.ErrorIs(t, err, envelope.ErrForbidden)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("editor role returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}

		svc := envelope.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testEnvelopeID, testBudgetID, models.RoleEditor)

		assert.ErrorIs(t, err, envelope.ErrForbidden)
	})

	t.Run("idempotent — missing envelope returns nil", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(models.BudgetEnvelope{}, envelope.ErrNotFound)

		svc := envelope.NewSvc(repo, log)
		err := svc.Delete(context.Background(), testEnvelopeID, testBudgetID, models.RoleOwner)

		require.NoError(t, err)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_GetBudgetSummary
// ---------------------------------------------------------------------------

func TestSvc_GetBudgetSummary(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("positive TBB", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(100000), nil)
		repo.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 60000,
			TotalSpent:     30000,
			OverspentCount: 0,
		}, nil)

		svc := envelope.NewSvc(repo, log)
		s, err := svc.GetBudgetSummary(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(40000), s.ToBeBudgeted) // 1000 - 600
		assert.Equal(t, money.FromMinorUnits(60000), s.TotalAllocated)
		assert.Equal(t, money.FromMinorUnits(30000), s.TotalSpent)
		assert.Equal(t, int64(0), s.OverspentEnvelopes)
	})

	t.Run("negative TBB — over-allocated", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(50000), nil)
		repo.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 80000,
			TotalSpent:     20000,
			OverspentCount: 2,
		}, nil)

		svc := envelope.NewSvc(repo, log)
		s, err := svc.GetBudgetSummary(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(-30000), s.ToBeBudgeted) // 500 - 800
		assert.Equal(t, int64(2), s.OverspentEnvelopes)
	})

	t.Run("zero envelopes — TBB equals on-budget balance", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(70000), nil)
		repo.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 0,
			TotalSpent:     0,
			OverspentCount: 0,
		}, nil)

		svc := envelope.NewSvc(repo, log)
		s, err := svc.GetBudgetSummary(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(70000), s.ToBeBudgeted)
	})
}
