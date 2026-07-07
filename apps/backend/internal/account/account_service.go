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

package account

import (
	"context"
	"errors"
	"fmt"

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// ErrForbidden is returned when the caller's role is insufficient to perform
// the requested operation (e.g. only OWNER/ADMIN may delete an account).
var ErrForbidden = errors.New("insufficient role")

// Service is the business-logic contract for accounts.
type Service interface {
	Create(ctx context.Context, budgetID int64, req CreateRequest) (models.Account, error)
	GetByID(ctx context.Context, id, budgetID int64) (models.Account, error)
	List(ctx context.Context, budgetID int64, archived *bool) ([]models.Account, error)
	Replace(ctx context.Context, id, budgetID int64, req ReplaceRequest) (models.Account, error)
	Patch(ctx context.Context, id, budgetID int64, req PatchRequest, callerRole models.Role) (models.Account, error)
	Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error
	Reconcile(ctx context.Context, id, budgetID int64) (models.Account, error)
	Archive(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error)
	Unarchive(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error)
}

// Svc is the concrete implementation of Service.
type Svc struct {
	repo Repository
	log  *zap.Logger
}

// NewSvc returns a Svc wired to the given repository.
func NewSvc(repo Repository, log *zap.Logger) *Svc {
	return &Svc{repo: repo, log: log}
}

// isOnBudgetDefault returns the canonical is_on_budget default for the given
// account type: false for liability types (CREDIT_CARD, LOAN), true for all others.
func isOnBudgetDefault(t models.AccountType) bool {
	return !t.IsLiability()
}

// Create inserts a new account into budgetID. Input is assumed pre-validated by
// the handler. Name uniqueness is enforced within the budget. If an initial
// balance is provided it is recorded as an opening transaction and the returned
// account reflects the resulting balance.
//
//nolint:revive,funlen
func (s *Svc) Create(ctx context.Context, budgetID int64, req CreateRequest) (models.Account, error) {
	s.log.Debug("creating account", zap.Int64("budget_id", budgetID), zap.String("name", req.Name))

	// Apply is_on_budget default based on account type when not explicitly set.
	isOnBudget := isOnBudgetDefault(req.Type)
	if req.IsOnBudget != nil {
		isOnBudget = *req.IsOnBudget
	}

	// Enforce name uniqueness within the budget.
	exists, err := s.repo.ExistsByName(ctx, budgetID, req.Name, nil)
	if err != nil {
		s.log.Error("ExistsByName failed during Create",
			zap.Int64("budget_id", budgetID),
			zap.String("name", req.Name),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("check account name: %w", err)
	}
	if exists {
		return models.Account{}, ErrConflict
	}

	p := CreateParams{
		BudgetID:      budgetID,
		Name:          req.Name,
		Type:          req.Type,
		RequiresRecon: req.RequiresRecon,
		IsOnBudget:    isOnBudget,
		IsImmutable:   req.IsImmutable,
		Notes:         req.Notes,
	}
	account, err := s.repo.Create(ctx, p)
	if err != nil {
		s.log.Error("repo.Create failed",
			zap.Int64("budget_id", budgetID),
			zap.String("name", req.Name),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("create account: %w", err)
	}

	// Record an opening transaction if an initial balance was provided.
	if req.InitialBalance.Int64() > 0 {
		if err := s.repo.CreateOpeningTransaction(ctx, budgetID, account.ID, req.InitialBalance); err != nil {
			s.log.Error("CreateOpeningTransaction failed",
				zap.Int64("budget_id", budgetID),
				zap.Int64("account_id", account.ID),
				zap.Error(err),
			)
			return models.Account{}, fmt.Errorf("create opening transaction: %w", err)
		}

		balance, clearedBalance, err := s.repo.Balances(ctx, account.ID, budgetID)
		if err != nil {
			s.log.Error("Balances failed after opening transaction",
				zap.Int64("budget_id", budgetID),
				zap.Int64("account_id", account.ID),
				zap.Error(err),
			)
			return models.Account{}, fmt.Errorf("get balances after opening transaction: %w", err)
		}
		account.Balance = balance
		account.ClearedBalance = clearedBalance
	}

	s.log.Info("account created",
		zap.Int64("account_id", account.ID),
		zap.Int64("budget_id", budgetID),
	)
	return account, nil
}

// GetByID returns the account identified by id within budgetID, including its
// computed balance. Returns ErrNotFound if no such active account exists.
func (s *Svc) GetByID(ctx context.Context, id, budgetID int64) (models.Account, error) {
	s.log.Debug("fetching account by id",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	account, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Account{}, err //nolint:wrapcheck
	}

	return account, nil
}

// List returns accounts within budgetID with their computed balances, filtered
// by archived state: nil returns all accounts, true returns only archived
// accounts, false returns only active accounts. Returns an empty (non-nil)
// slice when the budget has no matching accounts.
func (s *Svc) List(ctx context.Context, budgetID int64, archived *bool) ([]models.Account, error) {
	s.log.Debug("listing accounts", zap.Int64("budget_id", budgetID))

	accounts, err := s.repo.ListByBudget(ctx, budgetID, archived)
	if err != nil {
		s.log.Error("repo.ListByBudget failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("list accounts: %w", err)
	}

	// Ensure callers always receive a slice, never nil.
	if accounts == nil {
		accounts = []models.Account{}
	}

	for i, a := range accounts {
		balance, clearedBalance, err := s.repo.Balances(ctx, a.ID, budgetID)
		if err != nil {
			s.log.Error("Balances failed during List",
				zap.Int64("account_id", a.ID),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return nil, fmt.Errorf("get balances for account %d: %w", a.ID, err)
		}
		accounts[i].Balance = balance
		accounts[i].ClearedBalance = clearedBalance
	}

	return accounts, nil
}

// Replace fully replaces all mutable fields of the account identified by id
// within budgetID. Returns ErrNotFound if the account does not exist, and
// ErrConflict if the new name is already taken by another account in the budget.
//
//nolint:revive,funlen
func (s *Svc) Replace(ctx context.Context, id, budgetID int64, req ReplaceRequest) (models.Account, error) {
	s.log.Debug("replacing account",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	// Verify the account exists.
	if _, err := s.repo.GetByID(ctx, id, budgetID); err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Replace",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Account{}, err //nolint:wrapcheck
	}

	// Apply is_on_budget default when not explicitly set.
	isOnBudget := isOnBudgetDefault(req.Type)
	if req.IsOnBudget != nil {
		isOnBudget = *req.IsOnBudget
	}

	// Enforce name uniqueness, excluding the account being replaced.
	exists, err := s.repo.ExistsByName(ctx, budgetID, req.Name, &id)
	if err != nil {
		s.log.Error("ExistsByName failed during Replace",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.String("name", req.Name),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("check account name: %w", err)
	}
	if exists {
		return models.Account{}, ErrConflict
	}

	p := UpdateParams{
		ID:            id,
		BudgetID:      budgetID,
		Name:          req.Name,
		Type:          req.Type,
		RequiresRecon: req.RequiresRecon,
		IsOnBudget:    isOnBudget,
		IsImmutable:   req.IsImmutable,
		Notes:         req.Notes,
	}
	account, err := s.repo.Update(ctx, p)
	if err != nil {
		s.log.Error("repo.Update failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("update account: %w", err)
	}

	balance, clearedBalance, err := s.repo.Balances(ctx, account.ID, budgetID)
	if err != nil {
		s.log.Error("Balances failed during Replace",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("get balances: %w", err)
	}
	account.Balance = balance
	account.ClearedBalance = clearedBalance

	s.log.Info("account replaced",
		zap.Int64("account_id", account.ID),
		zap.Int64("budget_id", budgetID),
	)
	return account, nil
}

// Patch applies only the non-nil fields from req to the account identified by
// id within budgetID. Returns ErrNotFound if the account does not exist, and
// ErrConflict if the new name is already taken by another account in the budget.
// If req.Archived is set, the change is delegated to Archive/Unarchive so the
// OWNER/ADMIN gate and zero-balance rule are enforced consistently.
//
//nolint:revive,funlen
func (s *Svc) Patch(ctx context.Context, id, budgetID int64, req PatchRequest, callerRole models.Role) (models.Account, error) {
	s.log.Debug("patching account",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	if req.Archived != nil {
		if *req.Archived {
			return s.Archive(ctx, id, budgetID, callerRole)
		}
		return s.Unarchive(ctx, id, budgetID, callerRole)
	}

	// Verify the account exists.
	if _, err := s.repo.GetByID(ctx, id, budgetID); err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Patch",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Account{}, err //nolint:wrapcheck
	}

	// If the name is being changed, enforce uniqueness excluding self.
	if req.Name != nil {
		exists, err := s.repo.ExistsByName(ctx, budgetID, *req.Name, &id)
		if err != nil {
			s.log.Error("ExistsByName failed during Patch",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.String("name", *req.Name),
				zap.Error(err),
			)
			return models.Account{}, fmt.Errorf("check account name: %w", err)
		}
		if exists {
			return models.Account{}, ErrConflict
		}
	}

	p := PatchParams{
		ID:            id,
		BudgetID:      budgetID,
		Name:          req.Name,
		Type:          req.Type,
		RequiresRecon: req.RequiresRecon,
		IsOnBudget:    req.IsOnBudget,
		IsImmutable:   req.IsImmutable,
		Notes:         req.Notes,
	}
	account, err := s.repo.Patch(ctx, p)
	if err != nil {
		s.log.Error("repo.Patch failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("patch account: %w", err)
	}

	balance, clearedBalance, err := s.repo.Balances(ctx, account.ID, budgetID)
	if err != nil {
		s.log.Error("Balances failed during Patch",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("get balances: %w", err)
	}
	account.Balance = balance
	account.ClearedBalance = clearedBalance

	s.log.Info("account patched",
		zap.Int64("account_id", account.ID),
		zap.Int64("budget_id", budgetID),
	)
	return account, nil
}

// Delete removes the account identified by id within budgetID. The operation is
// idempotent: attempting to delete a non-existent account is treated as success.
// If the account has any transactions it is soft-deleted; otherwise it is
// permanently hard-deleted. Only OWNER or ADMIN callers may delete accounts.
//
//nolint:revive
func (s *Svc) Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	// Enforce minimum privilege level.
	if callerRole != models.RoleOwner && callerRole != models.RoleAdmin {
		return ErrForbidden
	}

	// Idempotent: a missing account is not an error.
	if _, err := s.repo.GetByID(ctx, id, budgetID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil
		}
		s.log.Error("repo.GetByID failed during Delete",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("get account: %w", err)
	}

	hasTxns, err := s.repo.HasTransactions(ctx, id, budgetID)
	if err != nil {
		s.log.Error("HasTransactions failed during Delete",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("check account transactions: %w", err)
	}

	if hasTxns {
		if err := s.repo.SoftDelete(ctx, id, budgetID); err != nil {
			s.log.Error("repo.SoftDelete failed",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return fmt.Errorf("soft delete account: %w", err)
		}
	} else {
		if err := s.repo.HardDelete(ctx, id, budgetID); err != nil {
			s.log.Error("repo.HardDelete failed",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return fmt.Errorf("hard delete account: %w", err)
		}
	}

	s.log.Info("account deleted",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
		zap.Bool("soft_delete", hasTxns),
	)
	return nil
}

// Reconcile marks all cleared transactions on the account as reconciled and
// stamps last_reconciled_at, returning the refreshed account.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (s *Svc) Reconcile(ctx context.Context, id, budgetID int64) (models.Account, error) {
	s.log.Debug("reconciling account",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	account, err := s.repo.MarkReconciled(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.MarkReconciled failed",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Account{}, err //nolint:wrapcheck
	}

	s.log.Info("account reconciled",
		zap.Int64("account_id", account.ID),
		zap.Int64("budget_id", budgetID),
	)
	return account, nil
}

// Archive marks the account identified by id within budgetID as archived,
// making it read-only and hiding it from active selection while preserving
// its transaction history. Only OWNER or ADMIN callers may archive accounts.
// The operation is idempotent: archiving an already-archived account returns
// it unchanged. The account's balance must be zero before it can be archived.
//
//nolint:revive
func (s *Svc) Archive(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error) {
	if callerRole != models.RoleOwner && callerRole != models.RoleAdmin {
		return models.Account{}, ErrForbidden
	}

	account, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Archive",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Account{}, err //nolint:wrapcheck
	}

	// Idempotent: archiving an already-archived account is a no-op success.
	if account.IsArchived {
		return account, nil
	}

	if account.Balance.Int64() != 0 {
		return models.Account{}, ErrArchiveNonZeroBalance
	}

	archived, err := s.repo.Archive(ctx, id, budgetID)
	if err != nil {
		s.log.Error("repo.Archive failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, err //nolint:wrapcheck
	}

	s.log.Info("account archived",
		zap.Int64("account_id", archived.ID),
		zap.Int64("budget_id", budgetID),
	)
	return archived, nil
}

// Unarchive clears the archived state of the account identified by id within
// budgetID, restoring it to active use. Only OWNER or ADMIN callers may
// unarchive accounts. The operation is idempotent: unarchiving an already
// active account returns it unchanged.
func (s *Svc) Unarchive(ctx context.Context, id, budgetID int64, callerRole models.Role) (models.Account, error) {
	if callerRole != models.RoleOwner && callerRole != models.RoleAdmin {
		return models.Account{}, ErrForbidden
	}

	account, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Unarchive",
				zap.Int64("account_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Account{}, err //nolint:wrapcheck
	}

	// Idempotent: unarchiving an already-active account is a no-op success.
	if !account.IsArchived {
		return account, nil
	}

	unarchived, err := s.repo.Unarchive(ctx, id, budgetID)
	if err != nil {
		s.log.Error("repo.Unarchive failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, err //nolint:wrapcheck
	}

	s.log.Info("account unarchived",
		zap.Int64("account_id", unarchived.ID),
		zap.Int64("budget_id", budgetID),
	)
	return unarchived, nil
}
