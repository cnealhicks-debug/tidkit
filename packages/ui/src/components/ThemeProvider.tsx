'use client';

/**
 * TidKit UI - Theme Provider
 * Provides theme context to all child components
 */

import { ReactNode } from 'react';
import { ThemeContext, useTheme } from '../hooks/useTheme';

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const theme = useTheme();

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
