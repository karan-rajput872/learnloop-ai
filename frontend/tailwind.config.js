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
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          border: '#E6E9EF',
          borderHover: '#D1D5DB',
          text: '#172033',
          muted: '#667085',
          subtle: '#F1F3F7',
          // Dark fallbacks if referenced
          950: '#0B1120',
          900: '#111827',
          850: '#1E293B',
          800: '#334155',
          700: '#475569',
          600: '#64748B',
        },
        brand: {
          indigo: '#5B5CE2',
          indigoHover: '#494AC8',
          indigoLight: '#EEF0FD',
          indigoBorder: '#C7D2FE',
          teal: '#0F9F91',
          tealLight: '#E6F7F5',
          amber: '#D99027',
          amberLight: '#FEF7ED',
          rose: '#D64545',
          roseLight: '#FEF2F2',
        },
        loop: {
          purple: '#5B5CE2',
          violet: '#6366F1',
          indigo: '#4F46E5',
          blue: '#2563EB',
          cyan: '#0891B2',
          emerald: '#0F9F91',
          amber: '#D99027',
          rose: '#D64545',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        elevated: '0 4px 6px -1px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        modal: '0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.08)',
      }
    },
  },
  plugins: [],
}
