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
import { listBudgets } from "@/lib/api/budget";
import { useUIStore } from "@/stores/ui.store";
import type { Budget } from "@/types";
import type { ApiBudget } from "@/lib/api/types";

function apiBudgetToUI(b: ApiBudget): Budget {
  return {
    id: b.id,
    name: b.title,
    notes: b.notes ?? undefined,
    createdAt: b.created_at,
  };
}

export function useBudgets() {
  const [data, setData] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await listBudgets();
      const budgets = raw.map(apiBudgetToUI);
      setData(budgets);
      if (activeBudgetId == null && budgets.length > 0) {
        setActiveBudget(budgets[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load budgets");
    } finally {
      setIsLoading(false);
    }
  }, [activeBudgetId, setActiveBudget]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
