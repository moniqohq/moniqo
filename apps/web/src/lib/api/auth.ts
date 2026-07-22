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

import { authFetch } from "@/lib/api-client";

export async function logout(): Promise<void> {
  // Sends the Bearer access token; the server clears the HttpOnly refresh cookie.
  await authFetch<null>("/api/v1/auth/logout", { method: "POST" });
}

export interface ApiIdentity {
  provider: "google" | "apple" | "facebook";
  linked_at: string;
}

export function listIdentities(): Promise<ApiIdentity[]> {
  return authFetch<ApiIdentity[]>("/api/v1/auth/identities");
}

// Begins the link flow. `POST /api/v1/auth/link/:provider` requires a Bearer
// JWT, which a plain navigation can't send — so this submits a same-origin
// form POST to our own /api/oidc/link/:provider route, which attaches the
// token server-side and turns the backend's redirect into a real top-level
// navigation to the identity provider.
export function linkProvider(provider: string, accessToken: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/oidc/link/${encodeURIComponent(provider)}`;
  form.style.display = "none";

  const tokenInput = document.createElement("input");
  tokenInput.type = "hidden";
  tokenInput.name = "token";
  tokenInput.value = accessToken;
  form.appendChild(tokenInput);

  document.body.appendChild(form);
  form.submit();
}

export async function unlinkProvider(provider: string): Promise<void> {
  await authFetch<null>(`/api/v1/auth/link/${provider}`, { method: "DELETE" });
}
