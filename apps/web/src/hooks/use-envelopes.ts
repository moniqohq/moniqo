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

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEnvelopes, getBudgetSummary, type EnvelopeStatusParam } from "@/lib/api/envelopes";
import { qk } from "@/lib/query-keys";
import type { BudgetEnvelope, BudgetSummary } from "@/types";
import type { ApiEnvelope, ApiBudgetSummary } from "@/lib/api/types";

export function apiEnvelopeToUI(e: ApiEnvelope): BudgetEnvelope {
  const spent = -e.spent_amt;
  const available = e.allocated_amt - spent;
  return {
    id: e.id,
    budgetId: e.budget_id,
    name: e.title,
    description: e.description ?? undefined,
    allocated: e.allocated_amt,
    spent,
    available,
    isOverspent: e.is_overspent,
    isArchived: e.is_archived,
    createdAt: e.created_at,
  };
}

function apiSummaryToUI(s: ApiBudgetSummary): BudgetSummary {
  return {
    toBeBudgeted: s.to_be_budgeted,
    totalAllocated: s.total_allocated,
    totalSpent: -s.total_spent,
    overspentEnvelopesCount: s.overspent_envelopes_count,
  };
}

export function useEnvelopes(budgetId: number | null, status: EnvelopeStatusParam = "active") {
  const envelopesQuery = useQuery({
    queryKey: [...qk.envelopes(budgetId ?? -1), "list", status],
    queryFn: () =>
      listEnvelopes(budgetId as number, status).then((raw) => raw.map(apiEnvelopeToUI)),
    enabled: budgetId != null,
  });

  const summaryQuery = useQuery({
    queryKey: qk.budgetSummary(budgetId ?? -1),
    queryFn: () => getBudgetSummary(budgetId as number).then(apiSummaryToUI),
    enabled: budgetId != null,
  });

  const refetch = useCallback(() => {
    void envelopesQuery.refetch();
    void summaryQuery.refetch();
  }, [envelopesQuery, summaryQuery]);

  const error = envelopesQuery.error ?? summaryQuery.error;

  return {
    data: envelopesQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    isLoading: envelopesQuery.isLoading || summaryQuery.isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
