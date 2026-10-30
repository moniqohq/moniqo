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

package models

import (
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// Date is a calendar date (no time component) serialized as "YYYY-MM-DD".
type Date struct {
	time.Time
}

// MarshalJSON renders the date as a quoted "YYYY-MM-DD" string.
func (d Date) MarshalJSON() ([]byte, error) {
	return []byte(`"` + d.Format(time.DateOnly) + `"`), nil
}

// ReconciliationCheckpoint is the snapshot persisted each time an account is
// reconciled against a bank statement. Balances are in money.Amount; the
// Difference is StatementBalance minus ClearedBalance at the time of reconcile.
type ReconciliationCheckpoint struct {
	ID                 int64        `json:"id"`
	BudgetID           int64        `json:"budget_id"`
	AccountID          int64        `json:"account_id"`
	StatementBalance   money.Amount `json:"statement_balance"`
	StatementDate      Date         `json:"statement_date"`
	ClearedBalance     money.Amount `json:"cleared_balance"`
	LedgerBalance      money.Amount `json:"ledger_balance"`
	Difference         money.Amount `json:"difference"`
	TransactionsCount  int          `json:"transactions_count"`
	ReconciledByUserID *int64       `json:"reconciled_by_user_id"`
	CreatedAt          time.Time    `json:"created_at"`
}
