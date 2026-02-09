'use client';

/**
 * TidKit UI - User Menu Component
 * Dropdown menu for signed-in users with sync status
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils';

export interface UserMenuProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    provider?: 'apple' | 'google';
  };
  syncStatus?: {
    enabled: boolean;
    provider: 'icloud' | 'google-drive' | null;
    lastSyncAt: number | null;
    isSyncing: boolean;
  };
  onSignOut: () => void;
  onSyncNow?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function UserMenu({
  user,
  syncStatus,
  onSignOut,
  onSyncNow,
  onOpenSettings,
  className,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format last sync time
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const providerLabel = syncStatus?.provider === 'icloud' ? 'iCloud' :
                        syncStatus?.provider === 'google-drive' ? 'Google Drive' : null;

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-tidkit-100 text-tidkit-700 flex items-center justify-center text-sm font-medium">
            {(user.name || user.email || 'U')[0].toUpperCase()}
          </div>
        )}

        {/* Sync indicator */}
        {syncStatus?.enabled && (
          <div className={cn(
            'w-2 h-2 rounded-full',
            syncStatus.isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
          )} />
        )}

        <svg
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-tidkit-100 text-tidkit-700 flex items-center justify-center text-lg font-medium">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
              {user.provider && (
                <div className="flex-shrink-0">
                  {user.provider === 'apple' ? (
                    <AppleIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <GoogleIcon className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sync status */}
          {syncStatus && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Cloud Sync
                </span>
                {syncStatus.enabled && providerLabel && (
                  <span className="text-xs text-gray-500">
                    {providerLabel}
                  </span>
                )}
              </div>

              {syncStatus.enabled ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {syncStatus.isSyncing ? (
                      <>
                        <LoadingSpinner className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-blue-600">Syncing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          Last synced {formatLastSync(syncStatus.lastSyncAt)}
                        </span>
                      </>
                    )}
                  </div>
                  {onSyncNow && !syncStatus.isSyncing && (
                    <button
                      onClick={() => {
                        onSyncNow();
                        setIsOpen(false);
                      }}
                      className="text-xs text-tidkit-600 hover:text-tidkit-700 font-medium"
                    >
                      Sync now
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-500">Cloud sync not enabled</span>
                </div>
              )}
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            )}

            <button
              onClick={() => {
                onSignOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
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
