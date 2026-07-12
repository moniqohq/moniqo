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
import type { ApiAccount } from "@/lib/api-types";

interface UseAccountsResult {
  accounts: ApiAccount[];
  accountMap: Map<number, ApiAccount>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccounts(budgetId: number | null): UseAccountsResult {
  const query = useQuery({
    queryKey: [...qk.accounts(budgetId ?? -1), "raw"],
    queryFn: () =>
      apiFetch<ApiAccount[]>(`/api/v1/budgets/${budgetId}/accounts`).then((d) => d ?? []),
    enabled: budgetId != null,
  });

  const accounts = useMemo(() => query.data ?? [], [query.data]);

  const accountMap = useMemo(() => {
    const m = new Map<number, ApiAccount>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  return {
    accounts,
    accountMap,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
