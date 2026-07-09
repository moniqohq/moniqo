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

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  msg: string;
};

export type ApiBudget = {
  id: number;
  title: string;
  notes: string | null;
  created_at: string;
};

export type ApiAccount = {
  id: number;
  budget_id: number;
  name: string;
  type: string;
  balance: number;
  cleared_balance: number;
  requires_recon: boolean;
  is_on_budget: boolean;
  is_immutable: boolean;
  notes: string | null;
  account_number: string | null;
  institution: string | null;
  last_reconciled_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiEnvelope = {
  id: number;
  budget_id: number;
  title: string;
  allocated_amt: number;
  spent_amt: number;
  is_overspent: boolean;
  description: string | null;
  created_at: string;
};

export type ApiTransactionStatus = "uncleared" | "cleared" | "reconciled";

export type ApiTransaction = {
  id: number;
  budget_id: number;
  account_id: number;
  transfer_account_id: number | null;
  budget_envelope_id: number | null;
  transfer_group_id: string | null;
  amount: number;
  date: string;
  memo: string | null;
  status: ApiTransactionStatus;
  created_at: string;
};

export type ApiBudgetSummary = {
  to_be_budgeted: number;
  total_allocated: number;
  total_spent: number;
  overspent_envelopes_count: number;
};

export type ApiSparklinePoint = {
  month: string;
  income: number;
  expenses: number;
};

export type ApiDashboardStats = {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  sparkline: ApiSparklinePoint[];
};
