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

import type { useRouter } from "next/navigation";
import { rewindOnboardingStep } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";

/**
 * Navigates the wizard back to `step`, rewinding server-side progress first
 * so `current_step`/`completed_steps` in the DB reflect the step being
 * revisited — otherwise resubmitting that step re-runs against stale
 * "already completed" state (e.g. duplicate-create errors).
 */
export function goToOnboardingStep(router: ReturnType<typeof useRouter>, step: number): void {
  rewindOnboardingStep(step)
    .then((progress) => useOnboardingStore.getState().hydrate(progress))
    .catch(() => {
      // Best-effort: still navigate locally even if the server sync fails.
    });
  router.push(`/onboarding/${step}`);
}