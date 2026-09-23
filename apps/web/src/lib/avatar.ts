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

import type { ApiUser } from "@/lib/api-types";

/**
 * Returns the URL to render for a user's avatar, or null when they have none.
 *
 * `user.picture` is a stable API URL (`/api/v1/users/{id}/picture`) that
 * never changes even after the underlying image is replaced or removed —
 * that's what makes it cacheable and safe to hardcode. The `version` param
 * (bump via `useAuthStore.bumpAvatarVersion`) exists precisely to defeat
 * that stability right after a mutation, so the browser doesn't keep
 * showing a cached, now-stale image.
 */
export function avatarSrc(
  user: Pick<ApiUser, "picture"> | null | undefined,
  version?: number,
): string | null {
  if (!user?.picture) return null;
  if (version === undefined) return user.picture;
  const separator = user.picture.includes("?") ? "&" : "?";
  return `${user.picture}${separator}v=${version}`;
}
