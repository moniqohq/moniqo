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

import { useQuery } from "@tanstack/react-query";
import { listAccountReconciliations } from "@/lib/api/accounts";
import { qk } from "@/lib/query-keys";
import type { ApiReconciliationCheckpoint } from "@/lib/api/types";

/**
 * Reconciliation checkpoints for one account, newest first.
 * Keyed under qk.accounts so invalidateBudgetData() refreshes it after a reconcile.
 */
export function useReconciliationHistory(budgetId: number | null, accountId: number | null) {
  const query = useQuery({
    queryKey: [...qk.accounts(budgetId ?? -1), "reconciliations", accountId ?? -1],
    queryFn: () => listAccountReconciliations(budgetId as number, accountId as number),
    enabled: budgetId != null && accountId != null,
  });

  return {
    data: (query.data ?? []) as ApiReconciliationCheckpoint[],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
