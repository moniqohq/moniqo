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

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ApiTransaction } from "@/lib/api-types";

const MAX_PAGE_SIZE = 100;

async function fetchAllTransactionsForAccount(
  budgetId: number,
  accountId: number,
): Promise<ApiTransaction[]> {
  const all: ApiTransaction[] = [];
  let page = 1;
  for (;;) {
    const url = `/api/v1/budgets/${budgetId}/transactions?account_id=${accountId}&page=${page}&page_size=${MAX_PAGE_SIZE}`;
    const batch = await apiFetch<ApiTransaction[]>(url);
    all.push(...(batch ?? []));
    if (!batch || batch.length < MAX_PAGE_SIZE) break;
    page += 1;
  }
  return all;
}

interface UseRunningBalancesResult {
  balances: Map<number, number>;
  loading: boolean;
  error: string | null;
}

/**
 * Computes the running balance after each transaction for a single account,
 * anchored on the account's current balance. Running balance is only
 * well-defined within one account's chronological history, so callers must
 * scope this to exactly one account (pass `null` otherwise).
 */
export function useRunningBalances(
  budgetId: number | null,
  accountId: number | null,
  accountBalance: number | undefined,
): UseRunningBalancesResult {
  const query = useQuery({
    queryKey: [...qk.transactions(budgetId ?? -1), "running-balances", accountId],
    queryFn: () => fetchAllTransactionsForAccount(budgetId as number, accountId as number),
    enabled: budgetId != null && accountId != null,
  });

  const rawTransactions = query.data;

  const balances = useMemo(() => {
    if (accountBalance == null || !rawTransactions) return new Map<number, number>();

    const sorted = [...rawTransactions].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const opening = accountBalance - sorted.reduce((s, t) => s + t.amount, 0);

    const map = new Map<number, number>();
    let running = opening;
    for (const t of sorted) {
      running += t.amount;
      map.set(t.id, running);
    }
    return map;
  }, [rawTransactions, accountBalance]);

  return {
    balances,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
