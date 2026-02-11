'use client';

/**
 * TidKit UI - Shared Navigation Component
 * Consistent header across all TidKit apps
 */

import { useState, useEffect } from 'react';
import { cn } from '../utils';

export interface NavLink {
  href: string;
  label: string;
  active?: boolean;
  badge?: string;
}

export interface NavigationProps {
  currentApp?: 'home' | 'builder' | 'studio' | 'collection';
  user?: {
    name: string;
    email: string;
    image?: string;
  } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  className?: string;
}

// Development URLs - each app runs on its own port
const DEV_URLS: Record<string, string> = {
  '/': 'http://localhost:3000',
  '/builder': 'http://localhost:3001',
  '/studio': 'http://localhost:3002',
  '/collection': 'http://localhost:3000/collection',
};

// Production URLs - all apps under one domain
const PROD_URLS: Record<string, string> = {
  '/': '/',
  '/builder': '/builder',
  '/studio': '/studio',
  '/collection': '/collection',
};

export function Navigation({
  currentApp = 'home',
  user,
  onSignIn,
  onSignOut,
  theme,
  onThemeToggle,
  className,
}: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [urls, setUrls] = useState(PROD_URLS);

  // Update URLs on client side after hydration
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      setUrls(DEV_URLS);
    }
  }, []);

  const appToPath: Record<string, string> = {
    home: '/',
    builder: '/builder',
    studio: '/studio',
    collection: '/collection',
  };

  const APP_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/builder', label: 'Builder' },
    { href: '/studio', label: 'Studio', badge: 'Beta' },
    { href: '/collection', label: 'Collection' },
  ];

  return (
    <header className={cn('bg-white border-b border-gray-200', className)}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href={urls['/']}
            className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-tidkit-600 transition-colors"
          >
            <svg
              className="w-8 h-8 text-tidkit-600"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="4"
                y="8"
                width="24"
                height="20"
                rx="2"
                fill="currentColor"
                fillOpacity="0.2"
              />
              <path
                d="M4 10C4 8.89543 4.89543 8 6 8H26C27.1046 8 28 8.89543 28 10V12H4V10Z"
                fill="currentColor"
              />
              <rect x="8" y="16" width="6" height="8" rx="1" fill="currentColor" />
              <rect x="18" y="16" width="6" height="4" rx="1" fill="currentColor" />
            </svg>
            <span>TidKit</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {APP_LINKS.map((link) => {
              const isActive = appToPath[currentApp] === link.href;
              return (
                <a
                  key={link.href}
                  href={urls[link.href] || link.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-tidkit-50 text-tidkit-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                  {link.badge && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-sm text-gray-600">
                  {user.name || user.email}
                </span>
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-tidkit-100 text-tidkit-700 flex items-center justify-center text-sm font-medium">
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                )}
              </div>
            ) : (
              onSignIn && (
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 bg-tidkit-600 text-white text-sm font-medium rounded-lg hover:bg-tidkit-700 transition-colors"
                >
                  Sign In
                </button>
              )
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              {APP_LINKS.map((link) => {
                const isActive = appToPath[currentApp] === link.href;
                return (
                  <a
                    key={link.href}
                    href={urls[link.href] || link.href}
                    className={cn(
                      'px-4 py-3 rounded-lg text-sm font-medium',
                      isActive
                        ? 'bg-tidkit-50 text-tidkit-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {link.label}
                    {link.badge && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
