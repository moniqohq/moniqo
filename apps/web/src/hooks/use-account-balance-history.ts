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
import { getAccountBalanceHistory } from "@/lib/api/accounts";
import { qk } from "@/lib/query-keys";
import type { ApiAccountBalanceHistory, ApiBalancePoint } from "@/lib/api/types";

export type AccountBalanceHistory = {
  cash: ApiBalancePoint[];
  credit: ApiBalancePoint[];
  savings: ApiBalancePoint[];
  netWorth: ApiBalancePoint[];
};

function toUI(raw: ApiAccountBalanceHistory): AccountBalanceHistory {
  return {
    cash: raw.cash ?? [],
    credit: raw.credit ?? [],
    savings: raw.savings ?? [],
    netWorth: raw.net_worth ?? [],
  };
}

export function useAccountBalanceHistory(budgetId: number | null, months?: number) {
  const query = useQuery({
    queryKey: [...qk.accountBalanceHistory(budgetId ?? -1), months ?? "default"],
    queryFn: () => getAccountBalanceHistory(budgetId as number, months).then(toUI),
    enabled: budgetId != null,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
