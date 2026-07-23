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

// Framework-agnostic Zod schemas for the onboarding wizard's step forms.
// Kept free of React/Next imports so this file can move into
// packages/validation verbatim once desktop/mobile exist.

import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().max(100).optional(),
  currency: z.string().length(3, "Select a currency"),
  timezone: z.string().min(1, "Select a timezone"),
});
export type ProfileFields = z.infer<typeof profileSchema>;

export const budgetSchema = z.object({
  title: z.string().trim().min(3, "Must be at least 3 characters").max(100),
  notes: z.string().trim().max(500).optional(),
});
export type BudgetFields = z.infer<typeof budgetSchema>;

export const incomeSourceSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  amount_amt: z.coerce.number().min(0, "Must be zero or more"),
  frequency: z.enum(["weekly", "biweekly", "monthly", "one_time"]),
});
export type IncomeSourceFields = z.infer<typeof incomeSourceSchema>;

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT_CARD", "CASH", "LOAN"]),
  initial_balance: z.coerce.number().default(0),
});
export type AccountFields = z.infer<typeof accountSchema>;

export const categorySchema = z.object({
  title: z.string().trim().min(3, "Must be at least 3 characters").max(80),
  group: z.string(),
});
export type CategoryFields = z.infer<typeof categorySchema>;
