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
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "@/components/search/CommandPalette";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { apiFetch, authFetch } from "@/lib/api-client";
import type { ApiAuthTokens, ApiUser } from "@/lib/api-types";

interface AppShellProps {
  children: React.ReactNode;
}

function parseUserIdFromToken(token: string): number {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return Number(payload.sub);
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  // Global ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    if (accessToken) {
      // Token already in memory — fetch profile if missing (e.g. first load after login).
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

    // No access token in memory — page was reloaded or tab was reopened.
    // Attempt silent refresh via the HttpOnly cookie.
    apiFetch<ApiAuthTokens>("/api/v1/auth/refresh", {
      method: "POST",
      _retry: true, // skip the interceptor's own refresh attempt for this call
    })
      .then(({ access_token }) => {
        setAccessToken(access_token);
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
  }, []); // intentionally runs once on mount

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#080C14]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
