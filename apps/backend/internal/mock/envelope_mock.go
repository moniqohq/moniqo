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
	"time"

	"github.com/stretchr/testify/mock"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/envelope"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// -----------------------------------------------------------------------------
// Service mock (function-field style, for handler tests)
// -----------------------------------------------------------------------------

// EnvelopeService is a test double for the envelope.Service interface.
type EnvelopeService struct {
	CreateFn            func(ctx context.Context, budgetID int64, req envelope.CreateRequest) (models.BudgetEnvelope, error)
	GetByIDFn           func(ctx context.Context, id, budgetID int64) (models.BudgetEnvelope, error)
	ListFn              func(ctx context.Context, budgetID int64, archived *bool) ([]models.BudgetEnvelope, error)
	ReplaceFn           func(ctx context.Context, id, budgetID int64, req envelope.ReplaceRequest) (models.BudgetEnvelope, error)
	PatchFn             func(ctx context.Context, id, budgetID int64, req envelope.PatchRequest) (models.BudgetEnvelope, error)
	DeleteFn            func(ctx context.Context, id, budgetID int64, callerRole models.Role) error
	ForceDeleteFn       func(ctx context.Context, id, budgetID int64, callerRole models.Role) error
	GetBudgetSummaryFn  func(ctx context.Context, budgetID int64) (models.BudgetSummary, error)
	GetDashboardStatsFn func(ctx context.Context, budgetID int64, month time.Time) (models.DashboardStats, error)
}

// Create delegates to CreateFn.
func (m *EnvelopeService) Create(ctx context.Context, budgetID int64, req envelope.CreateRequest) (models.BudgetEnvelope, error) {
	return m.CreateFn(ctx, budgetID, req)
}

// GetByID delegates to GetByIDFn.
func (m *EnvelopeService) GetByID(ctx context.Context, id, budgetID int64) (models.BudgetEnvelope, error) {
	return m.GetByIDFn(ctx, id, budgetID)
}

// List delegates to ListFn.
func (m *EnvelopeService) List(ctx context.Context, budgetID int64, archived *bool) ([]models.BudgetEnvelope, error) {
	return m.ListFn(ctx, budgetID, archived)
}

// Replace delegates to ReplaceFn.
func (m *EnvelopeService) Replace(ctx context.Context, id, budgetID int64, req envelope.ReplaceRequest) (models.BudgetEnvelope, error) {
	return m.ReplaceFn(ctx, id, budgetID, req)
}

// Patch delegates to PatchFn.
func (m *EnvelopeService) Patch(ctx context.Context, id, budgetID int64, req envelope.PatchRequest) (models.BudgetEnvelope, error) {
	return m.PatchFn(ctx, id, budgetID, req)
}

// Delete delegates to DeleteFn.
func (m *EnvelopeService) Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	return m.DeleteFn(ctx, id, budgetID, callerRole)
}

// ForceDelete delegates to ForceDeleteFn.
func (m *EnvelopeService) ForceDelete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	return m.ForceDeleteFn(ctx, id, budgetID, callerRole)
}

// GetBudgetSummary delegates to GetBudgetSummaryFn.
func (m *EnvelopeService) GetBudgetSummary(ctx context.Context, budgetID int64) (models.BudgetSummary, error) {
	return m.GetBudgetSummaryFn(ctx, budgetID)
}

// GetDashboardStats delegates to GetDashboardStatsFn.
func (m *EnvelopeService) GetDashboardStats(ctx context.Context, budgetID int64, month time.Time) (models.DashboardStats, error) {
	if m.GetDashboardStatsFn != nil {
		return m.GetDashboardStatsFn(ctx, budgetID, month)
	}
	return models.DashboardStats{}, nil
}

// -----------------------------------------------------------------------------
// Repository mock (testify mock style, for service tests)
// -----------------------------------------------------------------------------

// EnvelopeRepository is a testify mock for envelope.Repository.
type EnvelopeRepository struct {
	mock.Mock
}

// Create records the call and returns the configured stub values.
func (m *EnvelopeRepository) Create(_ context.Context, p envelope.CreateParams) (models.BudgetEnvelope, error) {
	args := m.Called(p)
	e, ok := args.Get(0).(models.BudgetEnvelope)
	if !ok {
		return models.BudgetEnvelope{}, args.Error(1)
	}
	return e, args.Error(1)
}

// GetByID records the call and returns the configured stub values.
func (m *EnvelopeRepository) GetByID(_ context.Context, id, budgetID int64) (models.BudgetEnvelope, error) {
	args := m.Called(id, budgetID)
	e, ok := args.Get(0).(models.BudgetEnvelope)
	if !ok {
		return models.BudgetEnvelope{}, args.Error(1)
	}
	return e, args.Error(1)
}

// ListByBudget records the call and returns the configured stub values.
func (m *EnvelopeRepository) ListByBudget(_ context.Context, budgetID int64, archived *bool) ([]models.BudgetEnvelope, error) {
	args := m.Called(budgetID, archived)
	es, ok := args.Get(0).([]models.BudgetEnvelope)
	if !ok {
		return nil, args.Error(1)
	}
	return es, args.Error(1)
}

// Update records the call and returns the configured stub values.
func (m *EnvelopeRepository) Update(_ context.Context, p envelope.UpdateParams) (models.BudgetEnvelope, error) {
	args := m.Called(p)
	e, ok := args.Get(0).(models.BudgetEnvelope)
	if !ok {
		return models.BudgetEnvelope{}, args.Error(1)
	}
	return e, args.Error(1)
}

// Patch records the call and returns the configured stub values.
func (m *EnvelopeRepository) Patch(_ context.Context, p envelope.PatchParams) (models.BudgetEnvelope, error) {
	args := m.Called(p)
	e, ok := args.Get(0).(models.BudgetEnvelope)
	if !ok {
		return models.BudgetEnvelope{}, args.Error(1)
	}
	return e, args.Error(1)
}

// SoftDelete records the call and returns the configured stub error.
func (m *EnvelopeRepository) SoftDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

// HardDelete records the call and returns the configured stub error.
func (m *EnvelopeRepository) HardDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

// ForceDelete records the call and returns the configured stub error.
func (m *EnvelopeRepository) ForceDelete(_ context.Context, id, budgetID int64) error {
	args := m.Called(id, budgetID)
	return args.Error(0)
}

// ExistsByTitle records the call and returns the configured stub values.
func (m *EnvelopeRepository) ExistsByTitle(_ context.Context, budgetID int64, title string, excludeID *int64) (bool, error) {
	args := m.Called(budgetID, title, excludeID)
	return args.Bool(0), args.Error(1)
}

// HasTransactions records the call and returns the configured stub values.
func (m *EnvelopeRepository) HasTransactions(_ context.Context, id, budgetID int64) (bool, error) {
	args := m.Called(id, budgetID)
	return args.Bool(0), args.Error(1)
}

// SumSpent records the call and returns the configured stub values.
func (m *EnvelopeRepository) SumSpent(_ context.Context, id, budgetID int64) (money.Amount, error) {
	args := m.Called(id, budgetID)
	a, ok := args.Get(0).(money.Amount)
	if !ok {
		return 0, args.Error(1)
	}
	return a, args.Error(1)
}

// SumOnBudgetBalances records the call and returns the configured stub values.
func (m *EnvelopeRepository) SumOnBudgetBalances(_ context.Context, budgetID int64) (money.Amount, error) {
	args := m.Called(budgetID)
	a, ok := args.Get(0).(money.Amount)
	if !ok {
		return 0, args.Error(1)
	}
	return a, args.Error(1)
}

// GetBudgetSummaryRow records the call and returns the configured stub values.
func (m *EnvelopeRepository) GetBudgetSummaryRow(_ context.Context, budgetID int64) (db.GetBudgetEnvelopeSummaryRow, error) {
	args := m.Called(budgetID)
	r, ok := args.Get(0).(db.GetBudgetEnvelopeSummaryRow)
	if !ok {
		return db.GetBudgetEnvelopeSummaryRow{}, args.Error(1)
	}
	return r, args.Error(1)
}

// GetNetWorth records the call and returns the configured stub values.
func (m *EnvelopeRepository) GetNetWorth(_ context.Context, budgetID int64) (money.Amount, error) {
	args := m.Called(budgetID)
	a, ok := args.Get(0).(money.Amount)
	if !ok {
		return 0, args.Error(1)
	}
	return a, args.Error(1)
}

// GetMonthlyStats records the call and returns the configured stub values.
func (m *EnvelopeRepository) GetMonthlyStats(_ context.Context, budgetID int64, month time.Time) (db.GetMonthlyStatsRow, error) {
	args := m.Called(budgetID, month)
	r, ok := args.Get(0).(db.GetMonthlyStatsRow)
	if !ok {
		return db.GetMonthlyStatsRow{}, args.Error(1)
	}
	return r, args.Error(1)
}

// GetMonthlySparkline records the call and returns the configured stub values.
func (m *EnvelopeRepository) GetMonthlySparkline(_ context.Context, budgetID int64) ([]db.GetMonthlySparklineRow, error) {
	args := m.Called(budgetID)
	r, ok := args.Get(0).([]db.GetMonthlySparklineRow)
	if !ok {
		return nil, args.Error(1)
	}
	return r, args.Error(1)
}
