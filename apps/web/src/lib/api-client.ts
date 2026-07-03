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

import { useAuthStore } from "@/stores/auth.store";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  msg: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; page_size: number; total: number };
  msg: string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (res.status === 401) {
    useAuthStore.getState().clearToken();
    throw new Error("Session expired. Please log in again.");
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.msg ?? `Request failed with status ${res.status}`);
  }

  return body as T;
}

export function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token ?? undefined;
  return apiFetch<T>(path, { ...options, token });
}
