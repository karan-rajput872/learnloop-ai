/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        edu: {
          950: '#060913',
          900: '#0B1120',
          850: '#0F172A',
          800: '#151F34',
          700: '#1E293B',
          600: '#334155',
        },
        loop: {
          purple: '#A855F7',
          violet: '#8B5CF6',
          indigo: '#6366F1',
          blue: '#38BDF8',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
