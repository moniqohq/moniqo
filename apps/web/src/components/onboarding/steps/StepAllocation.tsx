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
import { StepCard } from "@/components/onboarding/StepCard";
import { listEnvelopes, getBudgetSummary, patchEnvelope } from "@/lib/api/envelopes";
import { completeOnboardingStep } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { goToOnboardingStep } from "@/lib/onboarding/navigation";
import type { ApiEnvelope } from "@/lib/api/types";

export function StepAllocation() {
  const router = useRouter();
  const budgetId = useOnboardingStore((s) => s.budgetId);
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);
  const [envelopes, setEnvelopes] = useState<ApiEnvelope[]>([]);
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [toBeBudgeted, setToBeBudgeted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!budgetId) return;
    Promise.all([listEnvelopes(budgetId), getBudgetSummary(budgetId)])
      .then(([envs, summary]) => {
        setEnvelopes(envs);
        setToBeBudgeted(summary.to_be_budgeted);
      })
      .finally(() => setLoading(false));
  }, [budgetId]);

  const allocatedSoFar = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const remaining = toBeBudgeted - allocatedSoFar;

  async function handleNext() {
    if (!budgetId) {
      setSubmitError("Missing budget — please go back and create one first.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      for (const env of envelopes) {
        const amount = allocations[env.id];
        if (amount !== undefined && amount !== env.allocated_amt) {
          await patchEnvelope(budgetId, env.id, { allocated_amt: amount });
        }
      }
      await completeOnboardingStep(6);
      markStepComplete(6);
      router.push("/onboarding/7");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save allocations");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <StepCard title="Give every dollar a job" hideNext>
        <p className="text-sm text-[#5A6A85]">Loading your categories…</p>
      </StepCard>
    );
  }

  return (
    <StepCard
      title="Give every dollar a job"
      description="Assign the money currently in your accounts to your categories until nothing is left unassigned."
      onBack={() => goToOnboardingStep(router, 5)}
      onNext={handleNext}
      submitting={submitting}
      error={submitError}
    >
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: remaining < 0 ? "rgba(248,113,113,0.4)" : "rgba(108,58,237,0.35)",
          background: remaining < 0 ? "rgba(248,113,113,0.08)" : "rgba(108,58,237,0.08)",
        }}
      >
        <p className="text-xs text-[#A8B4CC]">To be budgeted</p>
        <p
          className={`text-2xl font-bold tabular-nums ${remaining < 0 ? "text-[#F87171]" : "text-white"}`}
        >
          {remaining.toFixed(2)}
        </p>
      </div>

      {envelopes.length === 0 ? (
        <p className="text-sm text-[#5A6A85]">
          No categories yet — you can allocate later once you&apos;ve added some.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {envelopes.map((env) => (
            <div key={env.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white">{env.title}</span>
              <div className="relative w-32 flex-shrink-0">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#5A6A85]">
                  #
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={allocations[env.id] ?? env.allocated_amt ?? ""}
                  onChange={(e) =>
                    setAllocations((prev) => ({
                      ...prev,
                      [env.id]: Number(e.target.value.replace(/[^0-9.]/g, "")),
                    }))
                  }
                  placeholder="0.00"
                  className="h-10 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] pr-3 pl-7 text-sm text-white outline-none focus:border-[#6C3AED]"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </StepCard>
  );
}
