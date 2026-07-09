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

export type Role = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export type AccountType = "checking" | "savings" | "credit" | "cash" | "loan";

export type TransactionType = "expense" | "income" | "transfer";

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: Role;
}

export interface Budget {
  id: number;
  name: string;
  notes?: string;
  createdAt: string;
}

export interface Account {
  id: number;
  budgetId: number;
  name: string;
  type: AccountType;
  balance: number;
  clearedBalance: number;
  requiresRecon: boolean;
  isOnBudget: boolean;
  isImmutable: boolean;
  notes?: string;
  accountNumber?: string;
  institution?: string;
  lastReconciledAt?: string;
  isArchived: boolean;
  archivedAt?: string;
}

export interface BudgetEnvelope {
  id: number;
  budgetId: number;
  name: string;
  description?: string;
  allocated: number;
  spent: number;
  available: number;
  isOverspent: boolean;
}

export interface Transaction {
  id: number;
  budgetId: number;
  accountId: number;
  accountName: string;
  envelopeId?: number;
  envelopeName?: string;
  transferAccountId?: number;
  payee: string;
  amount: number;
  type: TransactionType;
  date: string;
  memo?: string;
  cleared: boolean;
}

export interface BudgetSummary {
  toBeBudgeted: number;
  totalAllocated: number;
  totalSpent: number;
  overspentEnvelopesCount: number;
}

export interface SavingsGoal {
  id: number;
  budgetId: number;
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
