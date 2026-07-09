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
import { getAccountBalanceHistory } from "@/lib/api/accounts";
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
  const [data, setData] = useState<AccountBalanceHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (budgetId == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const raw = await getAccountBalanceHistory(budgetId, months);
      setData(toUI(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load account balance history");
    } finally {
      setIsLoading(false);
    }
  }, [budgetId, months]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
