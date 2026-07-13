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

package search

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Repository defines the read-only data-access contract for global search.
type Repository interface {
	SearchTransactions(ctx context.Context, budgetID int64, query string, limit int) ([]TxnHit, error)
	SearchAccounts(ctx context.Context, budgetID int64, query string, limit int) ([]AccountHit, error)
	SearchEnvelopes(ctx context.Context, budgetID int64, query string, limit int) ([]EnvelopeHit, error)
	SearchBudgets(ctx context.Context, userID int64, query string, limit int) ([]BudgetHit, error)
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

// SearchTransactions returns transactions in budgetID whose memo matches query.
func (r *Repo) SearchTransactions(ctx context.Context, budgetID int64, query string, limit int) ([]TxnHit, error) {
	q := db.New(r.conn)
	rows, err := q.SearchTransactions(ctx, db.SearchTransactionsParams{
		BudgetID: budgetID,
		Query:    query,
		Lim:      int32(limit), //nolint:gosec
	})
	if err != nil {
		r.log.Error("SearchTransactions query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return nil, fmt.Errorf("search transactions: %w", err)
	}

	out := make([]TxnHit, 0, len(rows))
	for _, row := range rows {
		out = append(out, TxnHit{
			ID:            row.ID,
			AccountID:     row.AccountID,
			AccountName:   row.AccountName,
			EnvelopeID:    row.EnvelopeID,
			EnvelopeTitle: row.EnvelopeTitle,
			Amount:        money.FromMinorUnits(row.Amount),
			Date:          row.Date.Time,
			Status:        models.TransactionStatus(row.Status),
			Memo:          row.Memo,
		})
	}
	return out, nil
}

// SearchAccounts returns accounts in budgetID matching query on name/institution/notes.
func (r *Repo) SearchAccounts(ctx context.Context, budgetID int64, query string, limit int) ([]AccountHit, error) {
	q := db.New(r.conn)
	rows, err := q.SearchAccounts(ctx, db.SearchAccountsParams{
		BudgetID: budgetID,
		Query:    query,
		Lim:      int32(limit), //nolint:gosec
	})
	if err != nil {
		r.log.Error("SearchAccounts query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return nil, fmt.Errorf("search accounts: %w", err)
	}

	out := make([]AccountHit, 0, len(rows))
	for _, row := range rows {
		out = append(out, AccountHit{
			ID:          row.ID,
			Name:        row.Name,
			Type:        models.AccountType(row.Type),
			Institution: row.Institution,
		})
	}
	return out, nil
}

// SearchEnvelopes returns envelopes in budgetID matching query on title/description.
func (r *Repo) SearchEnvelopes(ctx context.Context, budgetID int64, query string, limit int) ([]EnvelopeHit, error) {
	q := db.New(r.conn)
	rows, err := q.SearchEnvelopes(ctx, db.SearchEnvelopesParams{
		BudgetID: budgetID,
		Query:    query,
		Lim:      int32(limit), //nolint:gosec
	})
	if err != nil {
		r.log.Error("SearchEnvelopes query failed", zap.Int64("budget_id", budgetID), zap.Error(err))
		return nil, fmt.Errorf("search envelopes: %w", err)
	}

	out := make([]EnvelopeHit, 0, len(rows))
	for _, row := range rows {
		out = append(out, EnvelopeHit{
			ID:    row.ID,
			Title: row.Title,
		})
	}
	return out, nil
}

// SearchBudgets returns budgets the user actively belongs to whose title/notes match query.
func (r *Repo) SearchBudgets(ctx context.Context, userID int64, query string, limit int) ([]BudgetHit, error) {
	q := db.New(r.conn)
	rows, err := q.SearchBudgets(ctx, db.SearchBudgetsParams{
		UserID: userID,
		Query:  query,
		Lim:    int32(limit), //nolint:gosec
	})
	if err != nil {
		r.log.Error("SearchBudgets query failed", zap.Int64("user_id", userID), zap.Error(err))
		return nil, fmt.Errorf("search budgets: %w", err)
	}

	out := make([]BudgetHit, 0, len(rows))
	for _, row := range rows {
		out = append(out, BudgetHit{
			ID:    row.ID,
			Title: row.Title,
			Role:  models.Role(row.Role),
		})
	}
	return out, nil
}
