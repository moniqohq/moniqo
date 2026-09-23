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
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency";
import { DEFAULT_DATE_FORMAT, type DateFormatToken } from "@/lib/date-format";

interface PreferencesStore {
  currency: string;
  dateFormat: DateFormatToken;
  timezone: string | null;
  /** Overwrites all three preferences at once, e.g. after fetching the user profile. */
  setPreferences: (prefs: {
    currency?: string | null;
    dateFormat?: string | null;
    timezone?: string | null;
  }) => void;
}

/**
 * Client-side mirror of the user's display preferences (currency, date
 * format, timezone). Hydrated from the authenticated user's profile
 * (see AppShell) and persisted so a reload doesn't flash the defaults before
 * the profile round-trips. The server (users.currency / date_format /
 * timezone) remains the source of truth.
 */
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY_CODE,
      dateFormat: DEFAULT_DATE_FORMAT,
      timezone: null,

      setPreferences: (prefs) =>
        set((state) => ({
          currency: prefs.currency ?? state.currency,
          dateFormat: (prefs.dateFormat as DateFormatToken | undefined) ?? state.dateFormat,
          timezone: prefs.timezone !== undefined ? prefs.timezone : state.timezone,
        })),
    }),
    { name: "moniqo-preferences" },
  ),
);
