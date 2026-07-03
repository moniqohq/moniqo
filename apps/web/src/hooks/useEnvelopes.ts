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

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import type { ApiEnvelope, ApiListResponse } from "@/lib/api-types";

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
  const [envelopes, setEnvelopes] = useState<ApiEnvelope[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvelopes = useCallback(async () => {
    if (budgetId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/budgets/${budgetId}/envelopes`);
      const body = (await res.json()) as ApiListResponse<ApiEnvelope>;
      if (!body.success) throw new Error(body.msg || "Failed to fetch envelopes");
      setEnvelopes(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load envelopes");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    if (budgetId == null) return;
    let cancelled = false;

    const fetchEnvelopes = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/v1/budgets/${budgetId}/envelopes`);
        const body = (await res.json()) as ApiListResponse<ApiEnvelope>;
        if (cancelled) return;
        if (!body.success) throw new Error(body.msg || "Failed to fetch envelopes");
        setEnvelopes(body.data ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchEnvelopes();

    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  const envelopeMap = useMemo(() => {
    const m = new Map<number, ApiEnvelope>();
    for (const e of envelopes) m.set(e.id, e);
    return m;
  }, [envelopes]);

  const createEnvelope = async (payload: CreateEnvelopePayload): Promise<ApiEnvelope> => {
    const res = await apiFetch(`/api/v1/budgets/${budgetId}/envelopes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.msg || "Failed to create envelope");
    await fetchEnvelopes();
    return body.data as ApiEnvelope;
  };

  const patchEnvelope = async (id: number, payload: PatchEnvelopePayload): Promise<ApiEnvelope> => {
    const res = await apiFetch(`/api/v1/budgets/${budgetId}/envelopes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.msg || "Failed to update envelope");
    await fetchEnvelopes();
    return body.data as ApiEnvelope;
  };

  const deleteEnvelope = async (id: number): Promise<void> => {
    const res = await apiFetch(`/api/v1/budgets/${budgetId}/envelopes/${id}`, {
      method: "DELETE",
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.msg || "Failed to delete envelope");
    await fetchEnvelopes();
  };

  return {
    budgetId,
    envelopes,
    envelopeMap,
    loading,
    error,
    refresh: fetchEnvelopes,
    createEnvelope,
    patchEnvelope,
    deleteEnvelope,
  };
}
