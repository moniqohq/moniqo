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

import type { QueryClient } from "@tanstack/react-query";

/**
 * Centralized React Query key factories.
 *
 * Every financial entity is scoped to a budget, so every key starts with its
 * domain followed by the numeric `budgetId`. React Query invalidation matches
 * by key prefix, so invalidating e.g. `["accounts", budgetId]` refreshes every
 * account query (list, raw, per-status) for that budget regardless of the
 * extra key segments a specific hook appends. Keep the `budgetId` type
 * consistent (always `number`) — a `"5"` vs `5` mismatch silently breaks
 * prefix matching.
 */
export const qk = {
  accounts: (budgetId: number) => ["accounts", budgetId] as const,
  envelopes: (budgetId: number) => ["envelopes", budgetId] as const,
  budgetSummary: (budgetId: number) => ["budget-summary", budgetId] as const,
  transactions: (budgetId: number) => ["transactions", budgetId] as const,
  dashboard: (budgetId: number) => ["dashboard", budgetId] as const,
  accountBalanceHistory: (budgetId: number) => ["account-balance-history", budgetId] as const,
  budgets: () => ["budgets"] as const,
  search: (budgetId: number, query: string) => ["search", budgetId, query] as const,
};

/**
 * Invalidate every budget-scoped query so all views reflect a mutation.
 *
 * A single financial write can ripple across domains — creating an account
 * seeds an opening-balance transaction and shifts net worth; a transaction
 * moves an account balance, an envelope's spent amount and the "to be
 * budgeted" figure at once. Rather than make each caller reason about the
 * blast radius, invalidate the whole budget. React Query only refetches
 * queries that are currently mounted (observed), so this stays cheap.
 */
export function invalidateBudgetData(queryClient: QueryClient, budgetId: number | null): void {
  if (budgetId == null) return;
  const keys = [
    qk.accounts(budgetId),
    qk.envelopes(budgetId),
    qk.budgetSummary(budgetId),
    qk.transactions(budgetId),
    qk.dashboard(budgetId),
    qk.accountBalanceHistory(budgetId),
  ];
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
