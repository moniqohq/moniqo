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

func (m *TransactionService) Create(ctx context.Context, budgetID int64, req transaction.CreateRequest) (models.Transaction, error) {
	return m.CreateFn(ctx, budgetID, req)
}

func (m *TransactionService) CreateTransfer(ctx context.Context, budgetID int64, req transaction.CreateRequest) (models.Transaction, error) {
	return m.CreateTransferFn(ctx, budgetID, req)
}

func (m *TransactionService) GetByID(ctx context.Context, id, budgetID int64) (models.Transaction, error) {
	return m.GetByIDFn(ctx, id, budgetID)
}

func (m *TransactionService) List(ctx context.Context, budgetID int64, f transaction.ListFilters) ([]models.Transaction, int, error) {
	return m.ListFn(ctx, budgetID, f)
}

func (m *TransactionService) Replace(ctx context.Context, id, budgetID int64, req transaction.ReplaceRequest) (models.Transaction, error) {
	return m.ReplaceFn(ctx, id, budgetID, req)
}

func (m *TransactionService) Patch(ctx context.Context, id, budgetID int64, req transaction.PatchRequest) (models.Transaction, error) {
	return m.PatchFn(ctx, id, budgetID, req)
}

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

func (m *TransactionRepository) Create(_ context.Context, p transaction.CreateParams) (models.Transaction, error) {
	args := m.Called(p)
	t, _ := args.Get(0).(models.Transaction)
	return t, args.Error(1)
}

func (m *TransactionRepository) GetByID(_ context.Context, id, budgetID int64) (models.Transaction, error) {
	args := m.Called(id, budgetID)
	t, _ := args.Get(0).(models.Transaction)
	return t, args.Error(1)
}

func (m *TransactionRepository) List(_ context.Context, budgetID int64, f transaction.ListFilters) ([]models.Transaction, error) {
	args := m.Called(budgetID, f)
	ts, _ := args.Get(0).([]models.Transaction)
	return ts, args.Error(1)
}

func (m *TransactionRepository) Count(_ context.Context, budgetID int64, f transaction.ListFilters) (int, error) {
	args := m.Called(budgetID, f)
	return args.Int(0), args.Error(1)
}

func (m *TransactionRepository) Update(_ context.Context, p transaction.UpdateParams) (models.Transaction, error) {
	args := m.Called(p)
	t, _ := args.Get(0).(models.Transaction)
	return t, args.Error(1)
}

func (m *TransactionRepository) Patch(_ context.Context, p transaction.PatchParams) (models.Transaction, error) {
	args := m.Called(p)
	t, _ := args.Get(0).(models.Transaction)
	return t, args.Error(1)
}

func (m *TransactionRepository) SoftDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

func (m *TransactionRepository) GetByGroupID(_ context.Context, groupID string, budgetID int64) ([]models.Transaction, error) {
	args := m.Called(groupID, budgetID)
	ts, _ := args.Get(0).([]models.Transaction)
	return ts, args.Error(1)
}

func (m *TransactionRepository) SoftDeleteByGroupID(_ context.Context, groupID string, budgetID int64) error {
	args := m.Called(groupID, budgetID)
	return args.Error(0)
}

func (m *TransactionRepository) WithTx(tx pgx.Tx) transaction.Repository {
	args := m.Called(tx)
	r, _ := args.Get(0).(transaction.Repository)
	return r
}
