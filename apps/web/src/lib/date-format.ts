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

// Single source of truth for supported display date-format tokens. Must
// match the backend allowlist (users_date_format_check /
// apps/backend/internal/validator/preferences.go).

export type DateFormatToken = "MMM DD, YYYY" | "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export const DEFAULT_DATE_FORMAT: DateFormatToken = "MMM DD, YYYY";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Reinterprets a UTC-pinned calendar date (e.g. "2026-03-01T00:00:00Z") as a local Date
 * carrying the same year/month/day, so formatWithToken's local getters don't roll the
 * calendar date over for viewers behind UTC.
 */
export function toUTCDateOnly(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Renders a date-only value using the given format token. */
export function formatWithToken(token: DateFormatToken, date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const mon = MONTH_ABBR[date.getMonth()];
  switch (token) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "MMM DD, YYYY":
    default:
      return `${mon} ${dd}, ${yyyy}`;
  }
}

export interface DateFormatOption {
  value: DateFormatToken;
  /** Rendering of today's date in this format, for use as a picker label. */
  preview: string;
}

/** Returns the supported date-format options, each labelled with today's date. */
export function dateFormatOptions(today: Date = new Date()): DateFormatOption[] {
  const tokens: DateFormatToken[] = ["MMM DD, YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
  return tokens.map((value) => ({ value, preview: formatWithToken(value, today) }));
}
