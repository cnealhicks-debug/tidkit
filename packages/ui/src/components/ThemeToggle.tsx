'use client';

/**
 * TidKit UI - Theme Toggle
 * Button to switch between light/dark modes
 */

import { cn } from '../utils';
import type { ThemeMode } from '../hooks/useTheme';

export interface ThemeToggleProps {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  onToggle: () => void;
  onSetMode?: (mode: ThemeMode) => void;
  showLabel?: boolean;
  showDropdown?: boolean;
  className?: string;
}

export function ThemeToggle({
  mode,
  resolvedTheme,
  onToggle,
  onSetMode,
  showLabel = false,
  showDropdown = false,
  className,
}: ThemeToggleProps) {
  const isDark = resolvedTheme === 'dark';

  if (showDropdown && onSetMode) {
    return (
      <div className={cn('relative', className)}>
        <select
          value={mode}
          onChange={(e) => onSetMode(e.target.value as ThemeMode)}
          className={cn(
            'appearance-none px-3 py-1.5 pr-8 text-sm rounded-lg border cursor-pointer',
            isDark
              ? 'bg-gray-800 border-gray-700 text-gray-200'
              : 'bg-white border-gray-200 text-gray-700'
          )}
        >
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
          <option value="system">💻 System</option>
        </select>
        <svg
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={cn(
        'p-2 rounded-lg transition-colors flex items-center gap-2',
        isDark
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
      {showLabel && (
        <span className="text-sm">{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}
