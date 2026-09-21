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
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getCurrency } from "@/lib/currency";
import { formatWithToken, toUTCDateOnly } from "@/lib/date-format";
import { usePreferencesStore } from "@/stores/preferences.store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a monetary amount using the user's preferred display currency.
 * Reads the preferences store at call time rather than subscribing to it —
 * components that need to re-render live when the preference changes should
 * use the `useFormatters()` hook instead (see @/hooks/use-formatters).
 */
export function formatCurrency(amount: number): string {
  const { symbol, locale } = getCurrency(usePreferencesStore.getState().currency);
  const num = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return amount < 0 ? `${symbol} -${num}` : `${symbol} ${num}`;
}

export function formatTransactionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatCurrencyCompact(amount: number): string {
  const { symbol, locale } = getCurrency(usePreferencesStore.getState().currency);
  const formatted = Math.abs(amount).toLocaleString(locale);
  return amount < 0 ? `${symbol} -${formatted}` : `${symbol} ${formatted}`;
}

// Transaction dates are UTC-pinned calendar dates (e.g. "2026-03-01T00:00:00Z"), not
// timezone-aware instants. Normalize to UTC so the calendar date shown always matches the
// calendar date stored, regardless of the viewer's local timezone.
export function formatTableDate(dateStr: string): string {
  const token = usePreferencesStore.getState().dateFormat;
  return formatWithToken(token, toUTCDateOnly(new Date(dateStr)));
}

export function formatDate(
  date: Date | string,
  format: "short" | "medium" | "long" = "medium",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const { locale } = getCurrency(usePreferencesStore.getState().currency);
  const opts: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
  };
  return d.toLocaleDateString(locale, opts[format]);
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(d, "medium");
}

export function getAmountColor(amount: number): string {
  if (amount > 0) return "amount-positive";
  if (amount < 0) return "amount-negative";
  return "text-muted-foreground";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function classifyTransaction(amount: number): "income" | "expense" | "transfer" {
  if (amount > 0) return "income";
  if (amount < 0) return "expense";
  return "transfer";
}
