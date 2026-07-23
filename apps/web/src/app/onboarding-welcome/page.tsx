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

// Shown instead of the full setup wizard to a user who was added to an
// existing budget as a collaborator (steps 2-6 of the wizard are meaningless
// to them — a budget, accounts, and categories already exist). One screen:
// profile basics, then straight to the dashboard.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StepCard } from "@/components/onboarding/StepCard";
import { profileSchema, type ProfileFields } from "@/lib/onboarding/schemas";
import { updateOnboardingProfile, completeOnboarding } from "@/lib/api/onboarding";
import { useAuthStore } from "@/stores/auth.store";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "SGD"];

function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"];
  }
}

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timezones = useMemo(supportedTimezones, []);
  const detectedTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: { currency: "USD", timezone: detectedTz },
  });

  async function onSubmit(data: ProfileFields) {
    setSubmitError(null);
    try {
      const user = await updateOnboardingProfile(data);
      await completeOnboarding();
      // AppShell's gate reads user.onboarding_completed_at from the client
      // store — patch it locally so the redirect below doesn't bounce back
      // into onboarding before a fresh fetch would've picked it up.
      setUser({ ...user, onboarding_completed_at: new Date().toISOString() });
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save your profile");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080C14] px-4 py-10">
      <div className="mb-10 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-black text-white"
          style={{
            background: "linear-gradient(135deg, #7C4AFF 0%, #5B28D6 100%)",
            boxShadow: "0 0 20px rgba(108,58,237,0.55)",
          }}
        >
          M
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Moniqo</span>
      </div>

      <div className="w-full max-w-xl">
        <StepCard
          title="Welcome to the team"
          description="You've been added to a shared budget. Just a couple of quick basics before you dive in."
          onNext={handleSubmit(onSubmit)}
          nextLabel="Continue to dashboard"
          submitting={isSubmitting}
          error={submitError}
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#A8B4CC]">Name (optional)</label>
            <input
              {...register("name")}
              placeholder="Your name"
              className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 text-sm text-white placeholder-[#5A6A85] outline-none focus:border-[#6C3AED]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#A8B4CC]">Currency</label>
            <select
              {...register("currency")}
              className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 text-sm text-white outline-none focus:border-[#6C3AED]"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p className="text-xs text-[#FCA5A5]">{errors.currency.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#A8B4CC]">Timezone</label>
            <select
              {...register("timezone")}
              className="h-11 w-full rounded-xl border border-[#1E2B42] bg-[#0F1623] px-3.5 text-sm text-white outline-none focus:border-[#6C3AED]"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            {errors.timezone && (
              <p className="text-xs text-[#FCA5A5]">{errors.timezone.message}</p>
            )}
          </div>
        </StepCard>
      </div>
    </div>
  );
}
