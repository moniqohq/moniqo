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
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Repository defines the data-access contract for accounts.
//
//nolint:interfacebloat
type Repository interface {
	Create(ctx context.Context, p CreateParams) (models.Account, error)
	GetByID(ctx context.Context, id, budgetID int64) (models.Account, error)
	ListByBudget(ctx context.Context, budgetID int64, archived *bool) ([]models.Account, error)
	Update(ctx context.Context, p UpdateParams) (models.Account, error)
	Patch(ctx context.Context, p PatchParams) (models.Account, error)
	SoftDelete(ctx context.Context, id, budgetID int64) error
	HardDelete(ctx context.Context, id, budgetID int64) error
	ExistsByName(ctx context.Context, budgetID int64, name string, excludeID *int64) (bool, error)
	HasTransactions(ctx context.Context, id, budgetID int64) (bool, error)
	Balances(ctx context.Context, id, budgetID int64) (balance, clearedBalance money.Amount, err error)
	MarkReconciled(ctx context.Context, id, budgetID int64) (models.Account, error)
	Archive(ctx context.Context, id, budgetID int64) (models.Account, error)
	Unarchive(ctx context.Context, id, budgetID int64) (models.Account, error)
	IsArchived(ctx context.Context, id, budgetID int64) (bool, error)
	CreateOpeningTransaction(ctx context.Context, budgetID, accountID int64, amount money.Amount) error
}

// Repo is the sqlc-backed implementation of Repository.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewRepo returns a Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// rowToAccount assembles a models.Account from the common account row fields plus
// pre-computed balances. Balances must be fetched separately — they are never
// stored on the account row itself.
//
//nolint:revive
func rowToAccount(
	id, budgetID int64,
	name string,
	accType db.AccountType,
	requiresRecon, isOnBudget, isImmutable bool,
	notes, accountNumber, institution *string,
	lastReconciledAt, archivedAt, createdAt, updatedAt pgtype.Timestamptz,
	balance, clearedBalance money.Amount,
) models.Account {
	var reconciledAt *time.Time
	if lastReconciledAt.Valid {
		reconciledAt = &lastReconciledAt.Time
	}
	var archived *time.Time
	if archivedAt.Valid {
		archived = &archivedAt.Time
	}
	return models.Account{
		ID:               id,
		BudgetID:         budgetID,
		Name:             name,
		Type:             models.AccountType(accType),
		Balance:          balance,
		ClearedBalance:   clearedBalance,
		RequiresRecon:    requiresRecon,
		IsOnBudget:       isOnBudget,
		IsImmutable:      isImmutable,
		Notes:            notes,
		AccountNumber:    accountNumber,
		Institution:      institution,
		LastReconciledAt: reconciledAt,
		IsArchived:       archived != nil,
		ArchivedAt:       archived,
		CreatedAt:        createdAt.Time,
		UpdatedAt:        updatedAt.Time,
	}
}

// Create inserts a new account and returns it with its (zero) opening balance.
func (r *Repo) Create(ctx context.Context, p CreateParams) (models.Account, error) {
	r.log.Debug("executing CreateAccount query",
		zap.Int64("budget_id", p.BudgetID),
		zap.String("name", p.Name),
		zap.String("type", string(p.Type)),
	)

	q := db.New(r.pool)
	row, err := q.CreateAccount(ctx, db.CreateAccountParams{
		BudgetID:      p.BudgetID,
		Name:          p.Name,
		Type:          db.AccountType(p.Type),
		RequiresRecon: p.RequiresRecon,
		IsOnBudget:    p.IsOnBudget,
		IsImmutable:   p.IsImmutable,
		Notes:         p.Notes,
		AccountNumber: p.AccountNumber,
		Institution:   p.Institution,
	})
	if err != nil {
		r.log.Error("CreateAccount query failed",
			zap.Int64("budget_id", p.BudgetID),
			zap.String("name", p.Name),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("create account: %w", err)
	}

	// Newly created account has no transactions yet; balance is always zero.
	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	r.log.Info("account created",
		zap.Int64("account_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// GetByID returns the account with the given id scoped to budgetID.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (r *Repo) GetByID(ctx context.Context, id, budgetID int64) (models.Account, error) {
	r.log.Debug("executing GetAccountByID query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	row, err := q.GetAccountByID(ctx, db.GetAccountByIDParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Account{}, ErrNotFound
		}
		r.log.Error("GetAccountByID query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("get account by id: %w", err)
	}

	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// ListByBudget returns accounts belonging to budgetID, filtered by archived
// state: nil returns all accounts, true returns only archived accounts, false
// returns only active accounts. Returns an empty slice (never nil) when the
// budget has no matching accounts.
func (r *Repo) ListByBudget(ctx context.Context, budgetID int64, archived *bool) ([]models.Account, error) {
	r.log.Debug("executing ListAccountsByBudget query", zap.Int64("budget_id", budgetID))

	q := db.New(r.pool)
	rows, err := q.ListAccountsByBudget(ctx, db.ListAccountsByBudgetParams{
		BudgetID: budgetID,
		Archived: archived,
	})
	if err != nil {
		r.log.Error("ListAccountsByBudget query failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("list accounts by budget: %w", err)
	}

	out := make([]models.Account, 0, len(rows))
	for _, row := range rows {
		balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
		if err != nil {
			return nil, err
		}
		out = append(out, rowToAccount(
			row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
			row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
		))
	}
	return out, nil
}

// Update performs a full replacement of all mutable account fields.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (r *Repo) Update(ctx context.Context, p UpdateParams) (models.Account, error) {
	r.log.Debug("executing UpdateAccount query",
		zap.Int64("account_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	q := db.New(r.pool)
	row, err := q.UpdateAccount(ctx, db.UpdateAccountParams{
		ID:            p.ID,
		BudgetID:      p.BudgetID,
		Name:          p.Name,
		Type:          db.AccountType(p.Type),
		RequiresRecon: p.RequiresRecon,
		IsOnBudget:    p.IsOnBudget,
		IsImmutable:   p.IsImmutable,
		Notes:         p.Notes,
		AccountNumber: p.AccountNumber,
		Institution:   p.Institution,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Account{}, ErrNotFound
		}
		r.log.Error("UpdateAccount query failed",
			zap.Int64("account_id", p.ID),
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("update account: %w", err)
	}

	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	r.log.Info("account updated",
		zap.Int64("account_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// Patch applies only the non-nil fields from p to the account row.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (r *Repo) Patch(ctx context.Context, p PatchParams) (models.Account, error) {
	r.log.Debug("executing PatchAccount query",
		zap.Int64("account_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	// Convert *models.AccountType to *db.AccountType for the sqlc param.
	var dbType *db.AccountType
	if p.Type != nil {
		t := db.AccountType(*p.Type)
		dbType = &t
	}

	q := db.New(r.pool)
	row, err := q.PatchAccount(ctx, db.PatchAccountParams{
		ID:            p.ID,
		BudgetID:      p.BudgetID,
		Name:          p.Name,
		Type:          dbType,
		RequiresRecon: p.RequiresRecon,
		IsOnBudget:    p.IsOnBudget,
		IsImmutable:   p.IsImmutable,
		Notes:         p.Notes,
		AccountNumber: p.AccountNumber,
		Institution:   p.Institution,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Account{}, ErrNotFound
		}
		r.log.Error("PatchAccount query failed",
			zap.Int64("account_id", p.ID),
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("patch account: %w", err)
	}

	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	r.log.Info("account patched",
		zap.Int64("account_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// SoftDelete marks the account as deleted. Idempotent: re-deleting an already
// soft-deleted account silently no-ops (the WHERE clause skips rows where
// deleted_at IS NOT NULL).
func (r *Repo) SoftDelete(ctx context.Context, id, budgetID int64) error {
	r.log.Debug("executing SoftDeleteAccount query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	if err := q.SoftDeleteAccount(ctx, db.SoftDeleteAccountParams{
		ID:       id,
		BudgetID: budgetID,
	}); err != nil {
		r.log.Error("SoftDeleteAccount query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("soft delete account: %w", err)
	}

	r.log.Info("account soft-deleted",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

// HardDelete physically removes the account row.
func (r *Repo) HardDelete(ctx context.Context, id, budgetID int64) error {
	r.log.Debug("executing HardDeleteAccount query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	if err := q.HardDeleteAccount(ctx, db.HardDeleteAccountParams{
		ID:       id,
		BudgetID: budgetID,
	}); err != nil {
		r.log.Error("HardDeleteAccount query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("hard delete account: %w", err)
	}

	r.log.Info("account hard-deleted",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

// ExistsByName reports whether a live account with the given name already
// exists within budgetID. When excludeID is non-nil the account with that id
// is excluded from the check (useful for PUT/PATCH where the existing name
// should not be treated as a conflict with itself).
func (r *Repo) ExistsByName(ctx context.Context, budgetID int64, name string, excludeID *int64) (bool, error) {
	r.log.Debug("executing ExistsByName check",
		zap.Int64("budget_id", budgetID),
		zap.String("name", name),
	)

	q := db.New(r.pool)
	if excludeID == nil {
		exists, err := q.AccountExistsByName(ctx, db.AccountExistsByNameParams{
			BudgetID: budgetID,
			Lower:    name,
		})
		if err != nil {
			return false, fmt.Errorf("account exists by name: %w", err)
		}
		return exists, nil
	}

	exists, err := q.AccountExistsByNameExcluding(ctx, db.AccountExistsByNameExcludingParams{
		BudgetID: budgetID,
		Lower:    name,
		ID:       *excludeID,
	})
	if err != nil {
		return false, fmt.Errorf("account exists by name excluding: %w", err)
	}
	return exists, nil
}

// HasTransactions reports whether the account has any active (non-deleted) transactions.
func (r *Repo) HasTransactions(ctx context.Context, id, budgetID int64) (bool, error) {
	r.log.Debug("executing AccountHasTransactions query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	has, err := q.AccountHasTransactions(ctx, db.AccountHasTransactionsParams{
		AccountID: id,
		BudgetID:  budgetID,
	})
	if err != nil {
		r.log.Error("AccountHasTransactions query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return false, fmt.Errorf("account has transactions: %w", err)
	}
	return has, nil
}

// Balances returns the current and cleared balances of the account, computed
// as the sum of all (resp. cleared/reconciled) active transaction amounts
// (stored in minor units / cents).
func (r *Repo) Balances(ctx context.Context, id, budgetID int64) (balance, clearedBalance money.Amount, err error) {
	r.log.Debug("executing GetAccountBalances query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	row, err := q.GetAccountBalances(ctx, db.GetAccountBalancesParams{
		AccountID: id,
		BudgetID:  budgetID,
	})
	if err != nil {
		r.log.Error("GetAccountBalances query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return 0, 0, fmt.Errorf("get account balances: %w", err)
	}
	return money.FromMinorUnits(row.Balance), money.FromMinorUnits(row.ClearedBalance), nil
}

// MarkReconciled flips all cleared transactions on the account to reconciled
// and stamps the account's last_reconciled_at, returning the refreshed account.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (r *Repo) MarkReconciled(ctx context.Context, id, budgetID int64) (models.Account, error) {
	r.log.Debug("executing MarkAccountReconciled query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	if err := q.MarkAccountTransactionsReconciled(ctx, db.MarkAccountTransactionsReconciledParams{
		AccountID: id,
		BudgetID:  budgetID,
	}); err != nil {
		r.log.Error("MarkAccountTransactionsReconciled query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("mark transactions reconciled: %w", err)
	}

	row, err := q.MarkAccountReconciled(ctx, db.MarkAccountReconciledParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Account{}, ErrNotFound
		}
		r.log.Error("MarkAccountReconciled query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("mark account reconciled: %w", err)
	}

	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	r.log.Info("account reconciled",
		zap.Int64("account_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// Archive stamps archived_at on the account, returning the refreshed account.
// Returns ErrNotFound if the account does not exist, is soft-deleted, or is
// already archived (callers should check IsArchived first for idempotency).
func (r *Repo) Archive(ctx context.Context, id, budgetID int64) (models.Account, error) {
	r.log.Debug("executing ArchiveAccount query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	row, err := q.ArchiveAccount(ctx, db.ArchiveAccountParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Account{}, ErrNotFound
		}
		r.log.Error("ArchiveAccount query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("archive account: %w", err)
	}

	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	r.log.Info("account archived",
		zap.Int64("account_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// Unarchive clears archived_at on the account, returning the refreshed account.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (r *Repo) Unarchive(ctx context.Context, id, budgetID int64) (models.Account, error) {
	r.log.Debug("executing UnarchiveAccount query",
		zap.Int64("account_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.pool)
	row, err := q.UnarchiveAccount(ctx, db.UnarchiveAccountParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Account{}, ErrNotFound
		}
		r.log.Error("UnarchiveAccount query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Account{}, fmt.Errorf("unarchive account: %w", err)
	}

	balance, clearedBalance, err := r.Balances(ctx, row.ID, row.BudgetID)
	if err != nil {
		return models.Account{}, err
	}

	r.log.Info("account unarchived",
		zap.Int64("account_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToAccount(
		row.ID, row.BudgetID, row.Name, row.Type, row.RequiresRecon, row.IsOnBudget, row.IsImmutable, row.Notes,
		row.AccountNumber, row.Institution, row.LastReconciledAt, row.ArchivedAt, row.CreatedAt, row.UpdatedAt, balance, clearedBalance,
	), nil
}

// IsArchived reports whether the account is currently archived.
// Returns ErrNotFound if the account does not exist or is soft-deleted.
func (r *Repo) IsArchived(ctx context.Context, id, budgetID int64) (bool, error) {
	q := db.New(r.pool)
	archived, err := q.IsAccountArchived(ctx, db.IsAccountArchivedParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, ErrNotFound
		}
		r.log.Error("IsAccountArchived query failed",
			zap.Int64("account_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return false, fmt.Errorf("is account archived: %w", err)
	}
	return archived, nil
}

// CreateOpeningTransaction inserts the initial balance transaction for a newly
// created account. A nil memo is used so that the record is identifiable as
// an auto-generated opening entry rather than a user-supplied transaction.
func (r *Repo) CreateOpeningTransaction(ctx context.Context, budgetID, accountID int64, amount money.Amount) error {
	r.log.Debug("executing CreateTransaction (opening balance)",
		zap.Int64("budget_id", budgetID),
		zap.Int64("account_id", accountID),
		zap.Int64("amount", amount.Int64()),
	)

	q := db.New(r.pool)
	_, err := q.CreateTransaction(ctx, db.CreateTransactionParams{
		BudgetID:  budgetID,
		AccountID: accountID,
		Amount:    amount.Int64(),
		Memo:      nil,
	})
	if err != nil {
		r.log.Error("CreateTransaction (opening balance) failed",
			zap.Int64("budget_id", budgetID),
			zap.Int64("account_id", accountID),
			zap.Error(err),
		)
		return fmt.Errorf("create opening transaction: %w", err)
	}

	r.log.Info("opening transaction created",
		zap.Int64("budget_id", budgetID),
		zap.Int64("account_id", accountID),
		zap.Int64("amount", amount.Int64()),
	)
	return nil
}
