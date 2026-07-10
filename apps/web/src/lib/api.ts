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
import type { ApiListResponse, ApiResponse } from "./api-types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Array<{ field: string; message: string }>,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...init, headers });
  const body: ApiResponse<T> = await res.json();

  if (!res.ok) {
    const fields = (
      body as unknown as { data?: { fields?: Array<{ field: string; message: string }> } }
    ).data?.fields;
    throw new ApiError(res.status, body.msg, fields);
  }

  return body.data;
}

export async function apiFetchPaginated<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T[]; meta?: { page: number; page_size: number; total: number } }> {
  const token = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...init, headers });
  const body: ApiListResponse<T> = await res.json();

  if (!res.ok) {
    const fields = (
      body as unknown as { data?: { fields?: Array<{ field: string; message: string }> } }
    ).data?.fields;
    throw new ApiError(res.status, body.msg, fields);
  }

  return { data: body.data, meta: body.meta };
}
