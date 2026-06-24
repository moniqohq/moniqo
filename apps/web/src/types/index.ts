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

/* ── Core domain types (mock/UI layer only) ──────────── */

export type Role = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export type AccountType = "checking" | "savings" | "credit" | "cash" | "investment" | "loan";

export type TransactionType = "expense" | "income" | "transfer";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: Role;
}

export interface Budget {
  id: string;
  name: string;
  currency: string;
  locale: string;
  toBeBudgeted: number;
  overspent: number;
  totalAllocated: number;
  totalAccounts: number;
  memberCount: number;
  createdAt: string;
}

export interface Account {
  id: string;
  budgetId: string;
  name: string;
  type: AccountType;
  balance: number;
  icon?: string;
  institution?: string;
  lastSynced?: string;
  archived?: boolean;
}

export interface BudgetEnvelope {
  id: string;
  budgetId: string;
  name: string;
  icon?: string;
  color?: string;
  allocated: number;
  spent: number;
  available: number;
  monthlyBudget: number;
  groupName?: string;
}

export interface Transaction {
  id: string;
  budgetId: string;
  accountId: string;
  accountName: string;
  accountInstitution?: string;
  accountSubLabel?: string;
  envelopeId?: string;
  envelopeName?: string;
  envelopeIcon?: string;
  envelopeColor?: string;
  payee: string;
  payeeColor?: string;
  amount: number;
  type: TransactionType;
  date: string;
  memo?: string;
  cleared: boolean;
  runningBalance?: number;
}

export interface SavingsGoal {
  id: string;
  budgetId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon?: string;
  color?: string;
}

export interface AnalyticsSummary {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  netWorth: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  budget: number;
  color: string;
  icon: string;
}
