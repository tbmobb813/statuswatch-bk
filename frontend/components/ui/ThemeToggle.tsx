'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for preventing hydration mismatch
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-20 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-slate-700 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${
            effectiveTheme === 'light'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-50'
          }
        `}
        title="Light mode"
        aria-label="Switch to light mode"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${
            effectiveTheme === 'dark'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-50'
          }
        `}
        title="Dark mode"
        aria-label="Switch to dark mode"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${
            theme === 'system'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-50'
          }
        `}
        title="System preference"
        aria-label="Use system theme preference"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
}

// Simplified toggle (just light/dark)
export function ThemeToggleSimple() {
  const { effectiveTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for preventing hydration mismatch
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" />;
  }

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="
        p-2 rounded-lg
        bg-gray-200 dark:bg-slate-700
        text-gray-700 dark:text-slate-300
        hover:bg-gray-300 dark:hover:bg-slate-600
        transition-all duration-200
      "
      title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {effectiveTheme === 'dark' ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
