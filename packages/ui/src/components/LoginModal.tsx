'use client';

/**
 * TidKit UI - Login Modal Component
 * OAuth login with Apple and Google
 */

import { useState } from 'react';
import { cn } from '../utils';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginWithApple: () => Promise<void>;
  onLoginWithGoogle: () => Promise<void>;
  className?: string;
}

export function LoginModal({
  isOpen,
  onClose,
  onLoginWithApple,
  onLoginWithGoogle,
  className,
}: LoginModalProps) {
  const [isLoading, setIsLoading] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAppleLogin = async () => {
    setIsLoading('apple');
    setError(null);
    try {
      await onLoginWithApple();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple login failed');
    } finally {
      setIsLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading('google');
    setError(null);
    try {
      await onLoginWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="relative px-6 pt-8 pb-4 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <svg
              className="w-12 h-12 text-tidkit-600"
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
          </div>

          <h2 className="text-xl font-semibold text-gray-900">Sign in to TidKit</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to sync your library across devices
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Apple Sign In */}
            <button
              onClick={handleAppleLogin}
              disabled={isLoading !== null}
              className={cn(
                'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                'bg-black text-white hover:bg-gray-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading === 'apple' ? (
                <LoadingSpinner className="w-5 h-5" />
              ) : (
                <AppleIcon className="w-5 h-5" />
              )}
              Continue with Apple
            </button>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading !== null}
              className={cn(
                'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading === 'google' ? (
                <LoadingSpinner className="w-5 h-5" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              Continue with Google
            </button>
          </div>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Why sign in?
            </p>
            <ul className="space-y-2">
              <BenefitItem icon="cloud">
                Sync textures & projects to iCloud or Google Drive
              </BenefitItem>
              <BenefitItem icon="devices">
                Access your library from any device
              </BenefitItem>
              <BenefitItem icon="backup">
                Automatic backups keep your work safe
              </BenefitItem>
            </ul>
          </div>

          {/* Terms */}
          <p className="mt-6 text-xs text-gray-400 text-center">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-tidkit-600 hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-tidkit-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Icons

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function BenefitItem({ icon, children }: { icon: string; children: React.ReactNode }) {
  const icons: Record<string, React.ReactNode> = {
    cloud: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    devices: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    backup: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  };

  return (
    <li className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-tidkit-500">{icons[icon]}</span>
      {children}
    </li>
  );
}
