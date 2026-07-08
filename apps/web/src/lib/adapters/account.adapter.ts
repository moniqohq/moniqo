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

import type { Account, AccountType } from "@/types";

export type ApiAccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "LOAN";

export interface ApiAccount {
  id: number;
  budget_id: number;
  name: string;
  type: ApiAccountType;
  balance: number;
  cleared_balance: number;
  requires_recon: boolean;
  is_on_budget: boolean;
  is_immutable: boolean;
  notes: string | null;
  account_number: string | null;
  last_reconciled_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

export const API_TO_UI: Record<ApiAccountType, AccountType> = {
  CHECKING: "checking",
  SAVINGS: "savings",
  CREDIT_CARD: "credit",
  CASH: "cash",
  LOAN: "loan",
};

export const UI_TO_API: Record<AccountType, ApiAccountType> = {
  checking: "CHECKING",
  savings: "SAVINGS",
  credit: "CREDIT_CARD",
  cash: "CASH",
  loan: "LOAN",
};

export function adaptAccount(raw: ApiAccount): Account {
  return {
    id: raw.id,
    budgetId: raw.budget_id,
    name: raw.name,
    type: API_TO_UI[raw.type],
    balance: raw.balance,
    clearedBalance: raw.cleared_balance,
    requiresRecon: raw.requires_recon,
    isOnBudget: raw.is_on_budget,
    isImmutable: raw.is_immutable,
    notes: raw.notes ?? undefined,
    accountNumber: raw.account_number ?? undefined,
    lastReconciledAt: raw.last_reconciled_at ?? undefined,
    isArchived: raw.is_archived,
    archivedAt: raw.archived_at ?? undefined,
  };
}
