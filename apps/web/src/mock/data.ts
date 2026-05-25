import type {
  Budget, Account, BudgetEnvelope, Transaction,
  SavingsGoal, AnalyticsSummary, CategorySpending, User,
} from '@/types'

export const mockUser: User = {
  id: 'u1',
  name: 'Saqib Abdul',
  username: 'saqib_a',
  email: 'saqib.abdul@veeam.com',
  role: 'OWNER',
}

export const mockBudgets: Budget[] = [
  {
    id: 'b1',
    name: 'Personal Budget',
    currency: 'INR',
    locale: 'en-IN',
    toBeBudgeted: 384000,
    totalAllocated: 186000,
    totalAccounts: 4,
    memberCount: 1,
    createdAt: '2024-01-01',
  },
  {
    id: 'b2',
    name: 'Household Budget',
    currency: 'INR',
    locale: 'en-IN',
    toBeBudgeted: 85000,
    totalAllocated: 62000,
    totalAccounts: 2,
    memberCount: 2,
    createdAt: '2024-03-15',
  },
]

export const mockAccounts: Account[] = [
  { id: 'a1', budgetId: 'b1', name: 'HDFC Checking',   type: 'checking',   balance: 458250, institution: 'HDFC Bank' },
  { id: 'a2', budgetId: 'b1', name: 'ICICI Savings',   type: 'savings',    balance: 125000, institution: 'ICICI Bank' },
  { id: 'a3', budgetId: 'b1', name: 'Axis Credit Card', type: 'credit',    balance: -18400,  institution: 'Axis Bank' },
  { id: 'a4', budgetId: 'b1', name: 'Cash Wallet',      type: 'cash',      balance: 4200 },
  { id: 'a5', budgetId: 'b2', name: 'SBI Joint Account', type: 'checking',  balance: 74000,  institution: 'SBI' },
]

export const mockEnvelopes: BudgetEnvelope[] = [
  { id: 'e1', budgetId: 'b1', name: 'Groceries',      icon: '🛒', color: '#6C3AED', allocated: 12000, spent: 7425, available: 4575,  monthlyBudget: 12000, groupName: 'Essentials' },
  { id: 'e2', budgetId: 'b1', name: 'Dining Out',     icon: '🍽', color: '#3B82F6', allocated: 8000,  spent: 5230, available: 2770,  monthlyBudget: 8000,  groupName: 'Essentials' },
  { id: 'e3', budgetId: 'b1', name: 'Transport',      icon: '🚗', color: '#F59E0B', allocated: 6000,  spent: 3890, available: 2110,  monthlyBudget: 6000,  groupName: 'Essentials' },
  { id: 'e4', budgetId: 'b1', name: 'Utilities',      icon: '⚡', color: '#22C55E', allocated: 5000,  spent: 4200, available: 800,   monthlyBudget: 5000,  groupName: 'Essentials' },
  { id: 'e5', budgetId: 'b1', name: 'Entertainment',  icon: '🎬', color: '#EC4899', allocated: 4000,  spent: 1240, available: 2760,  monthlyBudget: 4000,  groupName: 'Lifestyle' },
  { id: 'e6', budgetId: 'b1', name: 'Subscriptions',  icon: '📱', color: '#8B5CF6', allocated: 2500,  spent: 2490, available: 10,    monthlyBudget: 2500,  groupName: 'Lifestyle' },
  { id: 'e7', budgetId: 'b1', name: 'Health',         icon: '💊', color: '#14B8A6', allocated: 3000,  spent: 800,  available: 2200,  monthlyBudget: 3000,  groupName: 'Lifestyle' },
  { id: 'e8', budgetId: 'b1', name: 'Emergency Fund', icon: '🛡', color: '#F97316', allocated: 20000, spent: 0,    available: 20000, monthlyBudget: 20000, groupName: 'Savings' },
  { id: 'e9', budgetId: 'b1', name: 'Vacation Fund',  icon: '✈️', color: '#06B6D4', allocated: 15000, spent: 0,    available: 15000, monthlyBudget: 15000, groupName: 'Savings' },
]

export const mockTransactions: Transaction[] = [
  {
    id: 't1', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeId: 'e2', envelopeName: 'Food & Dining', envelopeIcon: '🍽', envelopeColor: '#F97316',
    payee: 'Starbucks Coffee', payeeColor: '#22C55E',
    amount: -650, type: 'expense', date: '2024-05-15', memo: 'Latte and snack',
    cleared: true, runningBalance: 458250,
  },
  {
    id: 't2', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeId: 'e3', envelopeName: 'Transportation', envelopeIcon: '🚌', envelopeColor: '#14B8A6',
    payee: 'Uber Ride', payeeColor: '#1A1A2E',
    amount: -2230, type: 'expense', date: '2024-05-15', memo: 'Airport drop',
    cleared: true, runningBalance: 458900,
  },
  {
    id: 't3', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeName: 'Income', envelopeIcon: '↑', envelopeColor: '#14B8A6',
    payee: 'Salary Deposit', payeeColor: '#F59E0B',
    amount: 450000, type: 'income', date: '2024-05-15', memo: 'May salary',
    cleared: true, runningBalance: 461130,
  },
  {
    id: 't4', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeName: 'Shopping', envelopeIcon: '🛍', envelopeColor: '#8B5CF6',
    payee: 'Amazon.co.jp', payeeColor: '#1E2B42',
    amount: -3980, type: 'expense', date: '2024-05-14', memo: 'Office supplies',
    cleared: true, runningBalance: 11130,
  },
  {
    id: 't5', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeName: 'Food & Dining', envelopeIcon: '🍽', envelopeColor: '#F97316',
    payee: '7-Eleven', payeeColor: '#EF4444',
    amount: -1240, type: 'expense', date: '2024-05-14', memo: 'Snacks and water',
    cleared: true, runningBalance: 15110,
  },
  {
    id: 't6', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeId: 'e5', envelopeName: 'Entertainment', envelopeIcon: '🎬', envelopeColor: '#8B5CF6',
    payee: 'Netflix', payeeColor: '#DC2626',
    amount: -1490, type: 'expense', date: '2024-05-13', memo: 'Monthly subscription',
    cleared: true, runningBalance: 16350,
  },
  {
    id: 't7', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank', accountSubLabel: 'Checking',
    envelopeName: 'Savings', envelopeIcon: '💰', envelopeColor: '#6C3AED',
    payee: 'Transfer to Savings', payeeColor: '#374151',
    amount: -20000, type: 'transfer', date: '2024-05-13', memo: 'Monthly savings',
    cleared: true, runningBalance: 17840,
  },
  {
    id: 't8', budgetId: 'b1', accountId: 'a2',
    accountName: 'ICICI Savings', accountInstitution: 'HDFC Savings', accountSubLabel: 'Savings',
    payee: 'Transfer from Savings', payeeColor: '#374151',
    amount: 20000, type: 'transfer', date: '2024-05-14', memo: 'Buffer transfer',
    cleared: true, runningBalance: 37840,
  },
  {
    id: 't9', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeId: 'e1', envelopeName: 'Food & Dining', envelopeIcon: '🍽', envelopeColor: '#F97316',
    payee: 'BigBasket', payeeColor: '#16A34A',
    amount: -2450, type: 'expense', date: '2024-05-12', memo: 'Groceries',
    cleared: true, runningBalance: 17840,
  },
  {
    id: 't10', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeName: 'Housing', envelopeIcon: '🏠', envelopeColor: '#EF4444',
    payee: 'Electricity Bill', payeeColor: '#4B5563',
    amount: -3250, type: 'expense', date: '2024-05-11', memo: 'BESCOM',
    cleared: true, runningBalance: 20290,
  },
  {
    id: 't11', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeName: 'Income', envelopeIcon: '↑', envelopeColor: '#14B8A6',
    payee: 'Freelance Income', payeeColor: '#F59E0B',
    amount: 75650, type: 'income', date: '2024-05-10', memo: 'Project payment',
    cleared: true, runningBalance: 23540,
  },
  {
    id: 't12', budgetId: 'b1', accountId: 'a1',
    accountName: 'HDFC Checking', accountInstitution: 'HDFC Bank',
    envelopeId: 'e3', envelopeName: 'Transportation', envelopeIcon: '🚌', envelopeColor: '#14B8A6',
    payee: 'Fuel Refill', payeeColor: '#4B5563',
    amount: -1850, type: 'expense', date: '2024-05-09', memo: 'Car fuel',
    cleared: true, runningBalance: -52110,
  },
]

export const mockSavingsGoals: SavingsGoal[] = [
  { id: 'g1', budgetId: 'b1', name: 'Europe Trip',     targetAmount: 200000, currentAmount: 85000,  targetDate: '2026-12-15', icon: '✈️', color: '#6C3AED' },
  { id: 'g2', budgetId: 'b1', name: 'New MacBook',     targetAmount: 160000, currentAmount: 112000, targetDate: '2026-08-01', icon: '💻', color: '#3B82F6' },
  { id: 'g3', budgetId: 'b1', name: 'Emergency Fund',  targetAmount: 300000, currentAmount: 150000, icon: '🛡', color: '#22C55E' },
  { id: 'g4', budgetId: 'b1', name: 'Wedding Fund',    targetAmount: 500000, currentAmount: 45000,  targetDate: '2027-02-14', icon: '💍', color: '#EC4899' },
]

export const mockAnalytics: AnalyticsSummary[] = [
  { month: 'Dec', income: 450000, expenses: 182000, savings: 268000, netWorth: 520000 },
  { month: 'Jan', income: 470000, expenses: 195000, savings: 275000, netWorth: 548000 },
  { month: 'Feb', income: 450000, expenses: 178000, savings: 272000, netWorth: 569000 },
  { month: 'Mar', income: 490000, expenses: 221000, savings: 269000, netWorth: 589000 },
  { month: 'Apr', income: 450000, expenses: 168000, savings: 282000, netWorth: 618000 },
  { month: 'May', income: 470000, expenses: 189000, savings: 281000, netWorth: 645000 },
]

export const mockCategorySpending: CategorySpending[] = [
  { category: 'Groceries',    amount: 7425,  budget: 12000, color: '#6C3AED', icon: '🛒' },
  { category: 'Dining Out',   amount: 5230,  budget: 8000,  color: '#3B82F6', icon: '🍽' },
  { category: 'Transport',    amount: 3890,  budget: 6000,  color: '#F59E0B', icon: '🚗' },
  { category: 'Utilities',    amount: 4200,  budget: 5000,  color: '#22C55E', icon: '⚡' },
  { category: 'Entertainment',amount: 1240,  budget: 4000,  color: '#EC4899', icon: '🎬' },
  { category: 'Health',       amount: 800,   budget: 3000,  color: '#14B8A6', icon: '💊' },
]
