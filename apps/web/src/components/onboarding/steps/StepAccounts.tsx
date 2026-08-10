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
import { Plus, Trash2, Check } from "lucide-react";
import { StepCard } from "@/components/onboarding/StepCard";
import { createAccount } from "@/lib/api/accounts";
import { completeOnboardingStep } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";

interface DraftAccount {
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "LOAN";
  initial_balance: number;
}

const ACCOUNT_TYPES: DraftAccount["type"][] = [
  "CHECKING",
  "SAVINGS",
  "CREDIT_CARD",
  "CASH",
  "LOAN",
];

export function StepAccounts() {
  const router = useRouter();
  const budgetId = useOnboardingStore((s) => s.budgetId);
  const markStepComplete = useOnboardingStore((s) => s.markStepComplete);
  const [drafts, setDrafts] = useState<DraftAccount[]>([
    { name: "", type: "CHECKING", initial_balance: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(index: number, patch: Partial<DraftAccount>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, { name: "", type: "CHECKING", initial_balance: 0 }]);
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleNext() {
    if (!budgetId) {
      setSubmitError("Missing budget — please go back and create one first.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const pending = drafts.filter((d) => d.name.trim().length > 0);
      for (const draft of pending) {
        await createAccount(budgetId, {
          name: draft.name.trim(),
          type: draft.type,
          requires_recon: true,
          initial_balance: draft.initial_balance,
        });
      }
      await completeOnboardingStep(4);
      markStepComplete(4);
      router.push("/onboarding/5");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create accounts");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepCard
      title="Set up your accounts"
      description="Add the bank, cash, or credit card accounts you want to track. You need at least one."
      onBack={() => router.push("/onboarding/3")}
      onNext={handleNext}
      submitting={submitting}
      error={submitError}
      nextDisabled={!drafts.some((d) => d.name.trim().length > 0)}
    >
      <div className="space-y-3">
        {drafts.map((draft, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              value={draft.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="e.g. Checking Account"
              className="h-11 flex-1 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
            />
            <select
              value={draft.type}
              onChange={(e) => update(i, { type: e.target.value as DraftAccount["type"] })}
              className="h-11 w-36 flex-shrink-0 rounded-xl border border-[#1E2B42] bg-[#0F1623] px-2 text-sm text-white outline-none focus:border-[#6C3AED]"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
            <div className="relative w-28 flex-shrink-0">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#5A6A85]">
                #
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={draft.initial_balance || ""}
                onChange={(e) =>
                  update(i, { initial_balance: Number(e.target.value.replace(/[^0-9.]/g, "")) })
                }
                placeholder="0.00"
                className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] pr-3 pl-7 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
              />
            </div>
            <button
              type="button"
              onClick={() => removeDraft(i)}
              disabled={drafts.length === 1}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#5A6A85] transition-colors hover:bg-[#131C2E] hover:text-[#F87171] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Remove account"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDraft}
        className="flex items-center gap-1.5 text-sm font-medium text-[#8B5CF6] hover:text-[#A78BFA]"
      >
        <Plus size={14} /> Add another account
      </button>

      <p className="flex items-center gap-1.5 text-xs text-[#5A6A85]">
        <Check size={12} /> An opening balance transaction is created automatically for each
        account.
      </p>
    </StepCard>
  );
}
