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
          950: '#101B2D', // Main Dark Background (Clean deep navy, NOT pure black)
          900: '#14233A',
          850: '#182A42', // Primary Dark Surface
          800: '#20344E', // Secondary Dark Surface
          700: '#243B5B', // Subtle Navy Borders
          600: '#334E77',
          text: '#F1F5FB',
          muted: '#A8B7CC',
        },
        academic: {
          bgLight: '#F5F7FB',
          surfaceLight: '#FFFFFF',
          secondaryLight: '#EDF2F8',
          textLight: '#17243A',
          mutedLight: '#64748B',
          brandLight: '#243B63',
          bgDark: '#101B2D',
          surfaceDark: '#182A42',
          secondaryDark: '#20344E',
          textDark: '#F1F5FB',
          mutedDark: '#A8B7CC',
          teal: '#38B7A5',
          blue: '#6C8FF5',
          borderLight: '#E2E8F0',
          borderDark: '#243B5B',
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
          secondary: '#EDF2F8',
          border: '#E6E9EF',
          borderHover: '#D1D5DB',
          text: '#17243A',
          muted: '#64748B',
          brand: '#243B63',
          teal: '#38B7A5',
          blue: '#6C8FF5',
          subtle: '#F1F3F7',
          950: '#101B2D',
          900: '#14233A',
          850: '#182A42',
          800: '#20344E',
          700: '#243B5B',
          600: '#334E77',
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
      },
      transitionTimingFunction: {
        'expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fluid': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      transitionDuration: {
        'micro': '150ms',
        'standard': '250ms',
        'reveal': '500ms',
        'glide': '1200ms',
      }
    },
  },
  plugins: [],
};
