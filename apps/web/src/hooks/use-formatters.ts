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

import { useMemo } from "react";
import { usePreferencesStore } from "@/stores/preferences.store";
import { getCurrency } from "@/lib/currency";
import { formatWithToken, toUTCDateOnly } from "@/lib/date-format";

/**
 * Reactive formatters that re-render when the user's display preferences
 * change. Prefer this over the plain functions in @/lib/utils on any
 * money/date-heavy surface (dashboard, transactions, accounts, envelopes) —
 * those functions read the preferences store at call time and only reflect
 * a change on the component's next render.
 */
export function useFormatters() {
  const currencyCode = usePreferencesStore((s) => s.currency);
  const dateFormat = usePreferencesStore((s) => s.dateFormat);

  return useMemo(() => {
    const { symbol, locale } = getCurrency(currencyCode);

    const formatCurrency = (amount: number): string => {
      const num = new Intl.NumberFormat(locale, {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(amount));
      return amount < 0 ? `${symbol} -${num}` : `${symbol} ${num}`;
    };

    const formatCurrencyCompact = (amount: number): string => {
      const formatted = Math.abs(amount).toLocaleString(locale);
      return amount < 0 ? `${symbol} -${formatted}` : `${symbol} ${formatted}`;
    };

    // Date-only value (e.g. a transaction date). Normalize to UTC — these carry no time
    // component, and reading local date parts could roll the calendar date over.
    const formatTableDate = (dateStr: string): string =>
      formatWithToken(dateFormat, toUTCDateOnly(new Date(dateStr)));

    const formatDate = (date: Date | string): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      return formatWithToken(dateFormat, d);
    };

    return { formatCurrency, formatCurrencyCompact, formatTableDate, formatDate, currencySymbol: symbol };
  }, [currencyCode, dateFormat]);
}
