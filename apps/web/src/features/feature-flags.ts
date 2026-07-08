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

/**
 * Temporary, compile-time feature flags used to hide unfinished V2 features
 * from the V1 release. This is the single source of truth — no flag values
 * should exist anywhere else in the app.
 *
 * See FEATURE_FLAGS.md for how to add, enable, and permanently remove a flag.
 */
export const FeatureFlags = {
  reports: false,
  goals: false,
  recurringTransactions: false,
} as const;

export type FeatureName = keyof typeof FeatureFlags;

/** Returns whether a feature is currently enabled. */
export function isFeatureEnabled(feature: FeatureName): boolean {
  return FeatureFlags[feature];
}

/**
 * URL path prefixes owned by a flag. Only features with a dedicated route
 * need an entry here (used to block direct navigation to disabled routes).
 */
export const FEATURE_ROUTES: Record<string, FeatureName> = {
  "/reports": "reports",
  "/goals": "goals",
};

/** Path prefixes for features that are currently OFF (consumed by proxy.ts). */
export function disabledFeatureRoutes(): string[] {
  return Object.entries(FEATURE_ROUTES)
    .filter(([, flag]) => !isFeatureEnabled(flag))
    .map(([path]) => path);
}
