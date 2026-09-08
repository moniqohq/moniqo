/** Mirrors docs/apis response shapes. Field names match the backend JSON contract verbatim. */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  msg: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  picture: string | null;
  last_login: string | null;
}

export interface Budget {
  id: string;
  title: string;
  notes: string | null;
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'LOAN';

export interface Account {
  id: string;
  budget_id: string;
  name: string;
  type: AccountType;
  balance: number;
  cleared_balance: number;
  institution: string | null;
  is_archived: boolean;
}

export interface BudgetEnvelope {
  id: string;
  budget_id: string;
  title: string;
  allocated_amt: number;
  spent_amt: number;
  description: string | null;
  is_archived: boolean;
}

export type TransactionStatus = 'uncleared' | 'cleared' | 'reconciled';

export interface Transaction {
  id: string;
  budget_id: string;
  account_id: string;
  transfer_account_id: string | null;
  budget_envelope_id: string | null;
  amount: number;
  date: string;
  status: TransactionStatus;
  /** Denormalized display fields the Home screen needs; hydrated by the data provider from the account/envelope/category joins the backend list endpoint returns. */
  description: string;
  category_label: string;
}

export interface DashboardSparklinePoint {
  month: string;
  income: number;
  expenses: number;
}

export interface DashboardStats {
  net_worth: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_savings: number;
  sparkline: DashboardSparklinePoint[];
}

export interface BudgetSummary {
  total_allocated: number;
  total_spent: number;
  month: string;
}
