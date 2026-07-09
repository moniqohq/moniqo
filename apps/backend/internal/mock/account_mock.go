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

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/account"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// -----------------------------------------------------------------------------
// Service mock (function-field style, for handler tests)
// -----------------------------------------------------------------------------

// AccountService is a test double for the account.Service interface.
type AccountService struct {
	CreateFn    func(ctx context.Context, budgetID int64, req account.CreateRequest) (models.Account, error)
	GetByIDFn   func(ctx context.Context, id, budgetID int64) (models.Account, error)
	ListFn      func(ctx context.Context, budgetID int64, archived *bool) ([]models.Account, error)
	ReplaceFn   func(ctx context.Context, id, budgetID int64, req account.ReplaceRequest) (models.Account, error)
	PatchFn     func(ctx context.Context, id, budgetID int64, req account.PatchRequest, callerRole models.Role) (models.Account, error)
	DeleteFn    func(ctx context.Context, id, budgetID int64, callerRole models.Role) error
	ReconcileFn func(ctx context.Context, id, budgetID int64) (models.Account, error)
	ArchiveFn   func(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error)
	UnarchiveFn func(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error)

	BalanceHistoryFn func(ctx context.Context, budgetID int64, months int) (models.AccountBalanceHistory, error)
}

// Create delegates to CreateFn.
func (m *AccountService) Create(ctx context.Context, budgetID int64, req account.CreateRequest) (models.Account, error) {
	return m.CreateFn(ctx, budgetID, req)
}

// GetByID delegates to GetByIDFn.
func (m *AccountService) GetByID(ctx context.Context, id, budgetID int64) (models.Account, error) {
	return m.GetByIDFn(ctx, id, budgetID)
}

// List delegates to ListFn.
func (m *AccountService) List(ctx context.Context, budgetID int64, archived *bool) ([]models.Account, error) {
	return m.ListFn(ctx, budgetID, archived)
}

// Replace delegates to ReplaceFn.
func (m *AccountService) Replace(ctx context.Context, id, budgetID int64, req account.ReplaceRequest) (models.Account, error) {
	return m.ReplaceFn(ctx, id, budgetID, req)
}

// Patch delegates to PatchFn.
func (m *AccountService) Patch(
	ctx context.Context, id, budgetID int64, req account.PatchRequest, callerRole models.Role,
) (models.Account, error) {
	return m.PatchFn(ctx, id, budgetID, req, callerRole)
}

// Delete delegates to DeleteFn.
func (m *AccountService) Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	return m.DeleteFn(ctx, id, budgetID, callerRole)
}

// Reconcile delegates to ReconcileFn.
func (m *AccountService) Reconcile(ctx context.Context, id, budgetID int64) (models.Account, error) {
	return m.ReconcileFn(ctx, id, budgetID)
}

// Archive delegates to ArchiveFn.
func (m *AccountService) Archive(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error) {
	return m.ArchiveFn(ctx, id, budgetID, callerRole)
}

// Unarchive delegates to UnarchiveFn.
func (m *AccountService) Unarchive(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error) {
	return m.UnarchiveFn(ctx, id, budgetID, callerRole)
}

// BalanceHistory delegates to BalanceHistoryFn.
func (m *AccountService) BalanceHistory(ctx context.Context, budgetID int64, months int) (models.AccountBalanceHistory, error) {
	return m.BalanceHistoryFn(ctx, budgetID, months)
}

// -----------------------------------------------------------------------------
// Repository mock (testify mock style, for service tests)
// -----------------------------------------------------------------------------

// AccountRepository is a testify mock for account.Repository.
type AccountRepository struct {
	mock.Mock
}

// Create records the call and returns the configured stub values.
func (m *AccountRepository) Create(_ context.Context, p account.CreateParams) (models.Account, error) {
	args := m.Called(p)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// GetByID records the call and returns the configured stub values.
func (m *AccountRepository) GetByID(_ context.Context, id, budgetID int64) (models.Account, error) {
	args := m.Called(id, budgetID)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// ListByBudget records the call and returns the configured stub values.
func (m *AccountRepository) ListByBudget(_ context.Context, budgetID int64, archived *bool) ([]models.Account, error) {
	args := m.Called(budgetID, archived)
	as, ok := args.Get(0).([]models.Account)
	if !ok {
		return nil, args.Error(1)
	}
	return as, args.Error(1)
}

// Update records the call and returns the configured stub values.
func (m *AccountRepository) Update(_ context.Context, p account.UpdateParams) (models.Account, error) {
	args := m.Called(p)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// Patch records the call and returns the configured stub values.
func (m *AccountRepository) Patch(_ context.Context, p account.PatchParams) (models.Account, error) {
	args := m.Called(p)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// SoftDelete records the call and returns the configured stub error.
func (m *AccountRepository) SoftDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

// HardDelete records the call and returns the configured stub error.
func (m *AccountRepository) HardDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

// ExistsByName records the call and returns the configured stub values.
func (m *AccountRepository) ExistsByName(_ context.Context, budgetID int64, name string, excludeID *int64) (bool, error) {
	args := m.Called(budgetID, name, excludeID)
	return args.Bool(0), args.Error(1)
}

// HasTransactions records the call and returns the configured stub values.
func (m *AccountRepository) HasTransactions(_ context.Context, id, budgetID int64) (bool, error) {
	args := m.Called(id, budgetID)
	return args.Bool(0), args.Error(1)
}

// Balances records the call and returns the configured stub values.
func (m *AccountRepository) Balances(_ context.Context, id, budgetID int64) (balance, clearedBalance money.Amount, err error) {
	args := m.Called(id, budgetID)
	balance, ok := args.Get(0).(money.Amount)
	if !ok {
		return 0, 0, args.Error(2) //nolint:mnd
	}
	clearedBalance, ok = args.Get(1).(money.Amount)
	if !ok {
		return 0, 0, args.Error(2) //nolint:mnd
	}
	return balance, clearedBalance, args.Error(2) //nolint:mnd
}

// MarkReconciled records the call and returns the configured stub values.
func (m *AccountRepository) MarkReconciled(_ context.Context, id, budgetID int64) (models.Account, error) {
	args := m.Called(id, budgetID)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// Archive records the call and returns the configured stub values.
func (m *AccountRepository) Archive(_ context.Context, id, budgetID int64) (models.Account, error) {
	args := m.Called(id, budgetID)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// Unarchive records the call and returns the configured stub values.
func (m *AccountRepository) Unarchive(_ context.Context, id, budgetID int64) (models.Account, error) {
	args := m.Called(id, budgetID)
	a, ok := args.Get(0).(models.Account)
	if !ok {
		return models.Account{}, args.Error(1)
	}
	return a, args.Error(1)
}

// IsArchived records the call and returns the configured stub values.
func (m *AccountRepository) IsArchived(_ context.Context, id, budgetID int64) (bool, error) {
	args := m.Called(id, budgetID)
	return args.Bool(0), args.Error(1)
}

// CreateOpeningTransaction records the call and returns the configured stub error.
func (m *AccountRepository) CreateOpeningTransaction(_ context.Context, budgetID, accountID int64, amount money.Amount) error {
	args := m.Called(budgetID, accountID, amount)
	return args.Error(0)
}

// BalanceHistory records the call and returns the configured stub values.
func (m *AccountRepository) BalanceHistory(
	_ context.Context, budgetID int64, months int,
) ([]db.GetAccountTypeBalanceHistoryRow, error) {
	args := m.Called(budgetID, months)
	rows, ok := args.Get(0).([]db.GetAccountTypeBalanceHistoryRow)
	if !ok {
		return nil, args.Error(1)
	}
	return rows, args.Error(1)
}
