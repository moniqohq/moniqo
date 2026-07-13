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
import { getDashboardStats } from "@/lib/api/envelopes";
import { qk } from "@/lib/query-keys";
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
  const query = useQuery({
    queryKey: [...qk.dashboard(budgetId ?? -1), month ?? "current"],
    queryFn: () => getDashboardStats(budgetId as number, month).then(toUI),
    enabled: budgetId != null,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
