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
import { apiFetch, authFetch } from "@/lib/api-client";
import type { ApiAuthTokens, ApiUser } from "@/lib/api-types";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { getOnboardingProgress } from "@/lib/api/onboarding";
import { STEP_TITLES, TOTAL_STEPS } from "@/lib/onboarding/steps";

function parseUserIdFromToken(token: string): number {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return Number(payload.sub);
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const hydrate = useOnboardingStore((s) => s.hydrate);
  const [refreshedAuthReady, setRefreshedAuthReady] = useState(false);
  const authReady = Boolean(accessToken) || refreshedAuthReady;

  // Mirrors AppShell's silent-refresh-or-redirect gate — this route group is
  // a sibling of (app), not nested under it, so it needs its own auth check.
  useEffect(() => {
    if (accessToken) {
      if (!user) {
        try {
          const id = parseUserIdFromToken(accessToken);
          authFetch<ApiUser>(`/api/v1/users/${id}`)
            .then(setUser)
            .catch(() => {});
        } catch {
          // malformed token; authFetch will handle 401
        }
      }
      return;
    }

    apiFetch<ApiAuthTokens>("/api/v1/auth/refresh", { method: "POST", _retry: true })
      .then(({ access_token }) => {
        setAccessToken(access_token);
        setRefreshedAuthReady(true);
        if (!user) {
          const id = parseUserIdFromToken(access_token);
          authFetch<ApiUser>(`/api/v1/users/${id}`)
            .then(setUser)
            .catch(() => {});
        }
      })
      .catch(() => {
        clearAuth();
        router.push("/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authReady || hydrated) return;
    getOnboardingProgress()
      .then(hydrate)
      .catch(() => {});
  }, [authReady, hydrated, hydrate]);

  if (!authReady || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080C14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E2B42] border-t-[#6C3AED]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#080C14] px-4 py-10">
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

      <div className="mb-8 w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-xs text-[#5A6A85]">
          <span>
            Step {currentStep > TOTAL_STEPS ? TOTAL_STEPS : currentStep} of {TOTAL_STEPS}
          </span>
          <span>{STEP_TITLES[Math.min(currentStep, TOTAL_STEPS)]}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E2B42]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7C4AFF] to-[#6C3AED] transition-all duration-300"
            style={{ width: `${(Math.min(currentStep, TOTAL_STEPS) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}
