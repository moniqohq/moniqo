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

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StepCard } from "@/components/onboarding/StepCard";
import { budgetSchema, type BudgetFields } from "@/lib/onboarding/schemas";
import { createBudget, getBudget, patchBudget } from "@/lib/api/budget";
import { completeOnboardingStep } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useUIStore } from "@/stores/ui.store";
import { goToOnboardingStep } from "@/lib/onboarding/navigation";

export function StepBudget() {
  const router = useRouter();
  const budgetId = useOnboardingStore((s) => s.budgetId);
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFields>({ resolver: zodResolver(budgetSchema) });

  useEffect(() => {
    if (!budgetId) return;
    getBudget(budgetId)
      .then((budget) => reset({ title: budget.title, notes: budget.notes ?? "" }))
      .catch(() => {});
  }, [budgetId, reset]);

  async function onSubmit(data: BudgetFields) {
    setSubmitError(null);
    try {
      const budget = budgetId
        ? await patchBudget(budgetId, { title: data.title, notes: data.notes ?? null })
        : await createBudget({ title: data.title, notes: data.notes });
      setActiveBudget(budget.id);
      await completeOnboardingStep(2, budget.id);
      markStepComplete(2, budget.id);
      router.push("/onboarding/3");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create your budget");
    }
  }

  return (
    <StepCard
      title="Create your first budget"
      description="This is the financial universe you'll allocate money into. You can create more budgets later."
      onBack={() => goToOnboardingStep(router, 1)}
      onNext={handleSubmit(onSubmit)}
      submitting={isSubmitting}
      error={submitError}
    >
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#A8B4CC]">Budget name</label>
        <input
          {...register("title")}
          autoFocus
          placeholder="e.g. Household Budget"
          className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
        />
        {errors.title && <p className="text-xs text-[#FCA5A5]">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[#A8B4CC]">Notes (optional)</label>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder="Add a short description…"
          className="w-full resize-none rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 py-2.5 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
        />
      </div>
    </StepCard>
  );
}
