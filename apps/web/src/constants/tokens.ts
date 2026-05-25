export const colors = {
  background: '#080C14',
  surface:    '#0F1623',
  surfaceAlt: '#131C2E',
  border:     '#1E2B42',
  primary:    '#6C3AED',
  primaryHover: '#7C4AFF',
  success:    '#22C55E',
  danger:     '#EF4444',
  warning:    '#F59E0B',
  textPrimary:  '#E8EEF8',
  textMuted:    '#5A6A85',
  textSecondary:'#A8B4CC',
} as const

export const spacing = {
  sidebarWidth: '220px',
  sidebarCollapsed: '64px',
  topbarHeight: '56px',
  pageMaxWidth: '1400px',
} as const

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const

export const transitions = {
  fast: '150ms ease',
  base: '200ms ease',
  slow: '300ms ease',
} as const

export const zIndex = {
  sidebar:  100,
  topbar:   110,
  modal:    200,
  toast:    300,
  tooltip:  400,
} as const
