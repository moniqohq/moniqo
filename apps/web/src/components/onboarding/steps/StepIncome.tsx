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

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { StepCard } from "@/components/onboarding/StepCard";
import { saveOnboardingIncomeSources } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";
import type { ApiIncomeSource } from "@/lib/api/types";

const FREQUENCIES: { value: ApiIncomeSource["frequency"]; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "one_time", label: "One-time" },
];

export function StepIncome() {
  const router = useRouter();
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);
  const [sources, setSources] = useState<ApiIncomeSource[]>([
    { name: "", amount_amt: 0, frequency: "monthly" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateSource(index: number, patch: Partial<ApiIncomeSource>) {
    setSources((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSource() {
    setSources((prev) => [...prev, { name: "", amount_amt: 0, frequency: "monthly" }]);
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleNext() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const valid = sources.filter((s) => s.name.trim().length > 0);
      await saveOnboardingIncomeSources(valid);
      markStepComplete(3);
      router.push("/onboarding/4");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save income sources");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await saveOnboardingIncomeSources([]);
      markStepComplete(3);
      router.push("/onboarding/4");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to continue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepCard
      title="What income do you expect?"
      description="This is just a guide for allocating money later — it isn't tracked as a transaction. You can skip this."
      onBack={() => router.push("/onboarding/2")}
      onNext={handleNext}
      submitting={submitting}
      error={submitError}
    >
      <div className="space-y-3">
        {sources.map((source, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              value={source.name}
              onChange={(e) => updateSource(i, { name: e.target.value })}
              placeholder="e.g. Salary"
              className="h-11 flex-1 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
            />
            <div className="relative w-32 flex-shrink-0">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#5A6A85]">
                #
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={source.amount_amt || ""}
                onChange={(e) =>
                  updateSource(i, { amount_amt: Number(e.target.value.replace(/[^0-9.]/g, "")) })
                }
                placeholder="0.00"
                className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] pr-3 pl-7 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
              />
            </div>
            <select
              value={source.frequency}
              onChange={(e) => updateSource(i, { frequency: e.target.value })}
              className="h-11 w-32 flex-shrink-0 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-2 text-sm text-white outline-none focus:border-[#6C3AED]"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeSource(i)}
              disabled={sources.length === 1}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-[#F87171] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Remove income source"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSource}
        className="flex items-center gap-1.5 text-sm font-medium text-[#8B5CF6] hover:text-[#A78BFA]"
      >
        <Plus size={14} /> Add another income source
      </button>

      <button
        type="button"
        onClick={handleSkip}
        disabled={submitting}
        className="block text-sm text-[#5A6A85] hover:text-[#A8B4CC]"
      >
        Skip this step
      </button>
    </StepCard>
  );
}
