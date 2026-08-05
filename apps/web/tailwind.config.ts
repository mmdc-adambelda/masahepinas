import type { Config } from 'tailwindcss';
import uiPreset from '@masahepinas/ui/tailwind-preset';

const config: Config = {
  presets: [uiPreset as Config],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
