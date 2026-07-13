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

package search_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/search"
)

const (
	testBudgetID = int64(10)
	testUserID   = int64(99)
)

func TestSvc_Search_RejectsShortQuery(t *testing.T) {
	t.Parallel()

	repo := &internalmock.SearchRepository{}
	svc := search.NewSvc(repo, zap.NewNop())

	for _, q := range []string{"", " ", "a", "  x  "} {
		_, err := svc.Search(context.Background(), testBudgetID, testUserID, q, 0)
		require.ErrorIs(t, err, search.ErrValidation)
	}
	// Repo must never be touched for rejected queries.
	repo.AssertNotCalled(t, "SearchTransactions", mock.Anything, mock.Anything, mock.Anything)
}

func TestSvc_Search_TrimsAndClampsLimit(t *testing.T) {
	t.Parallel()

	repo := &internalmock.SearchRepository{}
	// Trimmed query "groc" and clamped limit 20 (requested 100) are expected.
	repo.On("SearchTransactions", testBudgetID, "groc", 20).Return([]search.TxnHit{{ID: 1}}, nil)
	repo.On("SearchAccounts", testBudgetID, "groc", 20).Return([]search.AccountHit{}, nil)
	repo.On("SearchEnvelopes", testBudgetID, "groc", 20).Return([]search.EnvelopeHit{{ID: 2, Title: "Groceries"}}, nil)
	repo.On("SearchBudgets", testUserID, "groc", 20).Return([]search.BudgetHit{}, nil)

	svc := search.NewSvc(repo, zap.NewNop())
	res, err := svc.Search(context.Background(), testBudgetID, testUserID, "  groc  ", 100)
	require.NoError(t, err)

	assert.Len(t, res.Transactions, 1)
	assert.Len(t, res.Envelopes, 1)
	assert.NotNil(t, res.Accounts)
	assert.NotNil(t, res.Budgets)
	repo.AssertExpectations(t)
}

func TestSvc_Search_DefaultLimitWhenUnset(t *testing.T) {
	t.Parallel()

	repo := &internalmock.SearchRepository{}
	repo.On("SearchTransactions", testBudgetID, "rent", 5).Return([]search.TxnHit{}, nil)
	repo.On("SearchAccounts", testBudgetID, "rent", 5).Return([]search.AccountHit{}, nil)
	repo.On("SearchEnvelopes", testBudgetID, "rent", 5).Return([]search.EnvelopeHit{}, nil)
	repo.On("SearchBudgets", testUserID, "rent", 5).Return([]search.BudgetHit{}, nil)

	svc := search.NewSvc(repo, zap.NewNop())
	_, err := svc.Search(context.Background(), testBudgetID, testUserID, "rent", 0)
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestSvc_Search_PropagatesRepoError(t *testing.T) {
	t.Parallel()

	sentinel := errors.New("boom")
	repo := &internalmock.SearchRepository{}
	repo.On("SearchTransactions", testBudgetID, "food", 5).Return(nil, sentinel)

	svc := search.NewSvc(repo, zap.NewNop())
	_, err := svc.Search(context.Background(), testBudgetID, testUserID, "food", 0)
	require.ErrorIs(t, err, sentinel)
}
