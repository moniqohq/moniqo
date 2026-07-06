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
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuthStore } from "@/stores/auth.store";
import { authFetch } from "@/lib/api-client";
import type { ApiUser } from "@/lib/api-types";

interface AppShellProps {
  children: React.ReactNode;
}

function parseUserIdFromToken(token: string): number {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return Number(payload.sub);
}

export function AppShell({ children }: AppShellProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!accessToken || user) return;
    try {
      const id = parseUserIdFromToken(accessToken);
      authFetch<ApiUser>(`/api/v1/users/${id}`).then(setUser).catch(() => {});
    } catch {
      // malformed token — clearAuth handled by authFetch on 401
    }
  }, [accessToken, user, setUser]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#080C14]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
