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
        copper: {
          300: '#FFC08B', // pack Copper Highlight
          400: '#F0975A',
          500: '#E68249', // pack Copper Mid — primary (matches the lockup)
          600: '#C2632C',
        },
        void: '#020617', // Slate 950 essentially
      },
    },
  },
  plugins: [],
};
