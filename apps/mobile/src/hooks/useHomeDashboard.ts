import { useEffect } from 'react';
import { homeRepository } from '@/data';
import { useSessionStore } from '@/store/useSessionStore';
import { useAsync } from './useAsync';

const RECENT_TRANSACTIONS_LIMIT = 4;

/**
 * Orchestrates every Home screen data need. Each section fetches
 * independently so one failing request (e.g. transactions) doesn't take
 * down sections that already loaded successfully.
 */
export function useHomeDashboard() {
  const user = useSessionStore((s) => s.user);
  const activeBudget = useSessionStore((s) => s.activeBudget);
  const setUser = useSessionStore((s) => s.setUser);
  const setActiveBudget = useSessionStore((s) => s.setActiveBudget);

  // Bootstraps session state until real auth/budget-selection flows exist.
  useEffect(() => {
    if (!user) homeRepository.getCurrentUser().then(setUser);
    if (!activeBudget) homeRepository.getActiveBudget().then(setActiveBudget);
  }, [user, activeBudget, setUser, setActiveBudget]);

  const budgetId = activeBudget?.id ?? null;

  const summary = useAsync(() => {
    if (!budgetId) return null;
    return homeRepository.getBudgetSummary(budgetId);
  }, [budgetId]);

  const stats = useAsync(() => {
    if (!budgetId) return null;
    return homeRepository.getDashboardStats(budgetId);
  }, [budgetId]);

  const accounts = useAsync(() => {
    if (!budgetId) return null;
    return homeRepository.getAccounts(budgetId);
  }, [budgetId]);

  const transactions = useAsync(() => {
    if (!budgetId) return null;
    return homeRepository.getRecentTransactions(budgetId, RECENT_TRANSACTIONS_LIMIT);
  }, [budgetId]);

  const envelopes = useAsync(() => {
    if (!budgetId) return null;
    return homeRepository.getEnvelopes(budgetId);
  }, [budgetId]);

  return { user, activeBudget, summary, stats, accounts, transactions, envelopes };
}
