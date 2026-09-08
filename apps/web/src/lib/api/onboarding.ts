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

import { apiFetch } from "./client";
import type { ApiIncomeSource, ApiOnboardingProgress } from "./types";
import type { ApiUser } from "@/lib/api-types";

const base = "/api/v1/onboarding";

export function getOnboardingProgress(): Promise<ApiOnboardingProgress> {
  return apiFetch<ApiOnboardingProgress>(`${base}/progress`);
}

export function updateOnboardingProfile(req: {
  name?: string;
  currency: string;
  timezone: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>(`${base}/profile`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function saveOnboardingIncomeSources(
  sources: ApiIncomeSource[],
): Promise<ApiOnboardingProgress> {
  return apiFetch<ApiOnboardingProgress>(`${base}/income-sources`, {
    method: "PUT",
    body: JSON.stringify({ sources }),
  });
}

export function completeOnboardingStep(
  step: number,
  budgetId?: number,
): Promise<ApiOnboardingProgress> {
  return apiFetch<ApiOnboardingProgress>(`${base}/steps/${step}/complete`, {
    method: "POST",
    body: JSON.stringify(budgetId ? { budget_id: budgetId } : {}),
  });
}

export function rewindOnboardingStep(step: number): Promise<ApiOnboardingProgress> {
  return apiFetch<ApiOnboardingProgress>(`${base}/steps/${step}/back`, { method: "POST" });
}

export function completeOnboarding(): Promise<void> {
  return apiFetch<void>(`${base}/complete`, { method: "POST" });
}
