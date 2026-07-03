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

import type { ApiTransaction, ApiAccount, ApiEnvelope } from "./api-types";
import type { Transaction } from "@/types";

export function adaptTransaction(
  raw: ApiTransaction,
  accounts: Map<number, ApiAccount>,
  envelopes: Map<number, ApiEnvelope>,
): Transaction {
  const account = accounts.get(raw.account_id);
  const envelope =
    raw.budget_envelope_id != null ? envelopes.get(raw.budget_envelope_id) : undefined;

  let type: Transaction["type"];
  if (raw.transfer_account_id != null) {
    type = "transfer";
  } else if (raw.amount < 0) {
    type = "expense";
  } else {
    type = "income";
  }

  return {
    id: String(raw.id),
    budgetId: String(raw.budget_id),
    accountId: String(raw.account_id),
    accountName: account?.name ?? `Account #${raw.account_id}`,
    envelopeId: raw.budget_envelope_id != null ? String(raw.budget_envelope_id) : undefined,
    envelopeName: envelope?.title,
    payee: raw.memo ?? "",
    amount: raw.amount,
    type,
    date: raw.date,
    memo: raw.memo ?? undefined,
    cleared: false,
  };
}
