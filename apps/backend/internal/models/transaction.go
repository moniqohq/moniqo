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

// TransactionStatus is the clearing state of a transaction.
type TransactionStatus string

// TransactionStatus constants for the transaction clearing lifecycle.
const (
	TransactionStatusUncleared  TransactionStatus = "uncleared"
	TransactionStatusCleared    TransactionStatus = "cleared"
	TransactionStatusReconciled TransactionStatus = "reconciled"
)

// IsValid reports whether s is a recognized TransactionStatus.
func (s TransactionStatus) IsValid() bool {
	switch s {
	case TransactionStatusUncleared, TransactionStatusCleared, TransactionStatusReconciled:
		return true
	default:
		return false
	}
}

// Transaction is the API-facing representation of a ledger entry.
// Amount is stored as minor units (BIGINT) and serialized as a decimal by money.Amount.
type Transaction struct {
	ID                int64             `json:"id"`
	BudgetID          int64             `json:"budget_id"`
	AccountID         int64             `json:"account_id"`
	TransferAccountID *int64            `json:"transfer_account_id"`
	EnvelopeID        *int64            `json:"budget_envelope_id"`
	TransferGroupID   *string           `json:"transfer_group_id,omitempty"`
	Amount            money.Amount      `json:"amount"`
	Date              time.Time         `json:"date"`
	Status            TransactionStatus `json:"status"`
	Memo              *string           `json:"memo,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
}
