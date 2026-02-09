'use client';

/**
 * TidKit UI - Side Panel
 * Slide-out panel that positions relative to the main control panel
 */

import { ReactNode, useEffect } from 'react';
import { cn } from '../utils';

export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Width of the panel */
  width?: 'sm' | 'md' | 'lg';
  /** Position offset from right (to account for control panel) */
  rightOffset?: number;
  /** Show backdrop overlay */
  showBackdrop?: boolean;
  className?: string;
}

const widthClasses = {
  sm: 'w-72',
  md: 'w-80',
  lg: 'w-96',
};

export function SidePanel({
  isOpen,
  onClose,
  title,
  children,
  width = 'md',
  rightOffset = 320, // Default to control panel width (80 * 4 = 320px)
  showBackdrop = false,
  className,
}: SidePanelProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-16 bottom-0 bg-white shadow-xl border-l border-gray-200 z-40',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-200',
          widthClasses[width],
          className
        )}
        style={{ right: rightOffset }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
