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

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import type { ApiAccount, ApiListResponse } from "@/lib/api-types";

interface UseAccountsResult {
  accounts: ApiAccount[];
  accountMap: Map<number, ApiAccount>;
  loading: boolean;
  error: string | null;
}

export function useAccounts(budgetId: number | null): UseAccountsResult {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budgetId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/v1/budgets/${budgetId}/accounts`)
      .then((res) => res.json() as Promise<ApiListResponse<ApiAccount>>)
      .then((body) => {
        if (cancelled) return;
        if (!body.success) throw new Error(body.msg || "Failed to fetch accounts");
        setAccounts(body.data ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unexpected error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  const accountMap = useMemo(() => {
    const m = new Map<number, ApiAccount>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  return { accounts, accountMap, loading, error };
}
