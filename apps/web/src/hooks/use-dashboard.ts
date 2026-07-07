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
import { getDashboardStats } from "@/lib/api/envelopes";
import type { ApiDashboardStats } from "@/lib/api/types";

export type DashboardStats = {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  sparkline: { month: string; income: number; expenses: number }[];
};

function toUI(raw: ApiDashboardStats): DashboardStats {
  return {
    netWorth: raw.net_worth,
    monthlyIncome: raw.monthly_income,
    monthlyExpenses: raw.monthly_expenses,
    monthlySavings: raw.monthly_savings,
    sparkline: raw.sparkline ?? [],
  };
}

export function useDashboardStats(budgetId: number | null, month?: string) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (budgetId == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const raw = await getDashboardStats(budgetId, month);
      setData(toUI(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard stats");
    } finally {
      setIsLoading(false);
    }
  }, [budgetId, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
