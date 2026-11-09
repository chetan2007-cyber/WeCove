/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#08090C',
          charcoal: '#101216',
          surface: '#171920',
          elevated: '#1F222B',
          border: '#272B36',
          muted: '#8A909E',
          subtle: '#B5BAC7',
          light: '#F8F9FA',
          lightSurface: '#FFFFFF',
          lightMuted: '#6B7280',
          lightBorder: '#E5E7EB',
          lime: '#CCFF00', // Electric Acid Lime
          limeHover: '#BCE800',
          limeMuted: 'rgba(204, 255, 0, 0.12)',
          limeGlow: 'rgba(204, 255, 0, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Geist', 'Inter', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.15)',
        'elevated': '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
        'lime-glow': '0 0 25px -5px rgba(204, 255, 0, 0.35)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
        tight: '-0.015em',
      }
    },
  },
  plugins: [],
};
