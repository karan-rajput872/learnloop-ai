import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { isDark, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-slate-800/80 text-amber-300 hover:bg-slate-700/80 border border-slate-700'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
        } ${className}`}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative inline-flex items-center gap-1.5 p-1 rounded-full transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-slate-800/90 border border-slate-700/80 text-slate-400'
          : 'bg-slate-100 border border-slate-200 text-slate-500'
      } ${className}`}
    >
      <span
        className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${
          !isDark
            ? 'bg-white text-amber-500 shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </span>
      <span
        className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 ${
          isDark
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </span>
    </button>
  );
};

