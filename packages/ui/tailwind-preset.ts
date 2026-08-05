import { colors, radius } from './tokens';
import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset so apps/web's theme always matches packages/ui/tokens.ts.
 * Usage in apps/web/tailwind.config.ts: `presets: [require('@masahepinas/ui/tailwind-preset')]`
 */
const preset: Pick<Config, 'darkMode' | 'theme'> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: colors.backgroundMain,
          secondary: colors.backgroundSecondary,
        },
        surface: {
          elevated: colors.surfaceElevated,
        },
        brand: {
          DEFAULT: colors.primaryGreen,
          accent: colors.accentGreen,
          muted: colors.mutedGreen,
        },
        foreground: {
          DEFAULT: colors.textMain,
          secondary: colors.textSecondary,
        },
        warning: colors.warning,
        danger: colors.error,
      },
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
      },
    },
  },
};

export default preset;
