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
import type { ApiEnvelope, ApiBudgetSummary, ApiDashboardStats } from "./types";

const base = (budgetId: number) => `/api/v1/budgets/${budgetId}/envelopes`;

export type EnvelopeStatusParam = "active" | "archived" | "all";

export function listEnvelopes(
  budgetId: number,
  status: EnvelopeStatusParam = "active",
): Promise<ApiEnvelope[]> {
  return apiFetch<ApiEnvelope[]>(`${base(budgetId)}?status=${status}`);
}

export function getEnvelope(budgetId: number, id: number): Promise<ApiEnvelope> {
  return apiFetch<ApiEnvelope>(`${base(budgetId)}/${id}`);
}

export function getBudgetSummary(budgetId: number): Promise<ApiBudgetSummary> {
  return apiFetch<ApiBudgetSummary>(`/api/v1/budgets/${budgetId}/summary`);
}

export function getDashboardStats(budgetId: number, month?: string): Promise<ApiDashboardStats> {
  const url = month
    ? `/api/v1/budgets/${budgetId}/dashboard?month=${month}`
    : `/api/v1/budgets/${budgetId}/dashboard`;
  return apiFetch<ApiDashboardStats>(url);
}

export function createEnvelope(
  budgetId: number,
  req: { title: string; allocated_amt: number; description?: string },
): Promise<ApiEnvelope> {
  return apiFetch<ApiEnvelope>(base(budgetId), {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function patchEnvelope(
  budgetId: number,
  id: number,
  req: Partial<{ title: string; allocated_amt: number; description: string | null }>,
): Promise<ApiEnvelope> {
  return apiFetch<ApiEnvelope>(`${base(budgetId)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function deleteEnvelope(budgetId: number, id: number): Promise<void> {
  return apiFetch<void>(`${base(budgetId)}/${id}`, { method: "DELETE" });
}

export function forceDeleteEnvelope(budgetId: number, id: number): Promise<void> {
  return apiFetch<void>(`${base(budgetId)}/${id}/force`, { method: "DELETE" });
}
