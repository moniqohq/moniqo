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

package budget

import (
	"context"
	"errors"
	"fmt"

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// MembershipRepository is the persistence contract required by MembershipSvc.
type MembershipRepository interface {
	CreateMembership(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error)
	GetMembership(ctx context.Context, budgetID, userID int64) (models.BudgetUser, error)
	ListMembers(ctx context.Context, budgetID int64) ([]models.BudgetUser, error)
	UpdateRole(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error)
	RemoveMembership(ctx context.Context, budgetID, userID int64) error
	CountOwners(ctx context.Context, budgetID int64) (int64, error)
	TransferOwnership(ctx context.Context, budgetID, currentOwnerID, targetUserID int64) error
}

// MembershipSvc implements business logic for budget membership operations.
type MembershipSvc struct {
	repo MembershipRepository
	log  *zap.Logger
}

// NewMembershipSvc returns a MembershipSvc wired to the given repository.
func NewMembershipSvc(repo MembershipRepository, log *zap.Logger) *MembershipSvc {
	return &MembershipSvc{repo: repo, log: log}
}

// ListMembers returns all active members of the budget.
func (s *MembershipSvc) ListMembers(ctx context.Context, budgetID int64) ([]models.BudgetUser, error) {
	members, err := s.repo.ListMembers(ctx, budgetID)
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	if members == nil {
		members = []models.BudgetUser{}
	}
	return members, nil
}

// AddMember adds a user to the budget with the given role. The OWNER role cannot
// be assigned via this path — use TransferOwnership instead.
func (s *MembershipSvc) AddMember(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	s.log.Info("adding member", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID), zap.String("role", string(role)))

	if role == models.RoleOwner {
		return models.BudgetUser{}, ErrCannotAssignOwner
	}

	m, err := s.repo.CreateMembership(ctx, budgetID, userID, role)
	if err != nil {
		if errors.Is(err, ErrAlreadyMember) {
			return models.BudgetUser{}, ErrAlreadyMember
		}
		return models.BudgetUser{}, fmt.Errorf("add member: %w", err)
	}
	return m, nil
}

// UpdateMemberRole changes a member's role. Prevents downgrading the last OWNER
// and prevents direct promotion to OWNER (use TransferOwnership instead).
func (s *MembershipSvc) UpdateMemberRole(ctx context.Context, budgetID, userID int64, role models.Role) (models.BudgetUser, error) {
	s.log.Info("updating member role", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID))

	if role == models.RoleOwner {
		return models.BudgetUser{}, ErrCannotAssignOwner
	}

	existing, err := s.repo.GetMembership(ctx, budgetID, userID)
	if err != nil {
		return models.BudgetUser{}, membershipOrWrap(err, "get membership")
	}

	if existing.Role == models.RoleOwner {
		if err := s.guardLastOwner(ctx, budgetID); err != nil {
			return models.BudgetUser{}, err
		}
	}

	m, err := s.repo.UpdateRole(ctx, budgetID, userID, role)
	if err != nil {
		return models.BudgetUser{}, fmt.Errorf("update member role: %w", err)
	}
	return m, nil
}

// RemoveMember soft-deletes the membership. Prevents removing the last OWNER.
// Idempotent — removing an already-removed member returns success.
func (s *MembershipSvc) RemoveMember(ctx context.Context, budgetID, userID int64) error {
	s.log.Info("removing member", zap.Int64("budget_id", budgetID), zap.Int64("user_id", userID))

	existing, err := s.repo.GetMembership(ctx, budgetID, userID)
	if err != nil {
		if errors.Is(err, ErrMembershipNotFound) {
			return nil // idempotent
		}
		return fmt.Errorf("get membership: %w", err)
	}

	if existing.Role == models.RoleOwner {
		if err := s.guardLastOwner(ctx, budgetID); err != nil {
			return err
		}
	}

	if err := s.repo.RemoveMembership(ctx, budgetID, userID); err != nil {
		return fmt.Errorf("remove member: %w", err)
	}
	return nil
}

// TransferOwnership atomically promotes targetUserID to OWNER and demotes
// currentOwnerID to ADMIN. Both must be active members of the same budget.
func (s *MembershipSvc) TransferOwnership(ctx context.Context, budgetID, currentOwnerID, targetUserID int64) error {
	s.log.Info(
		"transferring ownership",
		zap.Int64("budget_id", budgetID),
		zap.Int64("current_owner", currentOwnerID),
		zap.Int64("target_user", targetUserID),
	)

	if currentOwnerID == targetUserID {
		return ErrSelfTransfer
	}

	_, err := s.repo.GetMembership(ctx, budgetID, targetUserID)
	if err != nil {
		if errors.Is(err, ErrMembershipNotFound) {
			return ErrNotMember
		}
		return fmt.Errorf("get target membership: %w", err)
	}

	if err := s.repo.TransferOwnership(ctx, budgetID, currentOwnerID, targetUserID); err != nil {
		if errors.Is(err, ErrMembershipNotFound) {
			return ErrNotMember
		}
		return fmt.Errorf("transfer ownership: %w", err)
	}
	return nil
}

func (s *MembershipSvc) guardLastOwner(ctx context.Context, budgetID int64) error {
	count, err := s.repo.CountOwners(ctx, budgetID)
	if err != nil {
		return fmt.Errorf("count owners: %w", err)
	}
	if count <= 1 {
		return ErrLastOwner
	}
	return nil
}

// membershipOrWrap returns ErrMembershipNotFound as-is, or wraps other errors.
func membershipOrWrap(err error, op string) error {
	if errors.Is(err, ErrMembershipNotFound) {
		return ErrMembershipNotFound
	}
	return fmt.Errorf("%s: %w", op, err)
}
