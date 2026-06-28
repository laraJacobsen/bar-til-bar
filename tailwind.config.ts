import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef2f2',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        accent: '#8b5cf6',
        neon: '#22c55e',
      },
      boxShadow: {
        glow: '0 0 30px rgba(244, 63, 94, 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config;
