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
import { adaptTransaction } from "@/lib/transaction-adapter";
import type { ApiTransaction, ApiAccount, ApiEnvelope } from "@/lib/api-types";
import type { Transaction } from "@/types";

interface Filters {
  accountId?: number;
  envelopeId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactions(
  budgetId: number | null,
  accounts: Map<number, ApiAccount>,
  envelopes: Map<number, ApiEnvelope>,
  filters?: Filters,
): UseTransactionsResult {
  const [rawTransactions, setRawTransactions] = useState<ApiTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (budgetId == null) return;

    const params = new URLSearchParams();
    if (filters?.accountId != null) params.set("account_id", String(filters.accountId));
    if (filters?.envelopeId != null) params.set("budget_envelope_id", String(filters.envelopeId));
    if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters?.dateTo) params.set("date_to", filters.dateTo);
    if (filters?.page != null) params.set("page", String(filters.page));
    if (filters?.pageSize != null) params.set("page_size", String(filters.pageSize));

    const query = params.toString();
    const url = `/api/v1/budgets/${budgetId}/transactions${query ? `?${query}` : ""}`;

    let cancelled = false;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ApiTransaction[]>(url);
        if (cancelled) return;
        setRawTransactions(data ?? []);
        setTotal(data?.length ?? 0);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchTransactions();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    budgetId,
    tick,
    filters?.accountId,
    filters?.envelopeId,
    filters?.dateFrom,
    filters?.dateTo,
    filters?.page,
    filters?.pageSize,
  ]);

  const transactions = useMemo(
    () => rawTransactions.map((raw) => adaptTransaction(raw, accounts, envelopes)),
    [rawTransactions, accounts, envelopes],
  );

  return { transactions, total, loading, error, refetch };
}
