/* ── Core domain types (mock/UI layer only) ──────────── */

export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment'

export type TransactionType = 'expense' | 'income' | 'transfer'

export interface User {
  id: string
  name: string
  username: string
  email: string
  avatarUrl?: string
  role: Role
}

export interface Budget {
  id: string
  name: string
  currency: string
  locale: string
  toBeBudgeted: number
  totalAllocated: number
  totalAccounts: number
  memberCount: number
  createdAt: string
}

export interface Account {
  id: string
  budgetId: string
  name: string
  type: AccountType
  balance: number
  icon?: string
  institution?: string
  lastSynced?: string
}

export interface BudgetEnvelope {
  id: string
  budgetId: string
  name: string
  icon?: string
  color?: string
  allocated: number
  spent: number
  available: number
  monthlyBudget: number
  groupName?: string
}

export interface Transaction {
  id: string
  budgetId: string
  accountId: string
  accountName: string
  accountInstitution?: string
  accountSubLabel?: string
  envelopeId?: string
  envelopeName?: string
  envelopeIcon?: string
  envelopeColor?: string
  payee: string
  payeeColor?: string
  amount: number
  type: TransactionType
  date: string
  memo?: string
  cleared: boolean
  runningBalance?: number
}

export interface SavingsGoal {
  id: string
  budgetId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  icon?: string
  color?: string
}

export interface AnalyticsSummary {
  month: string
  income: number
  expenses: number
  savings: number
  netWorth: number
}

export interface CategorySpending {
  category: string
  amount: number
  budget: number
  color: string
  icon: string
}
