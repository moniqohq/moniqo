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

export type FieldError = { field: string; error: string };

type ApiSuccess<T> = { success: true; data: T; msg: string };
type ApiFailure = { success: false; data: { fields?: FieldError[] } | null; msg: string };
type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    useAuthStore.getState().clearAuth();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const envelope: ApiEnvelope<T> = await res.json();

  if (!envelope.success) {
    throw new ApiError(res.status, envelope.msg, envelope.data?.fields);
  }

  return envelope.data;
}

export function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken ?? undefined;
  return apiFetch<T>(path, { ...options, token });
}
