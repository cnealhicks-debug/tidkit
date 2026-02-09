/**
 * TidKit Auth - Zustand Store
 * State management for authentication and cloud sync
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthProvider, CloudProvider, AuthState, CloudSyncState } from './types';

interface AuthStore extends AuthState, CloudSyncState {
  // Auth actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;

  // Cloud sync actions
  enableCloudSync: (provider: CloudProvider) => void;
  disableCloudSync: () => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  updateLastSync: () => void;
}

const STORAGE_KEY = 'tidkit-auth';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial auth state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Initial cloud sync state
      isEnabled: false,
      provider: null,
      lastSyncAt: null,
      isSyncing: false,
      syncError: null,

      // Auth actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          isEnabled: false,
          provider: null,
          lastSyncAt: null,
        }),

      // Cloud sync actions
      enableCloudSync: (provider) =>
        set({
          isEnabled: true,
          provider,
          syncError: null,
        }),

      disableCloudSync: () =>
        set({
          isEnabled: false,
          provider: null,
          lastSyncAt: null,
          syncError: null,
        }),

      setSyncing: (isSyncing) => set({ isSyncing }),

      setSyncError: (syncError) => set({ syncError, isSyncing: false }),

      updateLastSync: () => set({ lastSyncAt: Date.now(), isSyncing: false }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isEnabled: state.isEnabled,
        provider: state.provider,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
