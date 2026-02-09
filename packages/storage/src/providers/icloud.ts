/**
 * TidKit Storage - iCloud Provider
 * Cloud storage integration with Apple iCloud (via CloudKit)
 *
 * Note: iCloud integration requires Apple Developer account and CloudKit setup.
 * This implementation uses CloudKit Web Services API.
 */

import type {
  StorageProvider,
  StorageFile,
  UploadOptions,
  ListOptions,
  ListResult,
} from '../types';

interface CloudKitToken {
  webAuthToken: string;
  ckWebAuthToken: string;
}

interface CloudKitRecord {
  recordName: string;
  recordType: string;
  fields: {
    filename?: { value: string };
    mimeType?: { value: string };
    size?: { value: number };
    file?: { value: { fileChecksum: string; size: number; downloadURL: string } };
    createdAt?: { value: number };
    modifiedAt?: { value: number };
  };
  created?: { timestamp: number };
  modified?: { timestamp: number };
}

export class ICloudProvider implements StorageProvider {
  readonly type = 'ICLOUD' as const;

  private containerId: string;
  private apiToken: string;
  private environment: 'development' | 'production';

  // Token storage would be handled by the database in production
  private tokenStore: Map<string, CloudKitToken> = new Map();

  constructor() {
    this.containerId = process.env.ICLOUD_CONTAINER_ID || '';
    this.apiToken = process.env.ICLOUD_API_TOKEN || '';
    this.environment = (process.env.ICLOUD_ENVIRONMENT || 'development') as 'development' | 'production';

    if (!this.containerId || !this.apiToken) {
      console.warn('iCloud credentials not configured');
    }
  }

  private get baseUrl(): string {
    return `https://api.apple-cloudkit.com/database/1/${this.containerId}/${this.environment}/private`;
  }

  /**
   * Generate CloudKit authentication URL
   * Note: CloudKit uses Sign in with Apple for authentication
   */
  async connect(userId: string): Promise<{ authUrl: string }> {
    const params = new URLSearchParams({
      client_id: this.containerId,
      redirect_uri: process.env.ICLOUD_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'cloudkit',
      state: userId,
    });

    // CloudKit uses Sign in with Apple OAuth
    return {
      authUrl: `https://appleid.apple.com/auth/authorize?${params.toString()}`,
    };
  }

  /**
   * Handle OAuth callback from Apple
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    // Exchange code for CloudKit web auth token
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.containerId,
        client_secret: process.env.ICLOUD_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.ICLOUD_REDIRECT_URI || '',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await response.json();

    // Get CloudKit web auth token
    const ckResponse = await fetch(`${this.baseUrl}/users/current`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'X-Apple-CloudKit-Request-KeyID': this.apiToken,
      },
    });

    if (!ckResponse.ok) {
      throw new Error('Failed to get CloudKit session');
    }

    const ckSession = await ckResponse.json();

    this.tokenStore.set(userId, {
      webAuthToken: tokens.access_token,
      ckWebAuthToken: ckSession.ckWebAuthToken,
    });
  }

  /**
   * Disconnect user's iCloud
   */
  async disconnect(userId: string): Promise<void> {
    this.tokenStore.delete(userId);
  }

  /**
   * Check if user is connected
   */
  async isConnected(userId: string): Promise<boolean> {
    return this.tokenStore.has(userId);
  }

  /**
   * Get CloudKit auth headers
   */
  private getHeaders(userId: string): HeadersInit {
    const tokens = this.tokenStore.get(userId);
    if (!tokens) {
      throw new Error('User not connected to iCloud');
    }

    return {
      'Content-Type': 'application/json',
      'X-Apple-CloudKit-Request-KeyID': this.apiToken,
      'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
      Authorization: `Bearer ${tokens.webAuthToken}`,
    };
  }

  /**
   * Upload a file to iCloud
   */
  async upload(
    userId: string,
    file: Buffer | Blob | ReadableStream,
    options: UploadOptions
  ): Promise<StorageFile> {
    const headers = this.getHeaders(userId);

    // Step 1: Request upload URL
    const tokenResponse = await fetch(`${this.baseUrl}/assets/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tokens: [{ recordType: 'TidKitFile', fieldName: 'file' }],
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get upload token');
    }

    const tokenResult = await tokenResponse.json();
    const uploadInfo = tokenResult.tokens[0];

    // Step 2: Upload file to asset URL
    let fileBuffer: Buffer;
    if (file instanceof Buffer) {
      fileBuffer = file;
    } else if (file instanceof Blob) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const chunks: Uint8Array[] = [];
      const reader = (file as ReadableStream).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      fileBuffer = Buffer.concat(chunks);
    }

    const uploadResponse = await fetch(uploadInfo.url, {
      method: 'POST',
      headers: {
        'Content-Type': options.mimeType || 'application/octet-stream',
        'X-Apple-CloudKit-Request-SignatureV2': uploadInfo.signature,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to iCloud');
    }

    const uploadResult = await uploadResponse.json();

    // Step 3: Create record with the asset
    const recordName = `tidkit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();

    const recordResponse = await fetch(`${this.baseUrl}/records/modify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          operationType: 'create',
          record: {
            recordType: 'TidKitFile',
            recordName,
            fields: {
              filename: { value: options.filename || 'untitled' },
              mimeType: { value: options.mimeType || 'application/octet-stream' },
              size: { value: fileBuffer.length },
              file: { value: uploadResult },
              folder: { value: options.folder || '' },
              createdAt: { value: now },
              modifiedAt: { value: now },
            },
          },
        }],
      }),
    });

    if (!recordResponse.ok) {
      throw new Error('Failed to create iCloud record');
    }

    const recordResult = await recordResponse.json();
    const record = recordResult.records[0];

    return {
      id: record.recordName,
      name: options.filename || 'untitled',
      mimeType: options.mimeType || 'application/octet-stream',
      size: fileBuffer.length,
      url: '', // iCloud doesn't provide direct URLs
      createdAt: new Date(now),
      updatedAt: new Date(now),
      metadata: options.metadata,
    };
  }

  /**
   * Download a file from iCloud
   */
  async download(userId: string, fileId: string): Promise<Buffer> {
    const headers = this.getHeaders(userId);

    // Fetch the record to get the download URL
    const response = await fetch(`${this.baseUrl}/records/lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        records: [{ recordName: fileId }],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch iCloud record');
    }

    const result = await response.json();
    const record = result.records[0] as CloudKitRecord;

    if (!record.fields.file?.value.downloadURL) {
      throw new Error('No download URL available');
    }

    // Download the file
    const downloadResponse = await fetch(record.fields.file.value.downloadURL);
    if (!downloadResponse.ok) {
      throw new Error('Failed to download file from iCloud');
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file from iCloud
   */
  async delete(userId: string, fileId: string): Promise<void> {
    const headers = this.getHeaders(userId);

    const response = await fetch(`${this.baseUrl}/records/modify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          operationType: 'delete',
          record: { recordName: fileId },
        }],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete iCloud record');
    }
  }

  /**
   * Get file metadata
   */
  async getFile(userId: string, fileId: string): Promise<StorageFile | null> {
    const headers = this.getHeaders(userId);

    try {
      const response = await fetch(`${this.baseUrl}/records/lookup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          records: [{ recordName: fileId }],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      const record = result.records[0] as CloudKitRecord;

      return {
        id: record.recordName,
        name: record.fields.filename?.value || 'untitled',
        mimeType: record.fields.mimeType?.value || 'application/octet-stream',
        size: record.fields.size?.value || 0,
        url: record.fields.file?.value.downloadURL || '',
        createdAt: new Date(record.fields.createdAt?.value || record.created?.timestamp || Date.now()),
        updatedAt: new Date(record.fields.modifiedAt?.value || record.modified?.timestamp || Date.now()),
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in iCloud
   */
  async listFiles(userId: string, options?: ListOptions): Promise<ListResult> {
    const headers = this.getHeaders(userId);

    const queryBody: {
      query: { recordType: string; filterBy?: { fieldName: string; comparator: string; fieldValue: { value: string } }[] };
      resultsLimit?: number;
      continuationMarker?: string;
    } = {
      query: {
        recordType: 'TidKitFile',
      },
      resultsLimit: options?.limit || 100,
    };

    if (options?.folder) {
      queryBody.query.filterBy = [{
        fieldName: 'folder',
        comparator: 'EQUALS',
        fieldValue: { value: options.folder },
      }];
    }

    if (options?.cursor) {
      queryBody.continuationMarker = options.cursor;
    }

    const response = await fetch(`${this.baseUrl}/records/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(queryBody),
    });

    if (!response.ok) {
      throw new Error('Failed to query iCloud records');
    }

    const result = await response.json();

    return {
      files: (result.records || []).map((record: CloudKitRecord) => ({
        id: record.recordName,
        name: record.fields.filename?.value || 'untitled',
        mimeType: record.fields.mimeType?.value || 'application/octet-stream',
        size: record.fields.size?.value || 0,
        url: record.fields.file?.value.downloadURL || '',
        createdAt: new Date(record.fields.createdAt?.value || record.created?.timestamp || Date.now()),
        updatedAt: new Date(record.fields.modifiedAt?.value || record.modified?.timestamp || Date.now()),
      })),
      cursor: result.continuationMarker,
      hasMore: !!result.continuationMarker,
    };
  }

  /**
   * Get public URL
   * Note: iCloud/CloudKit doesn't support public URLs directly
   * Files must be shared via iCloud sharing features
   */
  async getPublicUrl(_userId: string, _fileId: string): Promise<string> {
    throw new Error('iCloud does not support direct public URLs. Use signed URLs for temporary access.');
  }

  /**
   * Get signed URL (temporary download link)
   */
  async getSignedUrl(userId: string, fileId: string, _expiresIn?: number): Promise<string> {
    // CloudKit download URLs are already time-limited
    const file = await this.getFile(userId, fileId);
    if (!file) {
      throw new Error('File not found');
    }
    return file.url;
  }
}
