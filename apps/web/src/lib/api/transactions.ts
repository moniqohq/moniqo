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

import { apiFetch } from "./client";
import type { ApiTransaction } from "./types";

const base = (budgetId: number) => `/api/v1/budgets/${budgetId}/transactions`;

export type TransactionFilters = {
  account_id?: number;
  budget_envelope_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
};

export function listTransactions(
  budgetId: number,
  filters: TransactionFilters = {}
): Promise<ApiTransaction[]> {
  const params = new URLSearchParams();
  if (filters.account_id != null) params.set("account_id", String(filters.account_id));
  if (filters.budget_envelope_id != null)
    params.set("budget_envelope_id", String(filters.budget_envelope_id));
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.page_size != null) params.set("page_size", String(filters.page_size));

  const qs = params.toString();
  return apiFetch<ApiTransaction[]>(`${base(budgetId)}${qs ? `?${qs}` : ""}`);
}

export function getTransaction(budgetId: number, id: number): Promise<ApiTransaction> {
  return apiFetch<ApiTransaction>(`${base(budgetId)}/${id}`);
}

export function createTransaction(
  budgetId: number,
  req:
    | { account_id: number; budget_envelope_id: number; amount: number; date: string; memo?: string }
    | { account_id: number; transfer_account_id: number; amount: number; date: string; memo?: string }
): Promise<ApiTransaction> {
  return apiFetch<ApiTransaction>(base(budgetId), {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function patchTransaction(
  budgetId: number,
  id: number,
  req: Partial<{
    account_id: number;
    budget_envelope_id: number | null;
    transfer_account_id: number | null;
    amount: number;
    date: string;
    memo: string | null;
  }>
): Promise<ApiTransaction> {
  return apiFetch<ApiTransaction>(`${base(budgetId)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function deleteTransaction(budgetId: number, id: number): Promise<void> {
  return apiFetch<void>(`${base(budgetId)}/${id}`, { method: "DELETE" });
}
