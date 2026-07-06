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
"use client";

import { useEffect, useState, useCallback } from "react";
import { listTransactions, type TransactionFilters } from "@/lib/api/transactions";
import type { Transaction, TransactionType } from "@/types";
import type { ApiTransaction } from "@/lib/api/types";

export function apiTransactionToUI(
  t: ApiTransaction,
  accountMap: Map<number, string>,
  envelopeMap?: Map<number, string>,
): Transaction {
  const isTransfer = t.transfer_account_id != null;
  const type: TransactionType = isTransfer ? "transfer" : t.amount >= 0 ? "income" : "expense";

  return {
    id: t.id,
    budgetId: t.budget_id,
    accountId: t.account_id,
    accountName: accountMap.get(t.account_id) ?? "Unknown",
    envelopeId: t.budget_envelope_id ?? undefined,
    envelopeName:
      t.budget_envelope_id != null
        ? (envelopeMap?.get(t.budget_envelope_id) ?? undefined)
        : undefined,
    transferAccountId: t.transfer_account_id ?? undefined,
    payee: t.memo ?? (isTransfer ? "Transfer" : ""),
    amount: Math.abs(t.amount),
    type,
    date: t.date,
    memo: t.memo ?? undefined,
    cleared: true,
  };
}

export function useTransactions(
  budgetId: number | null,
  filters: TransactionFilters = {},
  accountMap: Map<number, string> = new Map(),
  envelopeMap: Map<number, string> = new Map(),
) {
  const [data, setData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);
  const accountMapKey = JSON.stringify(Array.from(accountMap.entries()));

  const fetch = useCallback(async () => {
    if (budgetId == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const raw = await listTransactions(budgetId, filters);
      setData(raw.map((t) => apiTransactionToUI(t, accountMap, envelopeMap)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId, filtersKey, accountMapKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
