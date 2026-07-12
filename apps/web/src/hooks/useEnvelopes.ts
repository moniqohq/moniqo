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

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { qk, invalidateBudgetData } from "@/lib/query-keys";
import type { ApiEnvelope } from "@/lib/api-types";

export interface CreateEnvelopePayload {
  title: string;
  allocated_amt: number;
  description?: string;
}

export interface PatchEnvelopePayload {
  title?: string;
  allocated_amt?: number;
  description?: string;
}

export function useEnvelopes(budgetId: number | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...qk.envelopes(budgetId ?? -1), "raw"],
    queryFn: () =>
      apiFetch<ApiEnvelope[]>(`/api/v1/budgets/${budgetId}/envelopes`).then((d) => d ?? []),
    enabled: budgetId != null,
  });

  const envelopes = useMemo(() => query.data ?? [], [query.data]);

  const envelopeMap = useMemo(() => {
    const m = new Map<number, ApiEnvelope>();
    for (const e of envelopes) m.set(e.id, e);
    return m;
  }, [envelopes]);

  const createEnvelope = useCallback(
    async (payload: CreateEnvelopePayload): Promise<ApiEnvelope> => {
      const envelope = await apiFetch<ApiEnvelope>(`/api/v1/budgets/${budgetId}/envelopes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      invalidateBudgetData(queryClient, budgetId);
      return envelope;
    },
    [budgetId, queryClient],
  );

  const patchEnvelope = useCallback(
    async (id: number, payload: PatchEnvelopePayload): Promise<ApiEnvelope> => {
      const envelope = await apiFetch<ApiEnvelope>(`/api/v1/budgets/${budgetId}/envelopes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      invalidateBudgetData(queryClient, budgetId);
      return envelope;
    },
    [budgetId, queryClient],
  );

  const deleteEnvelope = useCallback(
    async (id: number): Promise<void> => {
      await apiFetch<unknown>(`/api/v1/budgets/${budgetId}/envelopes/${id}`, {
        method: "DELETE",
      });
      invalidateBudgetData(queryClient, budgetId);
    },
    [budgetId, queryClient],
  );

  return {
    budgetId,
    envelopes,
    envelopeMap,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: query.refetch,
    createEnvelope,
    patchEnvelope,
    deleteEnvelope,
  };
}
