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

	"github.com/moniqohq/moniqo/apps/backend/internal/budget"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// -----------------------------------------------------------------------------
// Service mocks (function-field style, for handler tests)
// -----------------------------------------------------------------------------

// BudgetService is a test double for the budget.Service handler interface.
type BudgetService struct {
	CreateFn     func(ctx context.Context, creatorID int64, req budget.CreateRequest) (models.Budget, error)
	ListFn       func(ctx context.Context, userID int64) ([]models.Budget, error)
	GetByIDFn    func(ctx context.Context, budgetID int64) (models.Budget, error)
	ReplaceFn    func(ctx context.Context, ownerID, budgetID int64, req budget.ReplaceRequest) (models.Budget, error)
	PatchFn      func(ctx context.Context, ownerID, budgetID int64, req budget.PatchRequest) (models.Budget, error)
	SoftDeleteFn func(ctx context.Context, budgetID int64) error
}

// Create delegates to CreateFn.
func (m *BudgetService) Create(ctx context.Context, creatorID int64, req budget.CreateRequest) (models.Budget, error) {
	return m.CreateFn(ctx, creatorID, req)
}

// List delegates to ListFn.
func (m *BudgetService) List(ctx context.Context, userID int64) ([]models.Budget, error) {
	return m.ListFn(ctx, userID)
}

// GetByID delegates to GetByIDFn.
func (m *BudgetService) GetByID(ctx context.Context, budgetID int64) (models.Budget, error) {
	return m.GetByIDFn(ctx, budgetID)
}

// Replace delegates to ReplaceFn.
func (m *BudgetService) Replace(ctx context.Context, ownerID, budgetID int64, req budget.ReplaceRequest) (models.Budget, error) {
	return m.ReplaceFn(ctx, ownerID, budgetID, req)
}

// Patch delegates to PatchFn.
func (m *BudgetService) Patch(ctx context.Context, ownerID, budgetID int64, req budget.PatchRequest) (models.Budget, error) {
	return m.PatchFn(ctx, ownerID, budgetID, req)
}

// SoftDelete delegates to SoftDeleteFn.
func (m *BudgetService) SoftDelete(ctx context.Context, budgetID int64) error {
	return m.SoftDeleteFn(ctx, budgetID)
}

// MembershipService is a test double for the budget.MembershipService handler interface.
type MembershipService struct {
	ListMembersFn       func(ctx context.Context, budgetID int64) ([]models.BudgetUser, error)
	AddMemberFn         func(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error)
	UpdateMemberRoleFn  func(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error)
	RemoveMemberFn      func(ctx context.Context, budgetID, userID int64) error
	TransferOwnershipFn func(ctx context.Context, budgetID, currentOwnerID, targetUserID int64) error
}

// ListMembers delegates to ListMembersFn.
func (m *MembershipService) ListMembers(ctx context.Context, budgetID int64) ([]models.BudgetUser, error) {
	return m.ListMembersFn(ctx, budgetID)
}

// AddMember delegates to AddMemberFn.
func (m *MembershipService) AddMember(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	return m.AddMemberFn(ctx, budgetID, userID, role)
}

// UpdateMemberRole delegates to UpdateMemberRoleFn.
func (m *MembershipService) UpdateMemberRole(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	return m.UpdateMemberRoleFn(ctx, budgetID, userID, role)
}

// RemoveMember delegates to RemoveMemberFn.
func (m *MembershipService) RemoveMember(ctx context.Context, budgetID, userID int64) error {
	return m.RemoveMemberFn(ctx, budgetID, userID)
}

// TransferOwnership delegates to TransferOwnershipFn.
func (m *MembershipService) TransferOwnership(ctx context.Context, budgetID, currentOwnerID, targetUserID int64) error {
	return m.TransferOwnershipFn(ctx, budgetID, currentOwnerID, targetUserID)
}

// -----------------------------------------------------------------------------
// Repository mocks (testify mock style, for service tests)
// -----------------------------------------------------------------------------

// BudgetRepository is a testify mock for budget.BudgetRepository.
type BudgetRepository struct {
	mock.Mock
}

// CreateWithOwner records the call and returns the configured stub values.
func (m *BudgetRepository) CreateWithOwner(_ context.Context, p budget.CreateParams, ownerUserID int64) (models.Budget, error) {
	args := m.Called(p, ownerUserID)
	b, ok := args.Get(0).(models.Budget)
	if !ok {
		return models.Budget{}, args.Error(1)
	}
	return b, args.Error(1)
}

// GetByID records the call and returns the configured stub values.
func (m *BudgetRepository) GetByID(_ context.Context, id int64) (models.Budget, error) {
	args := m.Called(id)
	b, ok := args.Get(0).(models.Budget)
	if !ok {
		return models.Budget{}, args.Error(1)
	}
	return b, args.Error(1)
}

// ListForUser records the call and returns the configured stub values.
func (m *BudgetRepository) ListForUser(_ context.Context, userID int64) ([]models.Budget, error) {
	args := m.Called(userID)
	bs, ok := args.Get(0).([]models.Budget)
	if !ok {
		return nil, args.Error(1)
	}
	return bs, args.Error(1)
}

// Update records the call and returns the configured stub values.
func (m *BudgetRepository) Update(_ context.Context, p budget.UpdateParams) (models.Budget, error) {
	args := m.Called(p)
	b, ok := args.Get(0).(models.Budget)
	if !ok {
		return models.Budget{}, args.Error(1)
	}
	return b, args.Error(1)
}

// Patch records the call and returns the configured stub values.
func (m *BudgetRepository) Patch(_ context.Context, p budget.PatchParams) (models.Budget, error) {
	args := m.Called(p)
	b, ok := args.Get(0).(models.Budget)
	if !ok {
		return models.Budget{}, args.Error(1)
	}
	return b, args.Error(1)
}

// SoftDeleteCascade records the call and returns the configured stub error.
func (m *BudgetRepository) SoftDeleteCascade(_ context.Context, budgetID int64) error {
	args := m.Called(budgetID)
	return args.Error(0)
}

// TitleExistsForUser records the call and returns the configured stub values.
func (m *BudgetRepository) TitleExistsForUser(_ context.Context, userID int64, title string, excludeBudgetID int64) (bool, error) {
	args := m.Called(userID, title, excludeBudgetID)
	return args.Bool(0), args.Error(1)
}

// MembershipRepository is a testify mock for budget.MembershipRepository.
type MembershipRepository struct {
	mock.Mock
}

// CreateMembership records the call and returns the configured stub values.
func (m *MembershipRepository) CreateMembership(_ context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	args := m.Called(budgetID, userID, role)
	bu, ok := args.Get(0).(models.BudgetUser)
	if !ok {
		return models.BudgetUser{}, args.Error(1)
	}
	return bu, args.Error(1)
}

// GetMembership records the call and returns the configured stub values.
func (m *MembershipRepository) GetMembership(_ context.Context, budgetID, userID int64) (models.BudgetUser, error) {
	args := m.Called(budgetID, userID)
	bu, ok := args.Get(0).(models.BudgetUser)
	if !ok {
		return models.BudgetUser{}, args.Error(1)
	}
	return bu, args.Error(1)
}

// ListMembers records the call and returns the configured stub values.
func (m *MembershipRepository) ListMembers(_ context.Context, budgetID int64) ([]models.BudgetUser, error) {
	args := m.Called(budgetID)
	bms, ok := args.Get(0).([]models.BudgetUser)
	if !ok {
		return nil, args.Error(1)
	}
	return bms, args.Error(1)
}

// UpdateRole records the call and returns the configured stub values.
func (m *MembershipRepository) UpdateRole(_ context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	args := m.Called(budgetID, userID, role)
	bu, ok := args.Get(0).(models.BudgetUser)
	if !ok {
		return models.BudgetUser{}, args.Error(1)
	}
	return bu, args.Error(1)
}

// RemoveMembership records the call and returns the configured stub error.
func (m *MembershipRepository) RemoveMembership(_ context.Context, budgetID, userID int64) error {
	args := m.Called(budgetID, userID)
	return args.Error(0)
}

// CountOwners records the call and returns the configured stub values.
func (m *MembershipRepository) CountOwners(_ context.Context, budgetID int64) (int64, error) {
	args := m.Called(budgetID)
	count, ok := args.Get(0).(int64)
	if !ok {
		return 0, args.Error(1)
	}
	return count, args.Error(1)
}

// TransferOwnership records the call and returns the configured stub error.
func (m *MembershipRepository) TransferOwnership(_ context.Context, budgetID, currentOwnerID, targetUserID int64) error {
	args := m.Called(budgetID, currentOwnerID, targetUserID)
	return args.Error(0)
}

// MembershipReader is a testify mock for budget.MembershipReader (used by authz middleware).
type MembershipReader struct {
	mock.Mock
}

// GetMembership records the call and returns the configured stub values.
func (m *MembershipReader) GetMembership(_ context.Context, budgetID, userID int64) (models.BudgetUser, error) {
	args := m.Called(budgetID, userID)
	bu, ok := args.Get(0).(models.BudgetUser)
	if !ok {
		return models.BudgetUser{}, args.Error(1)
	}
	return bu, args.Error(1)
}
