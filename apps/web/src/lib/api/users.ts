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
import type { ApiUser } from "@/lib/api-types";

// Permanently soft-deletes the authenticated user's account. Requires the
// current password for re-authentication; the backend rejects OIDC-only
// accounts (409) and accounts that solely own a shared budget (409).
export async function deleteAccount(userId: number, currentPassword: string): Promise<void> {
  await apiFetch<null>(`/api/v1/users/${userId}`, {
    method: "DELETE",
    body: JSON.stringify({ current_password: currentPassword }),
  });
}

export function getUser(id: number): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${id}`);
}

export interface PatchUserRequest {
  name?: string | null;
  email?: string;
  picture?: string;
  currency?: string;
  timezone?: string;
  date_format?: string;
  current_password?: string;
  new_password?: string;
}

export function patchUser(id: number, req: PatchUserRequest): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}
