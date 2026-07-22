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

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import type { ApiUser, ApiListResponse, ApiBudget } from "@/lib/api-types";

function parseUserIdFromToken(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Number(payload.sub);
  } catch {
    throw new Error("invalid token");
  }
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveBudget = useUIStore((s) => s.setActiveBudget);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function completeLogin() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const accessToken = new URLSearchParams(hash).get("access_token");

      // Strip the token from the visible/history URL immediately — it must
      // never linger in the address bar or browser history.
      window.history.replaceState(null, "", window.location.pathname);

      if (!accessToken) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      try {
        const user = await apiFetch<ApiUser>(`/api/v1/users/${parseUserIdFromToken(accessToken)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setAuth(user, accessToken);

        try {
          const budgetsBody = await apiFetch<ApiListResponse<ApiBudget>>("/api/v1/budgets", {
            token: accessToken,
          });
          if (budgetsBody.data.length > 0) {
            setActiveBudget(budgetsBody.data[0].id);
          }
        } catch {
          // non-fatal: proceed to dashboard even if budget fetch fails
        }

        router.replace("/dashboard");
      } catch {
        router.replace("/login?error=oauth_failed");
      }
    }

    void completeLogin();
  }, [router, setAuth, setActiveBudget]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080C14]">
      <div className="flex flex-col items-center gap-3 text-[#5A6A85]">
        <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
