/**
 * TidKit Auth Package
 * Authentication and cloud sync for TidKit suite
 *
 * Supports two modes:
 * 1. Server-side: NextAuth.js with Prisma adapter (for SSR/API routes)
 * 2. Client-side: Direct OAuth with popup flow (for SPA/static builds)
 */

// =============================================================================
// Server-side (NextAuth.js)
// =============================================================================

export { authOptions } from './config';
export { getProviders, GoogleProvider, AppleProvider, EmailProvider } from './providers';

// Re-export common NextAuth utilities
export {
  getServerSession,
  type Session,
} from 'next-auth';

/**
 * Helper to get the current user's session on the server
 */
import { getServerSession as getNextAuthServerSession } from 'next-auth';
import { authOptions } from './config';

export async function getCurrentUser() {
  const session = await getNextAuthServerSession(authOptions);
  return session?.user;
}

/**
 * Helper to require authentication
 * Throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// =============================================================================
// Client-side (Direct OAuth)
// =============================================================================

// Types
export type {
  AuthProvider,
  CloudProvider,
  User,
  AuthState,
  CloudSyncState,
  SyncedItem,
  AuthConfig,
  CloudQuota,
} from './types';

// Store
export { useAuthStore } from './store';

// OAuth
export {
  configureAuth,
  getAppleAuthUrl,
  getGoogleAuthUrl,
  handleOAuthCallback,
  initiateOAuthPopup,
} from './oauth';

// Cloud Sync
export {
  initializeCloudSync,
  syncToCloud,
  syncFromCloud,
  listCloudItems,
  deleteCloudItem,
  getCloudQuota,
} from './cloud-sync';
