/**
 * TidKit Auth - Client-side only exports
 * Use this entry point for client-side apps that don't need NextAuth
 */

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
  // iCloud/CloudKit specific
  initializeICloudSync,
  configureCloudKit,
  authenticateCloudKit,
  isCloudKitAuthenticated,
  loadCloudKitJS,
  waitForCloudKitSignIn,
  waitForCloudKitSignOut,
} from './cloud-sync';
