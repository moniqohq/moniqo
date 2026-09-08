import type { Account, Budget, BudgetEnvelope, BudgetSummary, DashboardStats, Transaction, User } from '@/types/domain';
import type { HomeRepository } from './homeRepository';

const LATENCY_MS = 500;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

const MOCK_USER: User = {
  id: 'user_1',
  name: 'Jamie',
  username: 'jamie',
  email: 'jamie@example.com',
  picture: null,
  last_login: new Date().toISOString(),
};

const MOCK_BUDGET: Budget = {
  id: 'budget_1',
  title: "Jamie's Budget",
  notes: null,
};

// Account balances are the source of truth for total balance below — they
// intentionally sum to it rather than the dashboard inventing its own figure.
const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acct_checking',
    budget_id: MOCK_BUDGET.id,
    name: 'Checking',
    type: 'CHECKING',
    balance: 9750.5,
    cleared_balance: 9750.5,
    institution: 'HDFC Checking',
    is_archived: false,
  },
  {
    id: 'acct_savings',
    budget_id: MOCK_BUDGET.id,
    name: 'Savings',
    type: 'SAVINGS',
    balance: 3500,
    cleared_balance: 3500,
    institution: 'Emergency Fund',
    is_archived: false,
  },
  {
    id: 'acct_credit_card',
    budget_id: MOCK_BUDGET.id,
    name: 'Credit Card',
    type: 'CREDIT_CARD',
    balance: -1320,
    cleared_balance: -1320,
    institution: 'HDFC Credit Card',
    is_archived: false,
  },
  {
    id: 'acct_cash',
    budget_id: MOCK_BUDGET.id,
    name: 'Cash',
    type: 'CASH',
    balance: 500,
    cleared_balance: 500,
    institution: 'Wallet',
    is_archived: false,
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn_1',
    budget_id: MOCK_BUDGET.id,
    account_id: 'acct_checking',
    transfer_account_id: null,
    budget_envelope_id: 'env_groceries',
    amount: -85.4,
    date: '2026-03-15',
    status: 'cleared',
    description: 'Grocery Store',
    category_label: 'Groceries',
  },
  {
    id: 'txn_2',
    budget_id: MOCK_BUDGET.id,
    account_id: 'acct_credit_card',
    transfer_account_id: null,
    budget_envelope_id: 'env_dining',
    amount: -62,
    date: '2026-03-14',
    status: 'cleared',
    description: 'Dinner with Friends',
    category_label: 'Dining Out',
  },
  {
    id: 'txn_3',
    budget_id: MOCK_BUDGET.id,
    account_id: 'acct_checking',
    transfer_account_id: 'acct_savings',
    budget_envelope_id: null,
    amount: -500,
    date: '2026-03-12',
    status: 'cleared',
    description: 'Transfer to Savings',
    category_label: 'Transfer',
  },
  {
    id: 'txn_4',
    budget_id: MOCK_BUDGET.id,
    account_id: 'acct_checking',
    transfer_account_id: null,
    budget_envelope_id: null,
    amount: 3200,
    date: '2026-03-01',
    status: 'cleared',
    description: 'Salary Deposit',
    category_label: 'Income',
  },
];

const MOCK_ENVELOPES: BudgetEnvelope[] = [
  {
    id: 'env_housing',
    budget_id: MOCK_BUDGET.id,
    title: 'Housing',
    allocated_amt: 1800,
    spent_amt: 1800,
    description: null,
    is_archived: false,
  },
  {
    id: 'env_groceries',
    budget_id: MOCK_BUDGET.id,
    title: 'Groceries',
    allocated_amt: 500,
    spent_amt: 320,
    description: null,
    is_archived: false,
  },
];

const MOCK_SUMMARY: BudgetSummary = {
  total_allocated: 4850,
  total_spent: 2120.75,
  month: '2026-03',
};

const MOCK_STATS: DashboardStats = {
  net_worth: 12430.5,
  monthly_income: 3200,
  monthly_expenses: 2120.75,
  monthly_savings: 2.4,
  sparkline: [],
};

export const mockHomeRepository: HomeRepository = {
  getCurrentUser: () => delay(MOCK_USER),
  getActiveBudget: () => delay(MOCK_BUDGET),
  getDashboardStats: () => delay(MOCK_STATS),
  getBudgetSummary: () => delay(MOCK_SUMMARY),
  getAccounts: () => delay(MOCK_ACCOUNTS.filter((a) => !a.is_archived)),
  getRecentTransactions: (_budgetId, limit) => delay(MOCK_TRANSACTIONS.slice(0, limit)),
  getEnvelopes: () => delay(MOCK_ENVELOPES.filter((e) => !e.is_archived)),
};
