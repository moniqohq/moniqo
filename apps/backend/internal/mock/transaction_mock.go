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

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/transaction"
)

// -----------------------------------------------------------------------------
// Service mock (function-field style, for handler tests)
// -----------------------------------------------------------------------------

// TransactionService is a test double for the transaction.Service interface.
type TransactionService struct {
	CreateFn         func(ctx context.Context, budgetID int64, req transaction.CreateRequest) (models.Transaction, error)
	CreateTransferFn func(ctx context.Context, budgetID int64, req transaction.CreateRequest) (models.Transaction, error)
	GetByIDFn        func(ctx context.Context, id, budgetID int64) (models.Transaction, error)
	ListFn           func(ctx context.Context, budgetID int64, f transaction.ListFilters) ([]models.Transaction, int, error)
	ReplaceFn        func(ctx context.Context, id, budgetID int64, req transaction.ReplaceRequest) (models.Transaction, error)
	PatchFn          func(ctx context.Context, id, budgetID int64, req transaction.PatchRequest) (models.Transaction, error)
	DeleteFn         func(ctx context.Context, id, budgetID int64, callerRole models.Role) error
}

// Create delegates to the CreateFn stub.
func (m *TransactionService) Create(ctx context.Context, budgetID int64, req transaction.CreateRequest) (models.Transaction, error) {
	return m.CreateFn(ctx, budgetID, req)
}

// CreateTransfer delegates to the CreateTransferFn stub.
func (m *TransactionService) CreateTransfer(
	ctx context.Context, budgetID int64, req transaction.CreateRequest,
) (models.Transaction, error) {
	return m.CreateTransferFn(ctx, budgetID, req)
}

// GetByID delegates to the GetByIDFn stub.
func (m *TransactionService) GetByID(ctx context.Context, id, budgetID int64) (models.Transaction, error) {
	return m.GetByIDFn(ctx, id, budgetID)
}

// List delegates to the ListFn stub.
func (m *TransactionService) List(ctx context.Context, budgetID int64, f transaction.ListFilters) ([]models.Transaction, int, error) {
	return m.ListFn(ctx, budgetID, f)
}

// Replace delegates to the ReplaceFn stub.
func (m *TransactionService) Replace(ctx context.Context, id, budgetID int64, req transaction.ReplaceRequest) (models.Transaction, error) {
	return m.ReplaceFn(ctx, id, budgetID, req)
}

// Patch delegates to the PatchFn stub.
func (m *TransactionService) Patch(ctx context.Context, id, budgetID int64, req transaction.PatchRequest) (models.Transaction, error) {
	return m.PatchFn(ctx, id, budgetID, req)
}

// Delete delegates to the DeleteFn stub.
func (m *TransactionService) Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	return m.DeleteFn(ctx, id, budgetID, callerRole)
}

// -----------------------------------------------------------------------------
// Repository mock (testify mock style, for service tests)
// -----------------------------------------------------------------------------

// TransactionRepository is a testify mock for transaction.Repository.
type TransactionRepository struct {
	mock.Mock
}

// Create records the call and returns the configured stub values.
func (m *TransactionRepository) Create(_ context.Context, p transaction.CreateParams) (models.Transaction, error) {
	args := m.Called(p)
	t, ok := args.Get(0).(models.Transaction)
	if !ok {
		return models.Transaction{}, args.Error(1)
	}
	return t, args.Error(1)
}

// GetByID records the call and returns the configured stub values.
func (m *TransactionRepository) GetByID(_ context.Context, id, budgetID int64) (models.Transaction, error) {
	args := m.Called(id, budgetID)
	t, ok := args.Get(0).(models.Transaction)
	if !ok {
		return models.Transaction{}, args.Error(1)
	}
	return t, args.Error(1)
}

// List records the call and returns the configured stub values.
func (m *TransactionRepository) List(_ context.Context, budgetID int64, f transaction.ListFilters) ([]models.Transaction, error) {
	args := m.Called(budgetID, f)
	ts, ok := args.Get(0).([]models.Transaction)
	if !ok {
		return nil, args.Error(1)
	}
	return ts, args.Error(1)
}

// Count records the call and returns the configured stub values.
func (m *TransactionRepository) Count(_ context.Context, budgetID int64, f transaction.ListFilters) (int, error) {
	args := m.Called(budgetID, f)
	return args.Int(0), args.Error(1)
}

// Update records the call and returns the configured stub values.
func (m *TransactionRepository) Update(_ context.Context, p transaction.UpdateParams) (models.Transaction, error) {
	args := m.Called(p)
	t, ok := args.Get(0).(models.Transaction)
	if !ok {
		return models.Transaction{}, args.Error(1)
	}
	return t, args.Error(1)
}

// Patch records the call and returns the configured stub values.
func (m *TransactionRepository) Patch(_ context.Context, p transaction.PatchParams) (models.Transaction, error) {
	args := m.Called(p)
	t, ok := args.Get(0).(models.Transaction)
	if !ok {
		return models.Transaction{}, args.Error(1)
	}
	return t, args.Error(1)
}

// SoftDelete records the call and returns the configured stub values.
func (m *TransactionRepository) SoftDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

// GetByGroupID records the call and returns the configured stub values.
func (m *TransactionRepository) GetByGroupID(_ context.Context, groupID string, budgetID int64) ([]models.Transaction, error) {
	args := m.Called(groupID, budgetID)
	ts, ok := args.Get(0).([]models.Transaction)
	if !ok {
		return nil, args.Error(1)
	}
	return ts, args.Error(1)
}

// SoftDeleteByGroupID records the call and returns the configured stub values.
func (m *TransactionRepository) SoftDeleteByGroupID(_ context.Context, groupID string, budgetID int64) error {
	args := m.Called(groupID, budgetID)
	return args.Error(0)
}

// WithTx records the call and returns the configured stub values.
func (m *TransactionRepository) WithTx(tx pgx.Tx) transaction.Repository { //nolint:ireturn
	args := m.Called(tx)
	r, ok := args.Get(0).(transaction.Repository)
	if !ok {
		return nil
	}
	return r
}

// AccountChecker is a testify mock for transaction.AccountChecker.
type AccountChecker struct {
	mock.Mock
}

// IsArchived records the call and returns the configured stub values.
func (m *AccountChecker) IsArchived(_ context.Context, id, budgetID int64) (bool, error) {
	args := m.Called(id, budgetID)
	return args.Bool(0), args.Error(1)
}

// IsImmutable records the call and returns the configured stub values.
func (m *AccountChecker) IsImmutable(_ context.Context, id, budgetID int64) (bool, error) {
	args := m.Called(id, budgetID)
	return args.Bool(0), args.Error(1)
}
