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

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { TOTAL_STEPS } from "@/lib/onboarding/steps";
import { StepProfile } from "@/components/onboarding/steps/StepProfile";
import { StepBudget } from "@/components/onboarding/steps/StepBudget";
import { StepIncome } from "@/components/onboarding/steps/StepIncome";
import { StepAccounts } from "@/components/onboarding/steps/StepAccounts";
import { StepCategories } from "@/components/onboarding/steps/StepCategories";
import { StepAllocation } from "@/components/onboarding/steps/StepAllocation";
import { StepConfirmation } from "@/components/onboarding/steps/StepConfirmation";

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: StepProfile,
  2: StepBudget,
  3: StepIncome,
  4: StepAccounts,
  5: StepCategories,
  6: StepAllocation,
  7: StepConfirmation,
};

export default function OnboardingStepPage() {
  const params = useParams<{ step: string }>();
  const router = useRouter();
  const currentStep = useOnboardingStore((s) => s.currentStep);

  const requestedStep = Number(params.step);
  const isValid =
    Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= TOTAL_STEPS;
  // Allow navigating back to any completed step, or forward only up to the
  // furthest step the server says is unlocked — typing a later URL redirects
  // back rather than letting the user skip ahead.
  const allowed = isValid && requestedStep <= currentStep;

  useEffect(() => {
    if (!isValid || !allowed) {
      router.replace(`/onboarding/${Math.min(currentStep, TOTAL_STEPS)}`);
    }
  }, [isValid, allowed, currentStep, router]);

  if (!isValid || !allowed) return null;

  const StepComponent = STEP_COMPONENTS[requestedStep];
  return <StepComponent />;
}
