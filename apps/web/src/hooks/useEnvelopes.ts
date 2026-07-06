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

import { useState, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/ui.store";
import type { BudgetEnvelope } from "@/types";

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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.msg || "Request failed");
  }
  return body.data as T;
}

export function useEnvelopes() {
  const activeBudgetId = useUIStore((s) => s.activeBudgetId);
  const budgetId = activeBudgetId ?? 0;
  const validBudgetId = activeBudgetId !== null && activeBudgetId > 0;

  const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvelopes = useCallback(async () => {
    if (!validBudgetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<BudgetEnvelope[]>(`/api/v1/budgets/${budgetId}/envelopes`);
      setEnvelopes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load envelopes");
    } finally {
      setLoading(false);
    }
  }, [budgetId, validBudgetId]);

  useEffect(() => {
    if (!validBudgetId) return;
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    apiFetch<BudgetEnvelope[]>(`/api/v1/budgets/${budgetId}/envelopes`)
      .then((data) => {
        if (!ignore) setEnvelopes(data);
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load envelopes");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [budgetId, validBudgetId]);

  const createEnvelope = async (payload: CreateEnvelopePayload): Promise<BudgetEnvelope> => {
    const data = await apiFetch<BudgetEnvelope>(`/api/v1/budgets/${budgetId}/envelopes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await fetchEnvelopes();
    return data;
  };

  const patchEnvelope = async (
    id: number,
    payload: PatchEnvelopePayload,
  ): Promise<BudgetEnvelope> => {
    const data = await apiFetch<BudgetEnvelope>(`/api/v1/budgets/${budgetId}/envelopes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await fetchEnvelopes();
    return data;
  };

  const deleteEnvelope = async (id: number): Promise<void> => {
    await apiFetch<unknown>(`/api/v1/budgets/${budgetId}/envelopes/${id}`, {
      method: "DELETE",
    });
    await fetchEnvelopes();
  };

  return {
    budgetId: validBudgetId ? budgetId : null,
    envelopes,
    loading,
    error,
    refresh: fetchEnvelopes,
    createEnvelope,
    patchEnvelope,
    deleteEnvelope,
  };
}
