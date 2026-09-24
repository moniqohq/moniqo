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
import type { ApiUser, EmailChangeStatus } from "@/lib/api-types";

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

// Updates editable profile fields. picture is server-managed and must never
// be sent here — see uploadAvatar/deleteAvatar. email is likewise excluded:
// it is read-only on this endpoint (server rejects it with a 400) — changing
// it requires the OTP-verified flow below.
export function updateProfile(userId: number, patch: { name?: string | null }): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// Starts a verified email change: sends a 6-digit code to new_email and,
// best-effort, a "change requested" notice to the current address.
// current_password is required unless the account has no password
// credential (see ApiUser.has_password).
export function requestEmailChange(
  userId: number,
  req: { new_email: string; current_password?: string },
): Promise<EmailChangeStatus> {
  return apiFetch<EmailChangeStatus>(`/api/v1/users/${userId}/email-change`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// Completes a verified email change. Returns the full updated user on
// success — unlike changePassword, this does not revoke the caller's session.
export function verifyEmailChange(userId: number, code: string): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/v1/users/${userId}/email-change/verify`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// Cancels the user's pending email-change request, if any. Idempotent.
export function cancelEmailChange(userId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/users/${userId}/email-change`, { method: "DELETE" });
}

// Fetches the current email-change status, so a client can re-open the
// verification dialog after a page refresh.
export function getEmailChangeStatus(userId: number): Promise<EmailChangeStatus> {
  return apiFetch<EmailChangeStatus>(`/api/v1/users/${userId}/email-change`);
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
