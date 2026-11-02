/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#0B0F17',
          900: '#101B2D',
          850: '#14233A',
          800: '#182A42',
          700: '#243B5B',
          600: '#334E77',
        },
        bento: {
          teal: '#38B7A5',
          tealHover: '#2EA191',
          tealGlow: 'rgba(56, 183, 165, 0.2)',
          blue: '#6C8FF5',
          blueGlow: 'rgba(108, 143, 245, 0.2)',
          purple: '#A855F7',
          purpleGlow: 'rgba(168, 85, 247, 0.2)',
          indigo: '#5B5CE2',
          indigoHover: '#494AC8',
        },
        edu: {
          bg: '#F5F7FB',
          surface: '#FFFFFF',
          border: '#E6E9EF',
          borderHover: '#D1D5DB',
          text: '#172033',
          muted: '#667085',
          subtle: '#F1F3F7',
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
          teal: '#38B7A5',
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
          emerald: '#38B7A5',
          amber: '#D99027',
          rose: '#D64545',
        }
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        elevated: '0 4px 6px -1px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        modal: '0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.08)',
        bento: '0 8px 24px -4px rgba(16, 27, 45, 0.08), 0 2px 6px -1px rgba(16, 27, 45, 0.04)',
        bentoDark: '0 12px 32px -4px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.3)',
        glowTeal: '0 0 20px -2px rgba(56, 183, 165, 0.35)',
        glowIndigo: '0 0 20px -2px rgba(91, 92, 226, 0.35)',
      }
    },
  },
  plugins: [],
};
