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

export const colors = {
  background: "#080C14",
  surface: "#0F1623",
  surfaceAlt: "#131C2E",
  border: "#1E2B42",
  primary: "#6C3AED",
  primaryHover: "#7C4AFF",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  textPrimary: "#E8EEF8",
  textMuted: "#5A6A85",
  textSecondary: "#A8B4CC",
} as const;

export const spacing = {
  sidebarWidth: "220px",
  sidebarCollapsed: "64px",
  topbarHeight: "56px",
  pageMaxWidth: "1400px",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const transitions = {
  fast: "150ms ease",
  base: "200ms ease",
  slow: "300ms ease",
} as const;

export const zIndex = {
  sidebar: 100,
  topbar: 110,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;
