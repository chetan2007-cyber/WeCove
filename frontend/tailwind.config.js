/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        mocha: {
          DEFAULT: '#6F4E37', // Primary Mocha Brown
          dark: '#553B2A',
          darker: '#3E2A1E',
          light: '#8B6448',
          tint: '#F5EFEA',
          subtle: 'rgba(111, 78, 55, 0.08)',
          glow: 'rgba(111, 78, 55, 0.25)',
        },
        platinum: {
          DEFAULT: '#E5E4E2', // Platinum Silver
          light: '#F4F3F1',
          surface: '#EAE9E6',
          dark: '#D1CFCC',
          border: 'rgba(111, 78, 55, 0.12)',
        },
        lavender: {
          DEFAULT: '#E6E0F0', // Pale Lavender
          light: '#F5F1FA',
          soft: '#EFEBF6',
          dark: '#D0C4E4',
          border: '#D7CEE8',
        },
        warm: {
          white: '#FAF9F6',
          card: '#FFFFFF',
          cream: '#F5F3EF',
        },
        charcoal: {
          DEFAULT: '#1F1D1B',
          rich: '#171514',
          muted: '#57524D',
          soft: '#78716C',
          light: '#A8A29E',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(111, 78, 55, 0.04), 0 1px 2px 0 rgba(111, 78, 55, 0.02)',
        'card': '0 4px 20px -2px rgba(111, 78, 55, 0.08)',
        'elevated': '0 20px 40px -15px rgba(111, 78, 55, 0.12)',
        'mocha': '0 4px 14px 0 rgba(111, 78, 55, 0.25)',
        'lavender': '0 4px 16px 0 rgba(230, 224, 240, 0.5)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em',
        tight: '-0.015em',
      }
    },
  },
  plugins: [],
};
