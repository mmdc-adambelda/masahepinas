/**
 * Design tokens shared by apps/web (via tailwind-preset.ts) and
 * apps/mobile (imported directly for style objects / a future NativeWind
 * config). Source of truth: docs/product-requirements.md §3 "Branding and
 * Visual Direction". Keep web and mobile visually identical by always
 * reading colors from here rather than hardcoding hex values per app.
 */

export const colors = {
  backgroundMain: '#07110C',
  backgroundSecondary: '#0D1B13',
  surfaceElevated: '#13261A',
  primaryGreen: '#49C96D',
  accentGreen: '#78E59A',
  mutedGreen: '#2E7D47',
  textMain: '#F4F8F5',
  textSecondary: '#A8B8AD',
  warning: '#F6C453',
  error: '#EF6B6B',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const typography = {
  fontFamily: {
    sans: 'InterVariable, Inter, system-ui, sans-serif',
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },
} as const;

export type ColorToken = keyof typeof colors;
