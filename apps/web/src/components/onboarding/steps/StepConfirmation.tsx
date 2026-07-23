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
import { PartyPopper } from "lucide-react";
import { StepCard } from "@/components/onboarding/StepCard";
import { getBudget } from "@/lib/api/budget";
import { listAccounts } from "@/lib/api/accounts";
import { listEnvelopes } from "@/lib/api/envelopes";
import { completeOnboarding } from "@/lib/api/onboarding";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useAuthStore } from "@/stores/auth.store";
import type { ApiBudget } from "@/lib/api/types";

export function StepConfirmation() {
  const router = useRouter();
  const budgetId = useOnboardingStore((s) => s.budgetId);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [budget, setBudget] = useState<ApiBudget | null>(null);
  const [accountCount, setAccountCount] = useState(0);
  const [envelopeCount, setEnvelopeCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!budgetId) return;
    Promise.all([getBudget(budgetId), listAccounts(budgetId), listEnvelopes(budgetId)]).then(
      ([b, accounts, envelopes]) => {
        setBudget(b);
        setAccountCount(accounts.length);
        setEnvelopeCount(envelopes.length);
      },
    );
  }, [budgetId]);

  async function handleFinish() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await completeOnboarding();
      // AppShell's gate reads user.onboarding_completed_at from the client
      // store, not a fresh fetch — patch it locally so the redirect to
      // /dashboard below doesn't bounce back into onboarding.
      if (user) setUser({ ...user, onboarding_completed_at: new Date().toISOString() });
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to finish setup");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepCard
      title="You're all set!"
      description="Here's a quick recap of what we set up together."
      onNext={handleFinish}
      nextLabel="Start budgeting"
      submitting={submitting}
      error={submitError}
    >
      <div className="flex items-center justify-center py-2">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(108,58,237,0.14)", border: "1px solid rgba(108,58,237,0.35)" }}
        >
          <PartyPopper size={28} className="text-[#8B5CF6]" />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-[#1E2B42] bg-[#0F1623] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#5A6A85]">Budget</span>
          <span className="font-medium text-white">{budget?.title ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#5A6A85]">Accounts</span>
          <span className="font-medium text-white">{accountCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#5A6A85]">Categories</span>
          <span className="font-medium text-white">{envelopeCount}</span>
        </div>
      </div>
    </StepCard>
  );
}
