/**
 * Mirrors the CSS custom properties in apps/web/src/app/globals.css so the
 * mobile app shares Moniqo's dark navy + purple visual language.
 */
export const colors = {
  background: '#080c14',
  card: '#0f1623',
  cardElevated: '#0d1525',
  popover: '#131c2e',
  primary: '#6c3aed',
  primaryLight: '#8b5cf6',
  primaryForeground: '#ffffff',
  secondary: '#161f30',
  secondaryForeground: '#a8b4cc',
  muted: '#111827',
  mutedForeground: '#5a6a85',
  accent: '#1e2b42',
  accentForeground: '#e8eef8',
  destructive: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  border: '#1e2b42',
  input: '#1a2438',
  ring: '#6c3aed',
  foreground: '#e8eef8',
  sidebar: '#0a0e1a',
  primaryGlow: 'rgba(108, 58, 237, 0.55)',
  primaryTint: 'rgba(108, 58, 237, 0.15)',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
