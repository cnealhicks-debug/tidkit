/**
 * TidKit Auth - Type Definitions
 * Authentication and cloud storage types
 */

export type AuthProvider = 'apple' | 'google';

export type CloudProvider = 'icloud' | 'google-drive';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: AuthProvider;
  cloudProvider?: CloudProvider;
  createdAt: number;
  lastLoginAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CloudSyncState {
  isEnabled: boolean;
  provider: CloudProvider | null;
  lastSyncAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
}

export interface AuthConfig {
  appleClientId?: string;
  googleClientId?: string;
  redirectUri?: string;
}

/**
 * Synced item metadata for cloud storage
 */
export interface SyncedItem {
  id: string;
  name: string;
  type: 'texture' | 'building' | 'project';
  localPath?: string;
  cloudPath?: string;
  cloudId?: string;
  lastModified: number;
  lastSynced?: number;
  size: number;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cloud storage quota information
 */
export interface CloudQuota {
  used: number;
  total: number;
  available: number;
}
