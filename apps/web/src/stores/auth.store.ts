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

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiUser } from "@/lib/api-types";

interface AuthStore {
  user: ApiUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: ApiUser, accessToken: string, refreshToken: string) => void;
  setUser: (user: ApiUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "moniqo-auth" },
  ),
);
