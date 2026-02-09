/**
 * TidKit UI - Keyboard Shortcuts Hook
 * Global keyboard shortcut handling
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  ignoreInputs?: boolean; // Ignore when focused on input/textarea
}

/**
 * Parse a shortcut string like "ctrl+z" or "cmd+shift+s"
 */
export function parseShortcutString(shortcut: string): Partial<KeyboardShortcut> {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop() || '';

  return {
    key,
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
  };
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcut>): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');

  if (shortcut.key) {
    const keyDisplay = shortcut.key.length === 1
      ? shortcut.key.toUpperCase()
      : shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
    parts.push(keyDisplay);
  }

  return parts.join(isMac ? '' : '+');
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, ignoreInputs = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if focused on input elements
      if (ignoreInputs) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          // Still allow certain shortcuts like Cmd+S
          const isModifierKey = event.ctrlKey || event.metaKey;
          if (!isModifierKey) return;
        }
      }

      const isMac = /Mac/.test(navigator.platform);
      const key = event.key.toLowerCase();

      for (const shortcut of shortcutsRef.current) {
        const matchesKey = shortcut.key.toLowerCase() === key;
        const matchesCtrl = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey || shortcut.meta;
        const matchesMeta = shortcut.meta ? event.metaKey : !event.metaKey || shortcut.ctrl;
        const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;

        // On Mac, treat Cmd as primary modifier; on Windows/Linux, treat Ctrl as primary
        const matchesPrimaryModifier = isMac
          ? (shortcut.meta || shortcut.ctrl) ? event.metaKey : !event.metaKey
          : (shortcut.ctrl || shortcut.meta) ? event.ctrlKey : !event.ctrlKey;

        if (matchesKey && matchesPrimaryModifier && matchesShift && matchesAlt) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [enabled, ignoreInputs]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common shortcuts for TidKit apps
 */
export const commonShortcuts = {
  save: { key: 's', ctrl: true, meta: true },
  undo: { key: 'z', ctrl: true, meta: true },
  redo: { key: 'z', ctrl: true, meta: true, shift: true },
  redoAlt: { key: 'y', ctrl: true, meta: true },
  delete: { key: 'backspace' },
  deleteAlt: { key: 'delete' },
  escape: { key: 'escape' },
  selectAll: { key: 'a', ctrl: true, meta: true },
  copy: { key: 'c', ctrl: true, meta: true },
  paste: { key: 'v', ctrl: true, meta: true },
  cut: { key: 'x', ctrl: true, meta: true },
  newItem: { key: 'n', ctrl: true, meta: true },
  export: { key: 'e', ctrl: true, meta: true },
  zoomIn: { key: '=', ctrl: true, meta: true },
  zoomOut: { key: '-', ctrl: true, meta: true },
  zoomReset: { key: '0', ctrl: true, meta: true },
};
