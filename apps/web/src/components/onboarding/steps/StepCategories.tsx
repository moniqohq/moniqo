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
import { Check } from "lucide-react";
import { StepCard } from "@/components/onboarding/StepCard";
import { createEnvelope, deleteEnvelope, listEnvelopes } from "@/lib/api/envelopes";
import type { ApiEnvelope } from "@/lib/api/types";
import { completeOnboardingStep } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { goToOnboardingStep } from "@/lib/onboarding/navigation";
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_GROUPS } from "@/lib/onboarding/default-categories";

export function StepCategories() {
  const router = useRouter();
  const budgetId = useOnboardingStore((s) => s.budgetId);
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);
  const [accepted, setAccepted] = useState<Set<string>>(
    () => new Set(DEFAULT_CATEGORIES.map((c) => c.title)),
  );
  const [existing, setExisting] = useState<ApiEnvelope[]>([]);
  const [loaded, setLoaded] = useState(() => !budgetId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!budgetId) return;
    let cancelled = false;
    listEnvelopes(budgetId, "active")
      .then((envelopes) => {
        if (cancelled) return;
        setExisting(envelopes);
        if (envelopes.length > 0) {
          setAccepted(new Set(envelopes.map((e) => e.title)));
        }
      })
      .catch(() => {
        // No prior envelopes to reconcile against — proceed with defaults.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  function toggle(title: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  async function handleNext() {
    if (!budgetId) {
      setSubmitError("Missing budget — please go back and create one first.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const existingByTitle = new Map(existing.map((e) => [e.title, e]));
      const chosen = DEFAULT_CATEGORIES.filter((c) => accepted.has(c.title));
      const chosenTitles = new Set(chosen.map((c) => c.title));

      for (const category of chosen) {
        if (existingByTitle.has(category.title)) continue;
        await createEnvelope(budgetId, {
          title: category.title,
          allocated_amt: 0,
          description: category.description,
        });
      }
      for (const envelope of existing) {
        if (!chosenTitles.has(envelope.title)) {
          await deleteEnvelope(budgetId, envelope.id);
        }
      }
      await completeOnboardingStep(5);
      markStepComplete(5);
      router.push("/onboarding/6");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create categories");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepCard
      title="Create your categories"
      description="Accept the defaults or uncheck anything you don't need — you can add more later."
      onBack={() => goToOnboardingStep(router, 4)}
      onNext={handleNext}
      submitting={submitting}
      error={submitError}
      nextDisabled={accepted.size === 0 || !loaded}
    >
      <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
        {DEFAULT_CATEGORY_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold tracking-wide text-[#5A6A85] uppercase">
              {group}
            </p>
            <div className="space-y-1.5">
              {DEFAULT_CATEGORIES.filter((c) => c.group === group).map((c) => {
                const checked = accepted.has(c.title);
                return (
                  <button
                    key={c.title}
                    type="button"
                    onClick={() => toggle(c.title)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 py-2.5 text-left transition-colors hover:border-[#2A3A54]"
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                        checked ? "border-[#6C3AED] bg-[#6C3AED]" : "border-[#1E2B42]"
                      }`}
                    >
                      {checked && <Check size={12} className="text-white" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">{c.title}</span>
                      <span className="block text-xs text-[#5A6A85]">{c.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </StepCard>
  );
}
