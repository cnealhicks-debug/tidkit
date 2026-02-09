/**
 * TidKit UI - Theme Hook
 * Dark/Light mode management with persistence
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'tidkit-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function useTheme(): ThemeContextValue {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize from storage
  useEffect(() => {
    const stored = getStoredTheme();
    setModeState(stored);

    const resolved = stored === 'system' ? getSystemTheme() : stored;
    setResolvedTheme(resolved);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (mode === 'system') {
        setResolvedTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  // Update resolved theme when mode changes
  useEffect(() => {
    const resolved = mode === 'system' ? getSystemTheme() : mode;
    setResolvedTheme(resolved);

    // Apply to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setMode]);

  return {
    mode,
    resolvedTheme,
    setMode,
    toggleTheme,
  };
}

// Context for sharing theme across components
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
