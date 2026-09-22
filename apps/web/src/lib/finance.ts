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
import type { Account } from "@/types";

export type NetWorthBreakdown = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

/**
 * Computes the assets/liabilities/net-worth breakdown for a set of accounts.
 *
 * Mirrors the Accounts page summary (AccountsView.tsx): archived accounts are
 * excluded, assets are checking + cash + savings balances, and liabilities are
 * the negative portion of credit-card balances. This matches the backend's
 * per-month net worth figure (account_service.go: cash + savings - creditDebt).
 *
 * Note: loan accounts are not currently counted as liabilities here, matching
 * the existing Accounts page behavior.
 */
export function computeNetWorth(accounts: Account[]): NetWorthBreakdown {
  const active = accounts.filter((a) => !a.isArchived);

  const cashAndSavings = active.filter(
    (a) => a.type === "checking" || a.type === "cash" || a.type === "savings",
  );
  const totalAssets = cashAndSavings.reduce((s, a) => s + a.balance, 0);

  const creditAccounts = active.filter((a) => a.type === "credit");
  const totalLiabilities = Math.abs(
    creditAccounts.reduce((s, a) => s + Math.min(0, a.balance), 0),
  );

  const netWorth = totalAssets - totalLiabilities;

  return { totalAssets, totalLiabilities, netWorth };
}
