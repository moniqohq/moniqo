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

package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/search"
)

// -----------------------------------------------------------------------------
// Service mock (function-field style, for handler tests)
// -----------------------------------------------------------------------------

// SearchService is a test double for the search.Service interface.
type SearchService struct {
	SearchFn func(ctx context.Context, budgetID, userID int64, query string, limit int) (search.Results, error)
}

// Search delegates to the SearchFn stub.
func (m *SearchService) Search(
	ctx context.Context, budgetID, userID int64, query string, limit int,
) (search.Results, error) {
	return m.SearchFn(ctx, budgetID, userID, query, limit)
}

// -----------------------------------------------------------------------------
// Repository mock (testify mock style, for service tests)
// -----------------------------------------------------------------------------

// SearchRepository is a testify mock for search.Repository.
type SearchRepository struct {
	mock.Mock
}

// SearchTransactions records the call and returns the configured stub values.
func (m *SearchRepository) SearchTransactions(
	_ context.Context, budgetID int64, query string, limit int,
) ([]search.TxnHit, error) {
	args := m.Called(budgetID, query, limit)
	hits, ok := args.Get(0).([]search.TxnHit)
	if !ok {
		return nil, args.Error(1)
	}
	return hits, args.Error(1)
}

// SearchAccounts records the call and returns the configured stub values.
func (m *SearchRepository) SearchAccounts(
	_ context.Context, budgetID int64, query string, limit int,
) ([]search.AccountHit, error) {
	args := m.Called(budgetID, query, limit)
	hits, ok := args.Get(0).([]search.AccountHit)
	if !ok {
		return nil, args.Error(1)
	}
	return hits, args.Error(1)
}

// SearchEnvelopes records the call and returns the configured stub values.
func (m *SearchRepository) SearchEnvelopes(
	_ context.Context, budgetID int64, query string, limit int,
) ([]search.EnvelopeHit, error) {
	args := m.Called(budgetID, query, limit)
	hits, ok := args.Get(0).([]search.EnvelopeHit)
	if !ok {
		return nil, args.Error(1)
	}
	return hits, args.Error(1)
}

// SearchBudgets records the call and returns the configured stub values.
func (m *SearchRepository) SearchBudgets(
	_ context.Context, userID int64, query string, limit int,
) ([]search.BudgetHit, error) {
	args := m.Called(userID, query, limit)
	hits, ok := args.Get(0).([]search.BudgetHit)
	if !ok {
		return nil, args.Error(1)
	}
	return hits, args.Error(1)
}
