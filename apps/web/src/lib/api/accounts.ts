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
import type { ApiAccount } from "./types";

const base = (budgetId: number) => `/api/v1/budgets/${budgetId}/accounts`;

export function listAccounts(budgetId: number): Promise<ApiAccount[]> {
  return apiFetch<ApiAccount[]>(base(budgetId));
}

export function getAccount(budgetId: number, id: number): Promise<ApiAccount> {
  return apiFetch<ApiAccount>(`${base(budgetId)}/${id}`);
}

export function createAccount(
  budgetId: number,
  req: {
    name: string;
    type: string;
    requires_recon: boolean;
    is_on_budget?: boolean;
    notes?: string;
    initial_balance: number;
  }
): Promise<ApiAccount> {
  return apiFetch<ApiAccount>(base(budgetId), {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function patchAccount(
  budgetId: number,
  id: number,
  req: Partial<{
    name: string;
    type: string;
    requires_recon: boolean;
    is_on_budget: boolean;
    notes: string | null;
  }>
): Promise<ApiAccount> {
  return apiFetch<ApiAccount>(`${base(budgetId)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function deleteAccount(budgetId: number, id: number): Promise<void> {
  return apiFetch<void>(`${base(budgetId)}/${id}`, { method: "DELETE" });
}
