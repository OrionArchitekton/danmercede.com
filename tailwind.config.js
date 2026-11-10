/** @type {import('tailwindcss').Config} */
// Brand tokens retained through the explicit @config import in index.css.
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Logo pack: dan-mercede-logo-pack/brand-colors.txt (guarded by tests/brandContrast.test.ts).
        copper: {
          300: '#FFC08B', // Copper Light
          400: '#F0975A', // site-only step between Light and Mid; no logo pack value (open question in DESIGN.md)
          500: '#E68249', // Copper Mid, primary (matches the lockup)
          600: '#B95122', // Copper Dark
        },
        navy: {
          midnight: '#020B29', // Midnight Navy, the page background
          deep: '#07143A', // Deep Navy, for raised surfaces
        },
        void: '#020B29', // Midnight Navy (kept for existing references)
      },
    },
  },
  plugins: [],
};
