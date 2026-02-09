/**
 * TidKit Auth - CloudKit JS Integration
 * Full iCloud sync implementation using Apple's CloudKit JS
 *
 * Setup Requirements:
 * 1. Apple Developer Account with CloudKit enabled
 * 2. Create a CloudKit Container (iCloud.com.tidkit.app)
 * 3. Define Record Types in CloudKit Dashboard:
 *    - TidKitItem: name (String), type (String), data (Asset), thumbnail (Asset), metadata (String)
 * 4. Generate API Token in CloudKit Dashboard
 * 5. Add CloudKit JS script to your HTML
 *
 * Environment Variables:
 * - NEXT_PUBLIC_CLOUDKIT_CONTAINER: CloudKit container identifier
 * - NEXT_PUBLIC_CLOUDKIT_API_TOKEN: CloudKit API token
 * - NEXT_PUBLIC_CLOUDKIT_ENVIRONMENT: 'development' or 'production'
 */

import type { SyncedItem, CloudQuota } from './types';

// CloudKit JS type declarations
declare global {
  interface Window {
    CloudKit: typeof CloudKit;
  }

  namespace CloudKit {
    interface CloudKitConfig {
      containers: ContainerConfig[];
    }

    interface ContainerConfig {
      containerIdentifier: string;
      apiTokenAuth: {
        apiToken: string;
        persist: boolean;
        signInButton?: {
          id: string;
          theme?: 'black' | 'white' | 'white-with-outline';
        };
        signOutButton?: {
          id: string;
          theme?: 'black' | 'white' | 'white-with-outline';
        };
      };
      environment: 'development' | 'production';
    }

    interface Container {
      setUpAuth(): Promise<UserIdentity | null>;
      whenUserSignsIn(): Promise<UserIdentity>;
      whenUserSignsOut(): Promise<void>;
      privateCloudDatabase: Database;
      publicCloudDatabase: Database;
    }

    interface Database {
      saveRecords(records: Record | Record[]): Promise<RecordResponse>;
      fetchRecords(recordNames: string[]): Promise<RecordResponse>;
      deleteRecords(records: Record | Record[]): Promise<RecordResponse>;
      performQuery(query: Query): Promise<RecordResponse>;
      newRecord(recordType: string): Record;
    }

    interface Record {
      recordName: string;
      recordType: string;
      fields: RecordFields;
      setFields(fields: RecordFields): void;
    }

    interface RecordFields {
      [key: string]: RecordField;
    }

    interface RecordField {
      value: any;
      type?: string;
    }

    interface RecordResponse {
      records: Record[];
      hasErrors: boolean;
      errors?: any[];
    }

    interface Query {
      recordType: string;
      filterBy?: QueryFilter[];
      sortBy?: QuerySort[];
    }

    interface QueryFilter {
      fieldName: string;
      comparator: 'EQUALS' | 'NOT_EQUALS' | 'LESS_THAN' | 'GREATER_THAN' | 'CONTAINS' | 'BEGINS_WITH';
      fieldValue: RecordField;
    }

    interface QuerySort {
      fieldName: string;
      ascending: boolean;
    }

    interface UserIdentity {
      userRecordName: string;
      nameComponents?: {
        givenName?: string;
        familyName?: string;
      };
    }

    interface Asset {
      fileChecksum: string;
      size: number;
      downloadURL: string;
    }

    function configure(config: CloudKitConfig): void;
    function getDefaultContainer(): Container;
  }
}

// CloudKit configuration
interface CloudKitOptions {
  containerIdentifier: string;
  apiToken: string;
  environment: 'development' | 'production';
}

let cloudKitContainer: CloudKit.Container | null = null;
let cloudKitDatabase: CloudKit.Database | null = null;
let isCloudKitConfigured = false;

/**
 * Load CloudKit JS script dynamically
 */
export function loadCloudKitJS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.CloudKit) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.apple-cloudkit.com/ck/2/cloudkit.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load CloudKit JS'));
    document.head.appendChild(script);
  });
}

/**
 * Configure CloudKit with your container settings
 */
export async function configureCloudKit(options?: Partial<CloudKitOptions>): Promise<void> {
  if (isCloudKitConfigured) return;

  await loadCloudKitJS();

  const config: CloudKitOptions = {
    containerIdentifier: options?.containerIdentifier ||
      process.env.NEXT_PUBLIC_CLOUDKIT_CONTAINER ||
      'iCloud.com.tidkit.app',
    apiToken: options?.apiToken ||
      process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN ||
      '',
    environment: options?.environment ||
      (process.env.NEXT_PUBLIC_CLOUDKIT_ENVIRONMENT as 'development' | 'production') ||
      'development',
  };

  if (!config.apiToken) {
    throw new Error('CloudKit API token is required. Set NEXT_PUBLIC_CLOUDKIT_API_TOKEN');
  }

  window.CloudKit.configure({
    containers: [{
      containerIdentifier: config.containerIdentifier,
      apiTokenAuth: {
        apiToken: config.apiToken,
        persist: true,
      },
      environment: config.environment,
    }],
  });

  cloudKitContainer = window.CloudKit.getDefaultContainer();
  isCloudKitConfigured = true;
}

/**
 * Authenticate user with iCloud
 */
export async function authenticateCloudKit(): Promise<CloudKit.UserIdentity | null> {
  if (!cloudKitContainer) {
    throw new Error('CloudKit not configured. Call configureCloudKit first.');
  }

  try {
    const userIdentity = await cloudKitContainer.setUpAuth();
    if (userIdentity) {
      cloudKitDatabase = cloudKitContainer.privateCloudDatabase;
    }
    return userIdentity;
  } catch (error) {
    console.error('CloudKit authentication failed:', error);
    return null;
  }
}

/**
 * Wait for user to sign in via Apple ID button
 */
export async function waitForCloudKitSignIn(): Promise<CloudKit.UserIdentity> {
  if (!cloudKitContainer) {
    throw new Error('CloudKit not configured');
  }
  return cloudKitContainer.whenUserSignsIn();
}

/**
 * Wait for user to sign out
 */
export async function waitForCloudKitSignOut(): Promise<void> {
  if (!cloudKitContainer) {
    throw new Error('CloudKit not configured');
  }
  return cloudKitContainer.whenUserSignsOut();
}

/**
 * Check if CloudKit is authenticated
 */
export function isCloudKitAuthenticated(): boolean {
  return cloudKitDatabase !== null;
}

/**
 * Upload an item to iCloud via CloudKit
 */
export async function uploadToCloudKit(
  item: SyncedItem,
  data: Blob | ArrayBuffer | string
): Promise<SyncedItem> {
  if (!cloudKitDatabase) {
    throw new Error('CloudKit not authenticated');
  }

  // Convert data to base64 for storage
  let dataBase64: string;
  if (data instanceof Blob) {
    dataBase64 = await blobToBase64(data);
  } else if (data instanceof ArrayBuffer) {
    dataBase64 = arrayBufferToBase64(data);
  } else {
    dataBase64 = btoa(data);
  }

  // Create or update record
  const record = cloudKitDatabase.newRecord('TidKitItem');
  record.setFields({
    name: { value: item.name },
    type: { value: item.type },
    itemId: { value: item.id },
    data: { value: dataBase64 },
    metadata: { value: JSON.stringify(item.metadata || {}) },
    size: { value: item.size },
    lastModified: { value: Date.now() },
  });

  if (item.thumbnail) {
    record.fields.thumbnail = { value: item.thumbnail };
  }

  const response = await cloudKitDatabase.saveRecords(record);

  if (response.hasErrors) {
    throw new Error(`CloudKit save failed: ${JSON.stringify(response.errors)}`);
  }

  const savedRecord = response.records[0];

  return {
    ...item,
    cloudId: savedRecord.recordName,
    cloudPath: `/iCloud/TidKit/${item.name}`,
    lastSynced: Date.now(),
  };
}

/**
 * Download an item from iCloud via CloudKit
 */
export async function downloadFromCloudKit(cloudId: string): Promise<{
  item: SyncedItem;
  data: Blob;
}> {
  if (!cloudKitDatabase) {
    throw new Error('CloudKit not authenticated');
  }

  const response = await cloudKitDatabase.fetchRecords([cloudId]);

  if (response.hasErrors || response.records.length === 0) {
    throw new Error('Failed to fetch record from CloudKit');
  }

  const record = response.records[0];
  const fields = record.fields;

  // Decode the data
  const dataBase64 = fields.data?.value as string;
  const data = base64ToBlob(dataBase64);

  const item: SyncedItem = {
    id: fields.itemId?.value as string || cloudId,
    name: fields.name?.value as string || 'Untitled',
    type: (fields.type?.value as string || 'texture') as 'texture' | 'building' | 'project',
    cloudId: record.recordName,
    cloudPath: `/iCloud/TidKit/${fields.name?.value}`,
    lastModified: fields.lastModified?.value as number || Date.now(),
    lastSynced: Date.now(),
    size: fields.size?.value as number || 0,
    thumbnail: fields.thumbnail?.value as string | undefined,
    metadata: fields.metadata?.value ? JSON.parse(fields.metadata.value as string) : undefined,
  };

  return { item, data };
}

/**
 * List items from iCloud via CloudKit
 */
export async function listCloudKitItems(
  type?: 'texture' | 'building' | 'project'
): Promise<SyncedItem[]> {
  if (!cloudKitDatabase) {
    throw new Error('CloudKit not authenticated');
  }

  const query: CloudKit.Query = {
    recordType: 'TidKitItem',
    sortBy: [{ fieldName: 'lastModified', ascending: false }],
  };

  if (type) {
    query.filterBy = [{
      fieldName: 'type',
      comparator: 'EQUALS',
      fieldValue: { value: type },
    }];
  }

  const response = await cloudKitDatabase.performQuery(query);

  if (response.hasErrors) {
    throw new Error(`CloudKit query failed: ${JSON.stringify(response.errors)}`);
  }

  return response.records.map((record) => {
    const fields = record.fields;
    return {
      id: fields.itemId?.value as string || record.recordName,
      name: fields.name?.value as string || 'Untitled',
      type: (fields.type?.value as string || 'texture') as 'texture' | 'building' | 'project',
      cloudId: record.recordName,
      cloudPath: `/iCloud/TidKit/${fields.name?.value}`,
      lastModified: fields.lastModified?.value as number || Date.now(),
      size: fields.size?.value as number || 0,
      thumbnail: fields.thumbnail?.value as string | undefined,
    };
  });
}

/**
 * Delete an item from iCloud via CloudKit
 */
export async function deleteFromCloudKit(cloudId: string): Promise<void> {
  if (!cloudKitDatabase) {
    throw new Error('CloudKit not authenticated');
  }

  // Fetch the record first to delete it
  const fetchResponse = await cloudKitDatabase.fetchRecords([cloudId]);
  if (fetchResponse.records.length === 0) {
    return; // Already deleted
  }

  const response = await cloudKitDatabase.deleteRecords(fetchResponse.records[0]);

  if (response.hasErrors) {
    throw new Error(`CloudKit delete failed: ${JSON.stringify(response.errors)}`);
  }
}

/**
 * Get iCloud storage quota (approximate - CloudKit doesn't expose this directly)
 */
export async function getCloudKitQuota(): Promise<CloudQuota> {
  // CloudKit doesn't provide direct quota access
  // Return estimates based on iCloud free tier (5GB)
  // In a real app, you might track usage yourself
  return {
    used: 0,
    total: 5 * 1024 * 1024 * 1024, // 5 GB
    available: 5 * 1024 * 1024 * 1024,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
