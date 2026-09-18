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

// Updates editable profile fields (name, email, ...). picture is
// server-managed and must never be sent here — see uploadAvatar/deleteAvatar.
export function updateProfile(
  userId: number,
  patch: { name?: string | null; email?: string },
): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// Uploads a new profile picture. The server sniffs the real content type and
// rejects anything outside its JPEG/PNG/WebP allowlist regardless of what
// `image` claims to be, so no client-side MIME check is required here.
export function uploadAvatar(userId: number, image: Blob): Promise<ApiUser> {
  const form = new FormData();
  form.append("file", image, "avatar");
  return apiFetch<ApiUser>(`/api/v1/users/${userId}/picture`, {
    method: "PUT",
    body: form,
  });
}

// Removes the user's profile picture (including an inherited OIDC picture).
// Idempotent — safe to call even if there's nothing to remove.
export function deleteAvatar(userId: number): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${userId}/picture`, { method: "DELETE" });
}
