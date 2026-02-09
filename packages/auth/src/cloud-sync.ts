/**
 * TidKit Auth - Cloud Sync
 * iCloud and Google Drive integration for library sync
 */

import type { CloudProvider, SyncedItem, CloudQuota } from './types';
import { useAuthStore } from './store';

// Configuration
let googleAccessToken: string | null = null;

/**
 * Initialize cloud sync with access token
 */
export function initializeCloudSync(provider: CloudProvider, accessToken?: string) {
  if (provider === 'google-drive' && accessToken) {
    googleAccessToken = accessToken;
  }
  useAuthStore.getState().enableCloudSync(provider);
}

/**
 * Sync a local item to cloud storage
 */
export async function syncToCloud(
  item: SyncedItem,
  data: Blob | ArrayBuffer | string
): Promise<SyncedItem> {
  const store = useAuthStore.getState();

  if (!store.isEnabled || !store.provider) {
    throw new Error('Cloud sync not enabled');
  }

  store.setSyncing(true);

  try {
    if (store.provider === 'google-drive') {
      return await uploadToGoogleDrive(item, data);
    } else if (store.provider === 'icloud') {
      return await uploadToICloud(item, data);
    }
    throw new Error('Unsupported cloud provider');
  } catch (error) {
    store.setSyncError(error instanceof Error ? error.message : 'Sync failed');
    throw error;
  } finally {
    store.updateLastSync();
  }
}

/**
 * Sync an item from cloud storage to local
 */
export async function syncFromCloud(cloudId: string): Promise<{
  item: SyncedItem;
  data: Blob;
}> {
  const store = useAuthStore.getState();

  if (!store.isEnabled || !store.provider) {
    throw new Error('Cloud sync not enabled');
  }

  store.setSyncing(true);

  try {
    if (store.provider === 'google-drive') {
      return await downloadFromGoogleDrive(cloudId);
    } else if (store.provider === 'icloud') {
      return await downloadFromICloud(cloudId);
    }
    throw new Error('Unsupported cloud provider');
  } catch (error) {
    store.setSyncError(error instanceof Error ? error.message : 'Sync failed');
    throw error;
  } finally {
    store.updateLastSync();
  }
}

/**
 * List items from cloud storage
 */
export async function listCloudItems(
  type?: 'texture' | 'building' | 'project'
): Promise<SyncedItem[]> {
  const store = useAuthStore.getState();

  if (!store.isEnabled || !store.provider) {
    throw new Error('Cloud sync not enabled');
  }

  if (store.provider === 'google-drive') {
    return await listGoogleDriveItems(type);
  } else if (store.provider === 'icloud') {
    return await listICloudItems(type);
  }

  throw new Error('Unsupported cloud provider');
}

/**
 * Delete an item from cloud storage
 */
export async function deleteCloudItem(cloudId: string): Promise<void> {
  const store = useAuthStore.getState();

  if (!store.isEnabled || !store.provider) {
    throw new Error('Cloud sync not enabled');
  }

  if (store.provider === 'google-drive') {
    await deleteFromGoogleDrive(cloudId);
  } else if (store.provider === 'icloud') {
    await deleteFromICloud(cloudId);
  } else {
    throw new Error('Unsupported cloud provider');
  }
}

/**
 * Get cloud storage quota
 */
export async function getCloudQuota(): Promise<CloudQuota> {
  const store = useAuthStore.getState();

  if (!store.isEnabled || !store.provider) {
    throw new Error('Cloud sync not enabled');
  }

  if (store.provider === 'google-drive') {
    return await getGoogleDriveQuota();
  } else if (store.provider === 'icloud') {
    return await getICloudQuota();
  }

  throw new Error('Unsupported cloud provider');
}

// =============================================================================
// Google Drive Implementation
// =============================================================================

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const TIDKIT_FOLDER_NAME = 'TidKit';

async function getOrCreateTidKitFolder(): Promise<string> {
  if (!googleAccessToken) {
    throw new Error('Google Drive not authenticated');
  }

  // Check if TidKit folder exists
  const searchResponse = await fetch(
    `${GOOGLE_DRIVE_API}/files?q=name='${TIDKIT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    }
  );

  if (!searchResponse.ok) {
    throw new Error('Failed to search Google Drive');
  }

  const searchResult = await searchResponse.json();

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create TidKit folder
  const createResponse = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: TIDKIT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createResponse.ok) {
    throw new Error('Failed to create TidKit folder');
  }

  const folder = await createResponse.json();
  return folder.id;
}

async function uploadToGoogleDrive(
  item: SyncedItem,
  data: Blob | ArrayBuffer | string
): Promise<SyncedItem> {
  if (!googleAccessToken) {
    throw new Error('Google Drive not authenticated');
  }

  const folderId = await getOrCreateTidKitFolder();

  // Convert data to Blob if needed
  const blob = data instanceof Blob
    ? data
    : new Blob([data], { type: 'application/json' });

  // Create metadata
  const metadata = {
    name: `${item.name}.tidkit`,
    parents: [folderId],
    appProperties: {
      tidkitType: item.type,
      tidkitId: item.id,
    },
  };

  // Use resumable upload for larger files
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', blob);

  const response = await fetch(
    `${GOOGLE_UPLOAD_API}/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${googleAccessToken}` },
      body: form,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload to Google Drive');
  }

  const file = await response.json();

  return {
    ...item,
    cloudId: file.id,
    cloudPath: `/${TIDKIT_FOLDER_NAME}/${file.name}`,
    lastSynced: Date.now(),
  };
}

async function downloadFromGoogleDrive(cloudId: string): Promise<{
  item: SyncedItem;
  data: Blob;
}> {
  if (!googleAccessToken) {
    throw new Error('Google Drive not authenticated');
  }

  // Get file metadata
  const metaResponse = await fetch(
    `${GOOGLE_DRIVE_API}/files/${cloudId}?fields=id,name,size,modifiedTime,appProperties`,
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    }
  );

  if (!metaResponse.ok) {
    throw new Error('Failed to get file metadata');
  }

  const meta = await metaResponse.json();

  // Download file content
  const dataResponse = await fetch(
    `${GOOGLE_DRIVE_API}/files/${cloudId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    }
  );

  if (!dataResponse.ok) {
    throw new Error('Failed to download from Google Drive');
  }

  const data = await dataResponse.blob();

  const item: SyncedItem = {
    id: meta.appProperties?.tidkitId || cloudId,
    name: meta.name.replace('.tidkit', ''),
    type: meta.appProperties?.tidkitType || 'texture',
    cloudId: cloudId,
    cloudPath: `/${TIDKIT_FOLDER_NAME}/${meta.name}`,
    lastModified: new Date(meta.modifiedTime).getTime(),
    lastSynced: Date.now(),
    size: parseInt(meta.size, 10),
  };

  return { item, data };
}

async function listGoogleDriveItems(
  type?: 'texture' | 'building' | 'project'
): Promise<SyncedItem[]> {
  if (!googleAccessToken) {
    throw new Error('Google Drive not authenticated');
  }

  const folderId = await getOrCreateTidKitFolder();

  let query = `'${folderId}' in parents and trashed=false`;
  if (type) {
    query += ` and appProperties has { key='tidkitType' and value='${type}' }`;
  }

  const response = await fetch(
    `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,modifiedTime,appProperties,thumbnailLink)`,
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list Google Drive files');
  }

  const result = await response.json();

  return (result.files || []).map((file: any) => ({
    id: file.appProperties?.tidkitId || file.id,
    name: file.name.replace('.tidkit', ''),
    type: file.appProperties?.tidkitType || 'texture',
    cloudId: file.id,
    cloudPath: `/${TIDKIT_FOLDER_NAME}/${file.name}`,
    lastModified: new Date(file.modifiedTime).getTime(),
    size: parseInt(file.size, 10) || 0,
    thumbnail: file.thumbnailLink,
  }));
}

async function deleteFromGoogleDrive(cloudId: string): Promise<void> {
  if (!googleAccessToken) {
    throw new Error('Google Drive not authenticated');
  }

  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${cloudId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete from Google Drive');
  }
}

async function getGoogleDriveQuota(): Promise<CloudQuota> {
  if (!googleAccessToken) {
    throw new Error('Google Drive not authenticated');
  }

  const response = await fetch(
    `${GOOGLE_DRIVE_API}/about?fields=storageQuota`,
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get Google Drive quota');
  }

  const result = await response.json();
  const quota = result.storageQuota;

  return {
    used: parseInt(quota.usage, 10),
    total: parseInt(quota.limit, 10),
    available: parseInt(quota.limit, 10) - parseInt(quota.usage, 10),
  };
}

// =============================================================================
// iCloud Implementation (via CloudKit JS)
// =============================================================================

import {
  configureCloudKit,
  authenticateCloudKit,
  isCloudKitAuthenticated,
  uploadToCloudKit,
  downloadFromCloudKit,
  listCloudKitItems,
  deleteFromCloudKit,
  getCloudKitQuota,
  loadCloudKitJS,
  waitForCloudKitSignIn,
  waitForCloudKitSignOut,
} from './cloudkit';

// Re-export CloudKit setup functions for direct use
export {
  configureCloudKit,
  authenticateCloudKit,
  isCloudKitAuthenticated,
  loadCloudKitJS,
  waitForCloudKitSignIn,
  waitForCloudKitSignOut,
} from './cloudkit';

/**
 * Initialize iCloud sync
 * Call this after user signs in with Apple
 */
export async function initializeICloudSync(): Promise<boolean> {
  try {
    await configureCloudKit();
    const user = await authenticateCloudKit();
    if (user) {
      useAuthStore.getState().enableCloudSync('icloud');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to initialize iCloud sync:', error);
    return false;
  }
}

async function uploadToICloud(
  item: SyncedItem,
  data: Blob | ArrayBuffer | string
): Promise<SyncedItem> {
  if (!isCloudKitAuthenticated()) {
    // Try to initialize CloudKit
    const success = await initializeICloudSync();
    if (!success) {
      throw new Error('iCloud authentication required. Please sign in with Apple.');
    }
  }

  return uploadToCloudKit(item, data);
}

async function downloadFromICloud(cloudId: string): Promise<{
  item: SyncedItem;
  data: Blob;
}> {
  if (!isCloudKitAuthenticated()) {
    throw new Error('iCloud authentication required');
  }

  return downloadFromCloudKit(cloudId);
}

async function listICloudItems(
  type?: 'texture' | 'building' | 'project'
): Promise<SyncedItem[]> {
  if (!isCloudKitAuthenticated()) {
    // Try to initialize CloudKit silently
    try {
      await initializeICloudSync();
    } catch {
      return [];
    }
  }

  return listCloudKitItems(type);
}

async function deleteFromICloud(cloudId: string): Promise<void> {
  if (!isCloudKitAuthenticated()) {
    throw new Error('iCloud authentication required');
  }

  return deleteFromCloudKit(cloudId);
}

async function getICloudQuota(): Promise<CloudQuota> {
  return getCloudKitQuota();
}
