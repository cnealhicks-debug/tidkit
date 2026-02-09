/**
 * TidKit Storage Package
 * Unified storage abstraction for local, Google Drive, and iCloud
 */

export * from './types';
export * from './providers';

import type { StorageProvider, StorageProviderType } from './types';
import { LocalProvider } from './providers/local';
import { GoogleDriveProvider } from './providers/google-drive';
import { ICloudProvider } from './providers/icloud';

/**
 * Storage Manager - Factory for creating storage providers
 */
export class StorageManager {
  private providers: Map<StorageProviderType, StorageProvider> = new Map();

  constructor() {
    // Initialize providers
    this.providers.set('LOCAL', new LocalProvider());
    this.providers.set('GOOGLE_DRIVE', new GoogleDriveProvider());
    this.providers.set('ICLOUD', new ICloudProvider());
  }

  /**
   * Get a storage provider by type
   */
  getProvider(type: StorageProviderType): StorageProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Unknown storage provider: ${type}`);
    }
    return provider;
  }

  /**
   * Get all available providers
   */
  getAllProviders(): StorageProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider types that are configured
   */
  getConfiguredProviders(): StorageProviderType[] {
    const configured: StorageProviderType[] = ['LOCAL']; // Always available

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      configured.push('GOOGLE_DRIVE');
    }

    if (process.env.ICLOUD_CONTAINER_ID && process.env.ICLOUD_API_TOKEN) {
      configured.push('ICLOUD');
    }

    return configured;
  }
}

// Singleton instance
let storageManager: StorageManager | null = null;

/**
 * Get the storage manager singleton
 */
export function getStorageManager(): StorageManager {
  if (!storageManager) {
    storageManager = new StorageManager();
  }
  return storageManager;
}

/**
 * Create a storage manager (for testing or isolated instances)
 */
export function createStorageManager(): StorageManager {
  return new StorageManager();
}
