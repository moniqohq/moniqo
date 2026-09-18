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
"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth.store";
import { avatarSrc } from "@/lib/avatar";
import { getInitials, cn } from "@/lib/utils";
import type { ApiUser } from "@/lib/api-types";

interface UserAvatarProps {
  user?: Pick<ApiUser, "name" | "username" | "picture"> | null;
  /**
   * Explicit source override, e.g. a local blob: URL preview while an
   * upload is in flight. When omitted, the source is derived from
   * `user.picture` plus the shared avatarVersion (bumped on every
   * upload/removal so the Topbar and Settings stay in sync).
   */
  src?: string | null;
  size?: number;
  className?: string;
}

/**
 * Renders a user's avatar image, or a gradient initials circle when there is
 * no picture (or the image fails to load — e.g. a stale cached 404).
 */
export function UserAvatar({ user, src, size = 36, className }: UserAvatarProps) {
  const avatarVersion = useAuthStore((s) => s.avatarVersion);
  const [failed, setFailed] = useState(false);

  const resolvedSrc = src !== undefined ? src : avatarSrc(user, avatarVersion);

  // Reset the broken-image fallback whenever the source changes, e.g. after
  // a fresh upload replaces a previously-404ing picture. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass —
  // see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevSrc, setPrevSrc] = useState(resolvedSrc);
  if (resolvedSrc !== prevSrc) {
    setPrevSrc(resolvedSrc);
    setFailed(false);
  }

  if (resolvedSrc && !failed) {
    return (
      <Image
        src={resolvedSrc}
        alt="Avatar"
        width={size}
        height={size}
        unoptimized
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3AED] to-[#4F46E5] font-bold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
    >
      {getInitials(user?.name ?? user?.username ?? "?")}
    </div>
  );
}
