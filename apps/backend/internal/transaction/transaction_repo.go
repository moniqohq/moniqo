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

package transaction

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Repository defines the data-access contract for transactions.
//
//nolint:interfacebloat
type Repository interface {
	Create(ctx context.Context, p CreateParams) (models.Transaction, error)
	GetByID(ctx context.Context, id, budgetID int64) (models.Transaction, error)
	List(ctx context.Context, budgetID int64, f ListFilters) ([]models.Transaction, error)
	Count(ctx context.Context, budgetID int64, f ListFilters) (int, error)
	Update(ctx context.Context, p UpdateParams) (models.Transaction, error)
	Patch(ctx context.Context, p PatchParams) (models.Transaction, error)
	SoftDelete(ctx context.Context, id, budgetID int64) error
	GetByGroupID(ctx context.Context, groupID string, budgetID int64) ([]models.Transaction, error)
	SoftDeleteByGroupID(ctx context.Context, groupID string, budgetID int64) error
	WithTx(tx pgx.Tx) Repository
}

// Repo is the sqlc-backed implementation of Repository.
type Repo struct {
	pool *pgxpool.Pool
	conn db.DBTX
	log  *zap.Logger
}

// NewRepo returns a Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, conn: pool, log: log}
}

// WithTx returns a Repo that executes queries within tx instead of the pool.
//
//nolint:ireturn
func (r *Repo) WithTx(tx pgx.Tx) Repository {
	return &Repo{pool: r.pool, conn: tx, log: r.log}
}

// toModel converts a db transaction row into a models.Transaction.
//
//nolint:revive
func toModel(
	id, budgetID, accountID int64,
	envelopeID, transferAccountID *int64,
	groupID pgtype.UUID,
	amount int64,
	date, createdAt pgtype.Timestamptz,
	status db.TransactionStatus,
	memo *string,
) models.Transaction {
	var gidPtr *string
	if groupID.Valid {
		s := groupID.Bytes
		u := uuid.UUID(s)
		str := u.String()
		gidPtr = &str
	}
	return models.Transaction{
		ID:                id,
		BudgetID:          budgetID,
		AccountID:         accountID,
		TransferAccountID: transferAccountID,
		EnvelopeID:        envelopeID,
		TransferGroupID:   gidPtr,
		Amount:            money.FromMinorUnits(amount),
		Date:              date.Time,
		Status:            models.TransactionStatus(status),
		Memo:              memo,
		CreatedAt:         createdAt.Time,
	}
}

// rowToModel converts a db.CreateFullTransactionRow to models.Transaction.
func rowToModel(row db.CreateFullTransactionRow) models.Transaction {
	return toModel(
		row.ID, row.BudgetID, row.AccountID,
		row.EnvelopeID, row.TransferAccountID,
		row.TransferGroupID,
		row.Amount, row.Date, row.CreatedAt, row.Status, row.Memo,
	)
}

// getRowToModel converts a db.GetTransactionByIDRow to models.Transaction.
func getRowToModel(row db.GetTransactionByIDRow) models.Transaction {
	return toModel(
		row.ID, row.BudgetID, row.AccountID,
		row.EnvelopeID, row.TransferAccountID,
		row.TransferGroupID,
		row.Amount, row.Date, row.CreatedAt, row.Status, row.Memo,
	)
}

// listRowToModel converts a db.ListTransactionsRow to models.Transaction.
func listRowToModel(row db.ListTransactionsRow) models.Transaction {
	return toModel(
		row.ID, row.BudgetID, row.AccountID,
		row.EnvelopeID, row.TransferAccountID,
		row.TransferGroupID,
		row.Amount, row.Date, row.CreatedAt, row.Status, row.Memo,
	)
}

// updateRowToModel converts a db.UpdateTransactionRow to models.Transaction.
func updateRowToModel(row db.UpdateTransactionRow) models.Transaction {
	return toModel(
		row.ID, row.BudgetID, row.AccountID,
		row.EnvelopeID, row.TransferAccountID,
		row.TransferGroupID,
		row.Amount, row.Date, row.CreatedAt, row.Status, row.Memo,
	)
}

// patchRowToModel converts a db.PatchTransactionRow to models.Transaction.
func patchRowToModel(row db.PatchTransactionRow) models.Transaction {
	return toModel(
		row.ID, row.BudgetID, row.AccountID,
		row.EnvelopeID, row.TransferAccountID,
		row.TransferGroupID,
		row.Amount, row.Date, row.CreatedAt, row.Status, row.Memo,
	)
}

// groupRowToModel converts a db.GetTransactionsByGroupIDRow to models.Transaction.
func groupRowToModel(row db.GetTransactionsByGroupIDRow) models.Transaction {
	return toModel(
		row.ID, row.BudgetID, row.AccountID,
		row.EnvelopeID, row.TransferAccountID,
		row.TransferGroupID,
		row.Amount, row.Date, row.CreatedAt, row.Status, row.Memo,
	)
}

// uuidFromString converts a UUID string to pgtype.UUID.
func uuidFromString(s string) (pgtype.UUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, fmt.Errorf("parse uuid: %w", err)
	}
	return pgtype.UUID{Bytes: u, Valid: true}, nil
}

// timeToPg converts a *time.Time to pgtype.Timestamptz (invalid/null if nil).
func timeToPg(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

// timeValToPg converts a time.Time to pgtype.Timestamptz.
func timeValToPg(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

// Create inserts a new transaction row and returns the result.
func (r *Repo) Create(ctx context.Context, p CreateParams) (models.Transaction, error) {
	r.log.Debug("executing CreateFullTransaction query",
		zap.Int64("budget_id", p.BudgetID),
		zap.Int64("account_id", p.AccountID),
	)

	var groupID pgtype.UUID
	if p.TransferGroupID != nil {
		var err error
		groupID, err = uuidFromString(*p.TransferGroupID)
		if err != nil {
			return models.Transaction{}, fmt.Errorf("parse transfer_group_id: %w", err)
		}
	}

	q := db.New(r.conn)
	row, err := q.CreateFullTransaction(ctx, db.CreateFullTransactionParams{
		BudgetID:          p.BudgetID,
		AccountID:         p.AccountID,
		EnvelopeID:        p.EnvelopeID,
		TransferAccountID: p.TransferAccountID,
		TransferGroupID:   groupID,
		Amount:            p.Amount.Int64(),
		Date:              timeValToPg(p.Date),
		Status:            db.TransactionStatus(p.Status),
		Memo:              p.Memo,
	})
	if err != nil {
		r.log.Error("CreateFullTransaction query failed",
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("create transaction: %w", err)
	}

	r.log.Info("transaction created",
		zap.Int64("transaction_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return rowToModel(row), nil
}

// GetByID returns the transaction identified by id scoped to budgetID.
// Returns ErrNotFound if the transaction does not exist or is soft-deleted.
func (r *Repo) GetByID(ctx context.Context, id, budgetID int64) (models.Transaction, error) {
	r.log.Debug("executing GetTransactionByID query",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.conn)
	row, err := q.GetTransactionByID(ctx, db.GetTransactionByIDParams{
		ID:       id,
		BudgetID: budgetID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Transaction{}, ErrNotFound
		}
		r.log.Error("GetTransactionByID query failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("get transaction by id: %w", err)
	}

	return getRowToModel(row), nil
}

// List returns transactions in budgetID matching the given filters, ordered by date DESC.
func (r *Repo) List(ctx context.Context, budgetID int64, f ListFilters) ([]models.Transaction, error) {
	r.log.Debug("executing ListTransactions query", zap.Int64("budget_id", budgetID))

	page, pageSize := normalisePage(f.Page, f.PageSize)
	offset := (page - 1) * pageSize

	q := db.New(r.conn)
	rows, err := q.ListTransactions(ctx, db.ListTransactionsParams{
		BudgetID:   budgetID,
		AccountID:  f.AccountID,
		EnvelopeID: f.EnvelopeID,
		DateFrom:   timeToPg(f.DateFrom),
		DateTo:     timeToPg(f.DateTo),
		Limit:      int32(pageSize), //nolint:gosec
		Offset:     int32(offset),   //nolint:gosec
	})
	if err != nil {
		r.log.Error("ListTransactions query failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("list transactions: %w", err)
	}

	out := make([]models.Transaction, 0, len(rows))
	for _, row := range rows {
		out = append(out, listRowToModel(row))
	}
	return out, nil
}

// Count returns the total number of transactions matching the given filters.
func (r *Repo) Count(ctx context.Context, budgetID int64, f ListFilters) (int, error) {
	r.log.Debug("executing CountTransactions query", zap.Int64("budget_id", budgetID))

	q := db.New(r.conn)
	total, err := q.CountTransactions(ctx, db.CountTransactionsParams{
		BudgetID:   budgetID,
		AccountID:  f.AccountID,
		EnvelopeID: f.EnvelopeID,
		DateFrom:   timeToPg(f.DateFrom),
		DateTo:     timeToPg(f.DateTo),
	})
	if err != nil {
		r.log.Error("CountTransactions query failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return 0, fmt.Errorf("count transactions: %w", err)
	}
	return int(total), nil //nolint:gosec
}

// Update fully replaces all mutable fields of the transaction.
// Returns ErrNotFound if the transaction does not exist or is soft-deleted.
func (r *Repo) Update(ctx context.Context, p UpdateParams) (models.Transaction, error) {
	r.log.Debug("executing UpdateTransaction query",
		zap.Int64("transaction_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	q := db.New(r.conn)
	row, err := q.UpdateTransaction(ctx, db.UpdateTransactionParams{
		ID:                p.ID,
		BudgetID:          p.BudgetID,
		AccountID:         p.AccountID,
		EnvelopeID:        p.EnvelopeID,
		TransferAccountID: p.TransferAccountID,
		Amount:            p.Amount.Int64(),
		Date:              pgtype.Timestamptz{Time: p.Date, Valid: true},
		Memo:              p.Memo,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Transaction{}, ErrNotFound
		}
		r.log.Error("UpdateTransaction query failed",
			zap.Int64("transaction_id", p.ID),
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("update transaction: %w", err)
	}

	r.log.Info("transaction updated",
		zap.Int64("transaction_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return updateRowToModel(row), nil
}

// Patch applies only the non-nil fields from p to the transaction row.
// Returns ErrNotFound if the transaction does not exist or is soft-deleted.
func (r *Repo) Patch(ctx context.Context, p PatchParams) (models.Transaction, error) {
	r.log.Debug("executing PatchTransaction query",
		zap.Int64("transaction_id", p.ID),
		zap.Int64("budget_id", p.BudgetID),
	)

	var amountPtr *int64
	if p.Amount != nil {
		v := p.Amount.Int64()
		amountPtr = &v
	}

	var statusPtr *db.TransactionStatus
	if p.Status != nil {
		v := db.TransactionStatus(*p.Status)
		statusPtr = &v
	}

	q := db.New(r.conn)
	row, err := q.PatchTransaction(ctx, db.PatchTransactionParams{
		ID:                p.ID,
		BudgetID:          p.BudgetID,
		AccountID:         p.AccountID,
		EnvelopeID:        p.EnvelopeID,
		TransferAccountID: p.TransferAccountID,
		Amount:            amountPtr,
		Date:              timeToPg(p.Date),
		Status:            statusPtr,
		Memo:              p.Memo,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Transaction{}, ErrNotFound
		}
		r.log.Error("PatchTransaction query failed",
			zap.Int64("transaction_id", p.ID),
			zap.Int64("budget_id", p.BudgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("patch transaction: %w", err)
	}

	r.log.Info("transaction patched",
		zap.Int64("transaction_id", row.ID),
		zap.Int64("budget_id", row.BudgetID),
	)
	return patchRowToModel(row), nil
}

// SoftDelete marks the transaction as deleted. Idempotent.
func (r *Repo) SoftDelete(ctx context.Context, id, budgetID int64) error {
	r.log.Debug("executing SoftDeleteTransaction query",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)

	q := db.New(r.conn)
	if err := q.SoftDeleteTransaction(ctx, db.SoftDeleteTransactionParams{
		ID:       id,
		BudgetID: budgetID,
	}); err != nil {
		r.log.Error("SoftDeleteTransaction query failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("soft delete transaction: %w", err)
	}

	r.log.Info("transaction soft-deleted",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

// GetByGroupID returns all active transactions sharing the given transfer_group_id.
func (r *Repo) GetByGroupID(ctx context.Context, groupID string, budgetID int64) ([]models.Transaction, error) {
	r.log.Debug("executing GetTransactionsByGroupID query",
		zap.String("group_id", groupID),
		zap.Int64("budget_id", budgetID),
	)

	pgGroupID, err := uuidFromString(groupID)
	if err != nil {
		return nil, fmt.Errorf("parse group id: %w", err)
	}

	q := db.New(r.conn)
	rows, err := q.GetTransactionsByGroupID(ctx, db.GetTransactionsByGroupIDParams{
		TransferGroupID: pgGroupID,
		BudgetID:        budgetID,
	})
	if err != nil {
		r.log.Error("GetTransactionsByGroupID query failed",
			zap.String("group_id", groupID),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, fmt.Errorf("get transactions by group id: %w", err)
	}

	out := make([]models.Transaction, 0, len(rows))
	for _, row := range rows {
		out = append(out, groupRowToModel(row))
	}
	return out, nil
}

// SoftDeleteByGroupID soft-deletes all transactions sharing the given transfer_group_id.
func (r *Repo) SoftDeleteByGroupID(ctx context.Context, groupID string, budgetID int64) error {
	r.log.Debug("executing SoftDeleteTransactionsByGroupID query",
		zap.String("group_id", groupID),
		zap.Int64("budget_id", budgetID),
	)

	pgGroupID, err := uuidFromString(groupID)
	if err != nil {
		return fmt.Errorf("parse group id: %w", err)
	}

	q := db.New(r.conn)
	if err := q.SoftDeleteTransactionsByGroupID(ctx, db.SoftDeleteTransactionsByGroupIDParams{
		TransferGroupID: pgGroupID,
		BudgetID:        budgetID,
	}); err != nil {
		r.log.Error("SoftDeleteTransactionsByGroupID query failed",
			zap.String("group_id", groupID),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("soft delete transactions by group id: %w", err)
	}

	r.log.Info("transfer legs soft-deleted",
		zap.String("group_id", groupID),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}

const (
	repoDefaultPage     = 1
	repoDefaultPageSize = 20
	repoMaxPageSize     = 100
)

// normalisePage returns safe page/pageSize values.
func normalisePage(page, pageSize int) (normPage int, normSize int) {
	normPage = page
	normSize = pageSize
	if normPage < 1 {
		normPage = repoDefaultPage
	}
	if normSize < 1 {
		normSize = repoDefaultPageSize
	}
	if normSize > repoMaxPageSize {
		normSize = repoMaxPageSize
	}
	return normPage, normSize
}
