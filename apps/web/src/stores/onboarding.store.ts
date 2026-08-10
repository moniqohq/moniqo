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
"use client";

import { create } from "zustand";
import type { ApiOnboardingProgress } from "@/lib/api/types";

interface OnboardingStore {
  hydrated: boolean;
  currentStep: number;
  completedSteps: number[];
  budgetId: number | null;
  hydrate: (progress: ApiOnboardingProgress) => void;
  markStepComplete: (step: number, budgetId?: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  hydrated: false,
  currentStep: 1,
  completedSteps: [],
  budgetId: null,

  hydrate: (progress) =>
    set({
      hydrated: true,
      currentStep: progress.current_step,
      completedSteps: progress.completed_steps,
      budgetId: progress.budget_id,
    }),

  markStepComplete: (step, budgetId) =>
    set((s) => ({
      currentStep: Math.max(s.currentStep, step + 1),
      completedSteps: s.completedSteps.includes(step)
        ? s.completedSteps
        : [...s.completedSteps, step],
      budgetId: budgetId ?? s.budgetId,
    })),

  reset: () => set({ hydrated: false, currentStep: 1, completedSteps: [], budgetId: null }),
}));
