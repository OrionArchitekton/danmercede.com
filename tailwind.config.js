/** @type {import('tailwindcss').Config} */
// Bundled Tailwind config (W2) — replaces the production `cdn.tailwindcss.com`
// in-browser JIT compiler. Mirrors the inline `tailwind.config` that previously
// lived in index.html so the utility set and custom tokens are unchanged.
export default {
  content: ['./index.html', './index.tsx', './App.tsx', './constants.ts', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        copper: {
          300: '#E0B088',
          400: '#D99A6C',
          500: '#B87333', // Primary Copper
          600: '#9C622B',
        },
        void: '#020617', // Slate 950 essentially
      },
    },
  },
  plugins: [],
};
