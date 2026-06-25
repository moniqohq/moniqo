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

const (
	testUserID   int64 = 1
	testBudgetID int64 = 10
)

func makeBudget(title string) models.Budget {
	notes := "some notes"
	return models.Budget{ID: testBudgetID, Title: title, Notes: &notes}
}

func TestSvc_Create(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "My Budget", int64(0)).Return(false, nil)
		repo.On("CreateWithOwner", budget.CreateParams{Title: "My Budget", Notes: nil}, testUserID).
			Return(makeBudget("My Budget"), nil)

		svc := budget.NewSvc(repo, log)
		b, err := svc.Create(context.Background(), testUserID, budget.CreateRequest{Title: "My Budget"})

		require.NoError(t, err)
		assert.Equal(t, "My Budget", b.Title)
		repo.AssertExpectations(t)
	})

	t.Run("duplicate title returns ErrBudgetAlreadyExists", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "Dupe", int64(0)).Return(true, nil)

		svc := budget.NewSvc(repo, log)
		_, err := svc.Create(context.Background(), testUserID, budget.CreateRequest{Title: "Dupe"})

		assert.ErrorIs(t, err, budget.ErrBudgetAlreadyExists)
		repo.AssertExpectations(t)
	})
}

func TestSvc_List(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("returns budgets", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("ListForUser", testUserID).Return([]models.Budget{makeBudget("B1")}, nil)

		svc := budget.NewSvc(repo, log)
		budgets, err := svc.List(context.Background(), testUserID)

		require.NoError(t, err)
		assert.Len(t, budgets, 1)
	})

	t.Run("nil result returns empty slice", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("ListForUser", testUserID).Return(nil, nil)

		svc := budget.NewSvc(repo, log)
		budgets, err := svc.List(context.Background(), testUserID)

		require.NoError(t, err)
		assert.Empty(t, budgets)
		assert.NotNil(t, budgets)
	})
}

func TestSvc_Replace(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "New Title", testBudgetID).Return(false, nil)
		repo.On("Update", budget.UpdateParams{ID: testBudgetID, Title: "New Title"}).Return(makeBudget("New Title"), nil)

		svc := budget.NewSvc(repo, log)
		b, err := svc.Replace(context.Background(), testUserID, testBudgetID, budget.ReplaceRequest{Title: "New Title"})

		require.NoError(t, err)
		assert.Equal(t, "New Title", b.Title)
		repo.AssertExpectations(t)
	})

	t.Run("duplicate title returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "Taken", testBudgetID).Return(true, nil)

		svc := budget.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testUserID, testBudgetID, budget.ReplaceRequest{Title: "Taken"})

		assert.ErrorIs(t, err, budget.ErrConflict)
	})

	t.Run("not found propagates", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "Title", testBudgetID).Return(false, nil)
		repo.On("Update", budget.UpdateParams{ID: testBudgetID, Title: "Title"}).Return(models.Budget{}, budget.ErrNotFound)

		svc := budget.NewSvc(repo, log)
		_, err := svc.Replace(context.Background(), testUserID, testBudgetID, budget.ReplaceRequest{Title: "Title"})

		assert.ErrorIs(t, err, budget.ErrNotFound)
	})
}

func TestSvc_Patch(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()
	title := "New"

	t.Run("title only", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "New", testBudgetID).Return(false, nil)
		repo.On("Patch", budget.PatchParams{ID: testBudgetID, Title: &title}).Return(makeBudget("New"), nil)

		svc := budget.NewSvc(repo, log)
		b, err := svc.Patch(context.Background(), testUserID, testBudgetID, budget.PatchRequest{Title: &title})

		require.NoError(t, err)
		assert.Equal(t, "New", b.Title)
		repo.AssertExpectations(t)
	})

	t.Run("duplicate title returns ErrConflict", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("TitleExistsForUser", testUserID, "New", testBudgetID).Return(true, nil)

		svc := budget.NewSvc(repo, log)
		_, err := svc.Patch(context.Background(), testUserID, testBudgetID, budget.PatchRequest{Title: &title})

		assert.ErrorIs(t, err, budget.ErrConflict)
	})
}

func TestSvc_SoftDelete(t *testing.T) {
	t.Parallel()
	log := zap.NewNop()

	t.Run("success", func(t *testing.T) {
		t.Parallel()
		repo := &internalmock.BudgetRepository{}
		repo.On("SoftDeleteCascade", testBudgetID).Return(nil)

		svc := budget.NewSvc(repo, log)
		err := svc.SoftDelete(context.Background(), testBudgetID)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})
}
