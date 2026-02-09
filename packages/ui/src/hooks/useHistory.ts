/**
 * TidKit UI - History Hook
 * Undo/Redo functionality for any state
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseHistoryOptions<T> {
  maxHistory?: number;
  onChange?: (state: T) => void;
}

export interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  history: HistoryState<T>;
}

export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions<T> = {}
): UseHistoryReturn<T> {
  const { maxHistory = 50, onChange } = options;

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const isUndoingRef = useRef(false);

  // Set state with history tracking
  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const resolvedState =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(prev.present)
            : newState;

        // Don't add to history if state hasn't changed
        if (JSON.stringify(resolvedState) === JSON.stringify(prev.present)) {
          return prev;
        }

        const newPast = [...prev.past, prev.present].slice(-maxHistory);

        return {
          past: newPast,
          present: resolvedState,
          future: [], // Clear future on new action
        };
      });
    },
    [maxHistory]
  );

  // Undo action
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      isUndoingRef.current = true;

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // Redo action
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      isUndoingRef.current = true;

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  // Clear history
  const clear = useCallback(() => {
    setHistory((prev) => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  // Notify on change
  useEffect(() => {
    if (onChange && !isUndoingRef.current) {
      onChange(history.present);
    }
    isUndoingRef.current = false;
  }, [history.present, onChange]);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clear,
    history,
  };
}
