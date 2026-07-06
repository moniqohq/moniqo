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

import { apiFetch } from "./client";
import type { ApiBudget } from "./types";

export function listBudgets(): Promise<ApiBudget[]> {
  return apiFetch<ApiBudget[]>("/api/v1/budgets");
}

export function getBudget(id: number): Promise<ApiBudget> {
  return apiFetch<ApiBudget>(`/api/v1/budgets/${id}`);
}

export function createBudget(req: { title: string; notes?: string }): Promise<ApiBudget> {
  return apiFetch<ApiBudget>("/api/v1/budgets", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function patchBudget(
  id: number,
  req: Partial<{ title: string; notes: string | null }>,
): Promise<ApiBudget> {
  return apiFetch<ApiBudget>(`/api/v1/budgets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}

export function deleteBudget(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/budgets/${id}`, { method: "DELETE" });
}
