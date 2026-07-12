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

import { useQuery } from "@tanstack/react-query";
import { listAccounts, type AccountStatusParam } from "@/lib/api/accounts";
import { qk } from "@/lib/query-keys";
import type { Account, AccountType } from "@/types";
import type { ApiAccount } from "@/lib/api/types";

const TYPE_MAP: Record<string, AccountType> = {
  CHECKING: "checking",
  SAVINGS: "savings",
  CREDIT_CARD: "credit",
  CASH: "cash",
  LOAN: "loan",
};

export function apiAccountToUI(a: ApiAccount): Account {
  return {
    id: a.id,
    budgetId: a.budget_id,
    name: a.name,
    type: TYPE_MAP[a.type] ?? "checking",
    balance: a.balance,
    clearedBalance: a.cleared_balance,
    requiresRecon: a.requires_recon,
    isOnBudget: a.is_on_budget,
    isImmutable: a.is_immutable,
    notes: a.notes ?? undefined,
    accountNumber: a.account_number ?? undefined,
    institution: a.institution ?? undefined,
    lastReconciledAt: a.last_reconciled_at ?? undefined,
    isArchived: a.is_archived,
    archivedAt: a.archived_at ?? undefined,
  };
}

export function useAccounts(budgetId: number | null, status: AccountStatusParam = "active") {
  const query = useQuery({
    queryKey: [...qk.accounts(budgetId ?? -1), "list", status],
    queryFn: () => listAccounts(budgetId as number, status).then((raw) => raw.map(apiAccountToUI)),
    enabled: budgetId != null,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
