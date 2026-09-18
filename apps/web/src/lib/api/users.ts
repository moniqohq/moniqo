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

// Changes the authenticated user's password via the PATCH /users/{id}
// "special case" contract (docs/apis/01-user-api.md). The server invalidates
// every existing session as part of this call, so a successful response means
// the caller's own tokens are revoked too — the caller must sign out locally.
export function changePassword(
  userId: number,
  req: { current_password: string; new_password: string },
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(req),
  });
}
