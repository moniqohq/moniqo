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
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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

// makeEnvelopeWithNature returns a fixed envelope with a non-nil Nature, to
// verify that Nature set at creation survives Replace/Patch round trips.
func makeEnvelopeWithNature(title, nature string) models.BudgetEnvelope {
	e := makeEnvelope(title)
	e.Nature = &nature
	return e
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

	t.Run("forwards nature to CreateParams", func(t *testing.T) {
		t.Parallel()
		nature := "want"
		repo := &internalmock.EnvelopeRepository{}
		repo.On("ExistsByTitle", testBudgetID, "Groceries", (*int64)(nil)).Return(false, nil)
		repo.On("Create", envelope.CreateParams{
			BudgetID:     testBudgetID,
			Title:        "Groceries",
			AllocatedAmt: money.FromMinorUnits(50000),
			Nature:       &nature,
		}).Return(makeEnvelope("Groceries"), nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testBudgetID, envelope.CreateRequest{
			Title:        "Groceries",
			AllocatedAmt: money.FromMinorUnits(50000),
			Nature:       &nature,
		})

		require.NoError(t, err)
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

	t.Run("is_overspent false when spent equals allocated", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Utilities"), nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(50000), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.GetByID(context.Background(), testEnvelopeID, testBudgetID)

		require.NoError(t, err)
		assert.False(t, e.IsOverspent) // 500 spent == 500 allocated, not overspent
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
		repo.On("ListByBudget", testBudgetID, mock.Anything).Return([]models.BudgetEnvelope{makeEnvelope("Food"), makeEnvelope("Gas")}, nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(1000), nil)

		svc := envelope.NewSvc(repo, log)
		es, err := svc.List(context.Background(), testBudgetID, nil)

		require.NoError(t, err)
		assert.Len(t, es, 2)
		assert.Equal(t, money.FromMinorUnits(1000), es[0].SpentAmt)
	})

	t.Run("returns empty slice (not nil) when no envelopes", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("ListByBudget", testBudgetID, mock.Anything).Return([]models.BudgetEnvelope{}, nil)

		svc := envelope.NewSvc(repo, log)
		es, err := svc.List(context.Background(), testBudgetID, nil)

		require.NoError(t, err)
		assert.NotNil(t, es)
		assert.Empty(t, es)
	})

	t.Run("passes archived filter through to repository", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		archived := true
		repo.On("ListByBudget", testBudgetID, &archived).Return([]models.BudgetEnvelope{}, nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.List(context.Background(), testBudgetID, &archived)

		require.NoError(t, err)
		repo.AssertCalled(t, "ListByBudget", testBudgetID, &archived)
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

	t.Run("regression: cannot zero allocated_amt on an overspent envelope", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Food"), nil)
		repo.On("ExistsByTitle", testBudgetID, "Food", envelopeIDPtr()).Return(false, nil)
		// Allocated 50000, spent 60000 (positive magnitude) — the envelope is overspent.
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(60000), nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testEnvelopeID, testBudgetID, envelope.ReplaceRequest{
			Title:        "Food",
			AllocatedAmt: money.FromMinorUnits(0),
		})

		assert.ErrorIs(t, err, envelope.ErrValidation)
		repo.AssertNotCalled(t, "Update", mock.Anything)
	})

	t.Run("preserves nature — not part of UpdateParams", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelopeWithNature("Old", "need"), nil)
		repo.On("ExistsByTitle", testBudgetID, "New", envelopeIDPtr()).Return(false, nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(0), nil)
		repo.On("Update", envelope.UpdateParams{
			ID:           testEnvelopeID,
			BudgetID:     testBudgetID,
			Title:        "New",
			AllocatedAmt: money.FromMinorUnits(60000),
		}).Return(makeEnvelopeWithNature("New", "need"), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.Replace(context.Background(), testEnvelopeID, testBudgetID, envelope.ReplaceRequest{
			Title:        "New",
			AllocatedAmt: money.FromMinorUnits(60000),
		})

		require.NoError(t, err)
		require.NotNil(t, e.Nature)
		assert.Equal(t, "need", *e.Nature)
		repo.AssertExpectations(t)
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

	t.Run("regression: cannot zero allocated_amt on an overspent envelope", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		zero := money.FromMinorUnits(0)
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Food"), nil)
		// Allocated 50000, spent 60000 (positive magnitude) — the envelope is overspent.
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(60000), nil)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testEnvelopeID, testBudgetID, envelope.PatchRequest{
			AllocatedAmt: &zero,
		})

		assert.ErrorIs(t, err, envelope.ErrValidation)
		repo.AssertNotCalled(t, "Patch", mock.Anything)
	})

	t.Run("preserves nature — not part of PatchParams", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelopeWithNature("Food", "must"), nil)
		repo.On("ExistsByTitle", testBudgetID, "Updated", envelopeIDPtr()).Return(false, nil)
		repo.On("Patch", envelope.PatchParams{
			ID:       testEnvelopeID,
			BudgetID: testBudgetID,
			Title:    &title,
		}).Return(makeEnvelopeWithNature("Updated", "must"), nil)
		repo.On("SumSpent", testEnvelopeID, testBudgetID).Return(money.FromMinorUnits(0), nil)

		svc := envelope.NewSvc(repo, log)
		e, err := svc.Patch(context.Background(), testEnvelopeID, testBudgetID, envelope.PatchRequest{
			Title: &title,
		})

		require.NoError(t, err)
		require.NotNil(t, e.Nature)
		assert.Equal(t, "must", *e.Nature)
		repo.AssertExpectations(t)
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
// TestSvc_ForceDelete
// ---------------------------------------------------------------------------

func TestSvc_ForceDelete(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("owner — force deletes envelope and transactions", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(makeEnvelope("Old"), nil)
		repo.On("ForceDelete", testEnvelopeID, testBudgetID).Return(nil)

		svc := envelope.NewSvc(repo, log)
		err := svc.ForceDelete(context.Background(), testEnvelopeID, testBudgetID, models.RoleOwner)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("admin role returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}

		svc := envelope.NewSvc(repo, log)
		err := svc.ForceDelete(context.Background(), testEnvelopeID, testBudgetID, models.RoleAdmin)

		assert.ErrorIs(t, err, envelope.ErrForbidden)
		repo.AssertNotCalled(t, "GetByID")
	})

	t.Run("viewer role returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}

		svc := envelope.NewSvc(repo, log)
		err := svc.ForceDelete(context.Background(), testEnvelopeID, testBudgetID, models.RoleViewer)

		assert.ErrorIs(t, err, envelope.ErrForbidden)
	})

	t.Run("idempotent — missing envelope returns nil", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetByID", testEnvelopeID, testBudgetID).Return(models.BudgetEnvelope{}, envelope.ErrNotFound)

		svc := envelope.NewSvc(repo, log)
		err := svc.ForceDelete(context.Background(), testEnvelopeID, testBudgetID, models.RoleOwner)

		require.NoError(t, err)
		repo.AssertNotCalled(t, "ForceDelete")
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
		assert.Equal(t, money.FromMinorUnits(70000), s.ToBeBudgeted) // 1000 - 600 + 300
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
		assert.Equal(t, money.FromMinorUnits(-10000), s.ToBeBudgeted) // 500 - 800 + 200
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

	t.Run("categorized spend is TBB-neutral", func(t *testing.T) {
		t.Parallel()

		// Before: inflow 200000, nothing allocated or spent yet.
		before := &internalmock.EnvelopeRepository{}
		before.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(200000), nil)
		before.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 100000,
			TotalSpent:     0,
			OverspentCount: 0,
		}, nil)
		svcBefore := envelope.NewSvc(before, log)
		sBefore, err := svcBefore.GetBudgetSummary(context.Background(), testBudgetID)
		require.NoError(t, err)

		// After: a 50000 categorized spend lowers cash and spent together.
		after := &internalmock.EnvelopeRepository{}
		after.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(150000), nil)
		after.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 100000,
			TotalSpent:     50000,
			OverspentCount: 0,
		}, nil)
		svcAfter := envelope.NewSvc(after, log)
		sAfter, err := svcAfter.GetBudgetSummary(context.Background(), testBudgetID)
		require.NoError(t, err)

		assert.Equal(t, money.FromMinorUnits(100000), sBefore.ToBeBudgeted)
		assert.Equal(t, money.FromMinorUnits(100000), sAfter.ToBeBudgeted)
		assert.Equal(t, sBefore.ToBeBudgeted, sAfter.ToBeBudgeted)
	})

	t.Run("overspent envelope does not leak into TBB", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(5000), nil)
		repo.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 10000,
			TotalSpent:     15000,
			OverspentCount: 1,
		}, nil)

		svc := envelope.NewSvc(repo, log)
		s, err := svc.GetBudgetSummary(context.Background(), testBudgetID)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(10000), s.ToBeBudgeted) // 5000 - 10000 + 15000
	})
}

// ---------------------------------------------------------------------------
// TestSvc_Reallocate
// ---------------------------------------------------------------------------

func TestSvc_Reallocate(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	fromID := int64(1)
	toID := int64(2)

	t.Run("envelope to envelope happy path", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		req := envelope.ReallocateRequest{
			FromEnvelopeID: &fromID,
			ToEnvelopeID:   &toID,
			Amount:         money.FromMinorUnits(25000),
		}
		fromEnv := makeEnvelope("Groceries")
		toEnv := makeEnvelope("Dining")
		repo.On("Reallocate", testBudgetID, req).Return(&fromEnv, &toEnv, nil)
		repo.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(100000), nil)
		repo.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{
			TotalAllocated: 60000,
			TotalSpent:     0,
			OverspentCount: 0,
		}, nil)

		svc := envelope.NewSvc(repo, log)
		result, err := svc.Reallocate(context.Background(), testBudgetID, req, models.RoleEditor)

		require.NoError(t, err)
		require.NotNil(t, result.FromEnvelope)
		require.NotNil(t, result.ToEnvelope)
		assert.Equal(t, "Groceries", result.FromEnvelope.Title)
		assert.Equal(t, "Dining", result.ToEnvelope.Title)
		repo.AssertExpectations(t)
	})

	t.Run("from To Be Budgeted", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		req := envelope.ReallocateRequest{
			ToEnvelopeID: &toID,
			Amount:       money.FromMinorUnits(10000),
		}
		toEnv := makeEnvelope("Dining")
		repo.On("Reallocate", testBudgetID, req).Return((*models.BudgetEnvelope)(nil), &toEnv, nil)
		repo.On("SumOnBudgetBalances", testBudgetID).Return(money.FromMinorUnits(100000), nil)
		repo.On("GetBudgetSummaryRow", testBudgetID).Return(db.GetBudgetEnvelopeSummaryRow{}, nil)

		svc := envelope.NewSvc(repo, log)
		result, err := svc.Reallocate(context.Background(), testBudgetID, req, models.RoleOwner)

		require.NoError(t, err)
		assert.Nil(t, result.FromEnvelope)
		require.NotNil(t, result.ToEnvelope)
	})

	t.Run("viewer role returns ErrForbidden", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		req := envelope.ReallocateRequest{
			FromEnvelopeID: &fromID,
			ToEnvelopeID:   &toID,
			Amount:         money.FromMinorUnits(1000),
		}

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Reallocate(context.Background(), testBudgetID, req, models.RoleViewer)

		assert.ErrorIs(t, err, envelope.ErrForbidden)
		repo.AssertNotCalled(t, "Reallocate", mock.Anything, mock.Anything)
	})

	t.Run("insufficient available balance returns ErrValidation", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		req := envelope.ReallocateRequest{
			FromEnvelopeID: &fromID,
			ToEnvelopeID:   &toID,
			Amount:         money.FromMinorUnits(999999),
		}
		repo.On("Reallocate", testBudgetID, req).
			Return((*models.BudgetEnvelope)(nil), (*models.BudgetEnvelope)(nil), envelope.ErrValidation)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Reallocate(context.Background(), testBudgetID, req, models.RoleEditor)

		assert.ErrorIs(t, err, envelope.ErrValidation)
	})

	t.Run("unknown envelope returns ErrNotFound", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		req := envelope.ReallocateRequest{
			FromEnvelopeID: &fromID,
			ToEnvelopeID:   &toID,
			Amount:         money.FromMinorUnits(1000),
		}
		repo.On("Reallocate", testBudgetID, req).
			Return((*models.BudgetEnvelope)(nil), (*models.BudgetEnvelope)(nil), envelope.ErrNotFound)

		svc := envelope.NewSvc(repo, log)
		_, err := svc.Reallocate(context.Background(), testBudgetID, req, models.RoleEditor)

		assert.ErrorIs(t, err, envelope.ErrNotFound)
	})
}

// ---------------------------------------------------------------------------
// TestSvc_GetDashboardStats
// ---------------------------------------------------------------------------

func TestSvc_GetDashboardStats(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	month := time.Date(2026, time.March, 1, 0, 0, 0, 0, time.UTC)

	t.Run("passes net worth through unchanged and leaves other stats untouched", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetNetWorth", testBudgetID).Return(money.FromMinorUnits(250000), nil)
		repo.On("GetMonthlyStats", testBudgetID, month).Return(db.GetMonthlyStatsRow{
			Income:   80000,
			Expenses: 30000,
		}, nil)
		repo.On("GetMonthlySparkline", testBudgetID).Return([]db.GetMonthlySparklineRow{
			{Month: pgtype.Date{Time: time.Date(2026, time.February, 1, 0, 0, 0, 0, time.UTC), Valid: true}, Income: 70000, Expenses: 40000},
			{Month: pgtype.Date{Time: month, Valid: true}, Income: 80000, Expenses: 30000},
		}, nil)

		svc := envelope.NewSvc(repo, log)
		stats, err := svc.GetDashboardStats(context.Background(), testBudgetID, month)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(250000), stats.NetWorth)
		assert.Equal(t, money.FromMinorUnits(80000), stats.MonthlyIncome)
		assert.Equal(t, money.FromMinorUnits(30000), stats.MonthlyExpenses)
		assert.Equal(t, money.FromMinorUnits(50000), stats.MonthlySavings)
		require.Len(t, stats.Sparkline, 2)
		assert.Equal(t, "2026-02", stats.Sparkline[0].Month)
		assert.Equal(t, money.FromMinorUnits(70000), stats.Sparkline[0].Income)
		assert.Equal(t, "2026-03", stats.Sparkline[1].Month)
		repo.AssertExpectations(t)
	})

	t.Run("negative net worth (liabilities exceed assets) passes through unchanged", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetNetWorth", testBudgetID).Return(money.FromMinorUnits(-15000), nil)
		repo.On("GetMonthlyStats", testBudgetID, month).Return(db.GetMonthlyStatsRow{}, nil)
		repo.On("GetMonthlySparkline", testBudgetID).Return([]db.GetMonthlySparklineRow{}, nil)

		svc := envelope.NewSvc(repo, log)
		stats, err := svc.GetDashboardStats(context.Background(), testBudgetID, month)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(-15000), stats.NetWorth)
	})

	t.Run("empty budget returns zero net worth", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetNetWorth", testBudgetID).Return(money.FromMinorUnits(0), nil)
		repo.On("GetMonthlyStats", testBudgetID, month).Return(db.GetMonthlyStatsRow{}, nil)
		repo.On("GetMonthlySparkline", testBudgetID).Return([]db.GetMonthlySparklineRow{}, nil)

		svc := envelope.NewSvc(repo, log)
		stats, err := svc.GetDashboardStats(context.Background(), testBudgetID, month)

		require.NoError(t, err)
		assert.Equal(t, money.FromMinorUnits(0), stats.NetWorth)
	})

	t.Run("repo failure on GetNetWorth is propagated", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.EnvelopeRepository{}
		repo.On("GetNetWorth", testBudgetID).Return(nil, errors.New("db error"))

		svc := envelope.NewSvc(repo, log)
		_, err := svc.GetDashboardStats(context.Background(), testBudgetID, month)

		require.Error(t, err)
		repo.AssertNotCalled(t, "GetMonthlyStats", mock.Anything, mock.Anything)
	})
}
