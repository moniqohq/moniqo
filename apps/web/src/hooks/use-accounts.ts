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

import { useEffect, useState, useCallback } from "react";
import { listAccounts } from "@/lib/api/accounts";
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
    lastReconciledAt: a.last_reconciled_at ?? undefined,
  };
}

export function useAccounts(budgetId: number | null) {
  const [data, setData] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (budgetId == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const raw = await listAccounts(budgetId);
      setData(raw.map(apiAccountToUI));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
