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

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTransactions, type TransactionFilters } from "@/lib/api/transactions";
import { qk } from "@/lib/query-keys";
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
    createdAt: t.created_at,
    memo: t.memo ?? undefined,
    status: t.status,
    cleared: t.status === "cleared" || t.status === "reconciled",
  };
}

export function useTransactions(
  budgetId: number | null,
  filters: TransactionFilters = {},
  accountMap: Map<number, string> = new Map(),
  envelopeMap: Map<number, string> = new Map(),
) {
  const filtersKey = JSON.stringify(filters);

  const query = useQuery({
    queryKey: [...qk.transactions(budgetId ?? -1), "list", filtersKey],
    queryFn: () => listTransactions(budgetId as number, filters),
    enabled: budgetId != null,
  });

  const raw = query.data;
  const data = useMemo(
    () => (raw ?? []).map((t) => apiTransactionToUI(t, accountMap, envelopeMap)),
    [raw, accountMap, envelopeMap],
  );

  return {
    data,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
