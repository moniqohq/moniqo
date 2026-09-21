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

import { ApiError } from "@/lib/api-client";

/**
 * Maps an error thrown by an envelope create/update request into a field -> message
 * record, so the caller can render each message under its offending input instead of
 * a single generic banner.
 *
 * Returns an empty object when err carries no field errors (e.g. a 403/404/409, or a
 * non-ApiError) — callers should fall back to {@link envelopeErrorBanner} in that case.
 */
export function envelopeFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.fields || err.fields.length === 0) {
    return {};
  }
  const map: Record<string, string> = {};
  for (const { field, error } of err.fields) {
    map[field] = error;
  }
  return map;
}

/**
 * Returns the fallback banner message for an envelope request error: the API's own
 * message for an ApiError (used when there are no field-level errors to show inline,
 * e.g. 403/404/409 responses), or a generic message otherwise.
 */
export function envelopeErrorBanner(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  return "Unexpected error.";
}
