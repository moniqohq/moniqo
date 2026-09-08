import { create } from 'zustand';
import type { Budget, User } from '@/types/domain';

interface SessionState {
  user: User | null;
  activeBudget: Budget | null;
  setUser: (user: User) => void;
  setActiveBudget: (budget: Budget) => void;
}

/**
 * Holds the authenticated user and the single active budget the rest of the
 * app reads from. Per the domain model, a screen must never read financial
 * data for more than one budget at a time — this is the one source of truth
 * for "which budget" every hook below scopes its requests to.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  activeBudget: null,
  setUser: (user) => set({ user }),
  setActiveBudget: (budget) => set({ activeBudget: budget }),
}));
