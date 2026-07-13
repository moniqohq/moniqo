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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui.store";
import { qk, invalidateBudgetData } from "@/lib/query-keys";
import { adaptAccount } from "@/lib/adapters/account.adapter";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  archiveAccount,
  unarchiveAccount,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "@/services/accounts.service";
import type { Account } from "@/types";

export function useAccounts(): {
  data: Account[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const budgetIdNum = useUIStore((s) => s.activeBudgetId);
  const result = useQuery({
    queryKey: [...qk.accounts(budgetIdNum ?? -1), "adapted"],
    queryFn: () => fetchAccounts(String(budgetIdNum)).then((raw) => raw.map(adaptAccount)),
    enabled: budgetIdNum != null,
  });

  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const budgetIdNum = useUIStore((s) => s.activeBudgetId);

  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => {
      if (budgetIdNum == null) {
        return Promise.reject(new Error("No active budget. Create a budget first."));
      }
      return createAccount(String(budgetIdNum), payload);
    },
    onSuccess: () => invalidateBudgetData(queryClient, budgetIdNum),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const budgetIdNum = useUIStore((s) => s.activeBudgetId);

  return useMutation({
    mutationFn: ({ accountId, payload }: { accountId: string; payload: UpdateAccountPayload }) =>
      updateAccount(String(budgetIdNum), accountId, payload),
    onSuccess: () => invalidateBudgetData(queryClient, budgetIdNum),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const budgetIdNum = useUIStore((s) => s.activeBudgetId);

  return useMutation({
    mutationFn: (accountId: string) => deleteAccount(String(budgetIdNum), accountId),
    onSuccess: () => invalidateBudgetData(queryClient, budgetIdNum),
  });
}

export function useArchiveAccount() {
  const queryClient = useQueryClient();
  const budgetIdNum = useUIStore((s) => s.activeBudgetId);

  return useMutation({
    mutationFn: (accountId: string) =>
      archiveAccount(String(budgetIdNum), accountId).then(adaptAccount),
    onSuccess: () => invalidateBudgetData(queryClient, budgetIdNum),
  });
}

export function useUnarchiveAccount() {
  const queryClient = useQueryClient();
  const budgetIdNum = useUIStore((s) => s.activeBudgetId);

  return useMutation({
    mutationFn: (accountId: string) =>
      unarchiveAccount(String(budgetIdNum), accountId).then(adaptAccount),
    onSuccess: () => invalidateBudgetData(queryClient, budgetIdNum),
  });
}
