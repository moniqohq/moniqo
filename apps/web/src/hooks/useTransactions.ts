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

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetchPaginated } from "@/lib/api";
import { qk } from "@/lib/query-keys";
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
  const params = new URLSearchParams();
  if (filters?.accountId != null) params.set("account_id", String(filters.accountId));
  if (filters?.envelopeId != null) params.set("budget_envelope_id", String(filters.envelopeId));
  if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters?.dateTo) params.set("date_to", filters.dateTo);
  params.set("page", String(filters?.page ?? 1));
  if (filters?.pageSize != null) params.set("page_size", String(filters.pageSize));
  const queryString = params.toString();

  const query = useQuery({
    queryKey: [...qk.transactions(budgetId ?? -1), "paginated", queryString],
    queryFn: async () => {
      const url = `/api/v1/budgets/${budgetId}/transactions${queryString ? `?${queryString}` : ""}`;
      const { data, meta } = await apiFetchPaginated<ApiTransaction>(url);
      return { data: data ?? [], total: meta?.total ?? data?.length ?? 0 };
    },
    enabled: budgetId != null,
  });

  const rawTransactions = query.data?.data;
  const transactions = useMemo(
    () => (rawTransactions ?? []).map((raw) => adaptTransaction(raw, accounts, envelopes)),
    [rawTransactions, accounts, envelopes],
  );

  return {
    transactions,
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
