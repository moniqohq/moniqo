import type { Account, Budget, BudgetEnvelope, BudgetSummary, DashboardStats, Transaction, User } from '@/types/domain';

/**
 * Boundary between the Home screen and its data source. Swap `mockHomeRepository`
 * for an implementation backed by @moniqo/sdk once mobile auth + API base URL
 * config land — the UI/hooks layer never changes.
 */
export interface HomeRepository {
  getCurrentUser(): Promise<User>;
  getActiveBudget(): Promise<Budget>;
  getDashboardStats(budgetId: string): Promise<DashboardStats>;
  getBudgetSummary(budgetId: string): Promise<BudgetSummary>;
  getAccounts(budgetId: string): Promise<Account[]>;
  getRecentTransactions(budgetId: string, limit: number): Promise<Transaction[]>;
  getEnvelopes(budgetId: string): Promise<BudgetEnvelope[]>;
}
