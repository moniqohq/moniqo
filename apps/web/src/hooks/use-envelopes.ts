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
import { listEnvelopes, getBudgetSummary } from "@/lib/api/envelopes";
import type { BudgetEnvelope, BudgetSummary } from "@/types";
import type { ApiEnvelope, ApiBudgetSummary } from "@/lib/api/types";

export function apiEnvelopeToUI(e: ApiEnvelope): BudgetEnvelope {
  const available = e.allocated_amt - e.spent_amt;
  return {
    id: e.id,
    budgetId: e.budget_id,
    name: e.title,
    description: e.description ?? undefined,
    allocated: e.allocated_amt,
    spent: e.spent_amt,
    available,
    isOverspent: e.is_overspent,
  };
}

function apiSummaryToUI(s: ApiBudgetSummary): BudgetSummary {
  return {
    toBeBudgeted: s.to_be_budgeted,
    totalAllocated: s.total_allocated,
    totalSpent: s.total_spent,
    overspentEnvelopesCount: s.overspent_envelopes_count,
  };
}

export function useEnvelopes(budgetId: number | null) {
  const [data, setData] = useState<BudgetEnvelope[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (budgetId == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const [rawEnvelopes, rawSummary] = await Promise.all([
        listEnvelopes(budgetId),
        getBudgetSummary(budgetId),
      ]);
      setData(rawEnvelopes.map(apiEnvelopeToUI));
      setSummary(apiSummaryToUI(rawSummary));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load envelopes");
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, summary, isLoading, error, refetch: fetch };
}
