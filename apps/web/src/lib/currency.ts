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

// Single source of truth for supported display currencies. Must match the
// backend allowlist in apps/backend/internal/validator/preferences.go.
//
// Restricted to two-decimal currencies: internal/money.Amount on the backend
// hardcodes 2 decimal places for every stored value, so a zero- or
// three-decimal currency (e.g. JPY, KWD) would silently misrepresent amounts.

export interface CurrencyOption {
  code: string;
  symbol: string;
  locale: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", locale: "en-IN", label: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$", locale: "en-US", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro (€)" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "British Pound (£)" },
  { code: "AUD", symbol: "$", locale: "en-AU", label: "Australian Dollar ($)" },
  { code: "CAD", symbol: "$", locale: "en-CA", label: "Canadian Dollar ($)" },
  { code: "SGD", symbol: "$", locale: "en-SG", label: "Singapore Dollar ($)" },
];

export const DEFAULT_CURRENCY_CODE = "INR";

/** Looks up a currency by ISO-4217 code, falling back to INR for unknown/null codes. */
export function getCurrency(code: string | null | undefined): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
