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

import { authFetch } from "@/lib/api-client";
import type { ApiAccount, ApiAccountType } from "@/lib/adapters/account.adapter";

export interface CreateAccountPayload {
  name: string;
  type: ApiAccountType;
  requires_recon: boolean;
  is_on_budget: boolean;
  is_immutable?: boolean;
  notes?: string;
  initial_balance: number;
}

export interface UpdateAccountPayload {
  name: string;
  type: ApiAccountType;
  requires_recon: boolean;
  is_on_budget?: boolean;
  notes?: string;
}

export interface PatchAccountPayload {
  name?: string;
  type?: ApiAccountType;
  requires_recon?: boolean;
  is_on_budget?: boolean;
  notes?: string;
}

export async function fetchAccounts(budgetId: string): Promise<ApiAccount[]> {
  return authFetch<ApiAccount[]>(`/api/v1/budgets/${budgetId}/accounts`);
}

export async function fetchAccount(budgetId: string, accountId: string): Promise<ApiAccount> {
  return authFetch<ApiAccount>(`/api/v1/budgets/${budgetId}/accounts/${accountId}`);
}

export async function createAccount(
  budgetId: string,
  payload: CreateAccountPayload,
): Promise<ApiAccount> {
  return authFetch<ApiAccount>(`/api/v1/budgets/${budgetId}/accounts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(
  budgetId: string,
  accountId: string,
  payload: UpdateAccountPayload,
): Promise<ApiAccount> {
  return authFetch<ApiAccount>(`/api/v1/budgets/${budgetId}/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function patchAccount(
  budgetId: string,
  accountId: string,
  payload: PatchAccountPayload,
): Promise<ApiAccount> {
  return authFetch<ApiAccount>(`/api/v1/budgets/${budgetId}/accounts/${accountId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(budgetId: string, accountId: string): Promise<void> {
  await authFetch<null>(`/api/v1/budgets/${budgetId}/accounts/${accountId}`, {
    method: "DELETE",
  });
}

export async function archiveAccount(budgetId: string, accountId: string): Promise<ApiAccount> {
  return authFetch<ApiAccount>(
    `/api/v1/budgets/${budgetId}/accounts/${accountId}/archive`,
    { method: "POST" },
  );
}

export async function unarchiveAccount(budgetId: string, accountId: string): Promise<ApiAccount> {
  return authFetch<ApiAccount>(
    `/api/v1/budgets/${budgetId}/accounts/${accountId}/unarchive`,
    { method: "POST" },
  );
}
