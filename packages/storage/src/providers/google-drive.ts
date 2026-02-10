/**
 * TidKit Storage - Google Drive Provider
 * Cloud storage integration with Google Drive API
 */

import type {
  StorageProvider,
  StorageFile,
  UploadOptions,
  ListOptions,
  ListResult,
} from '../types';

// Google API types (simplified)
interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export class GoogleDriveProvider implements StorageProvider {
  readonly type = 'GOOGLE_DRIVE' as const;

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  // Token storage would be handled by the database in production
  private tokenStore: Map<string, GoogleTokens> = new Map();

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('Google Drive credentials not configured');
    }
  }

  /**
   * Generate OAuth URL for user authorization
   */
  async connect(userId: string): Promise<{ authUrl: string }> {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: userId, // Pass userId to identify user on callback
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await response.json();
    this.tokenStore.set(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: Date.now() + tokens.expires_in * 1000,
    });

    // In production, save tokens to database
  }

  /**
   * Disconnect user's Google Drive
   */
  async disconnect(userId: string): Promise<void> {
    const tokens = this.tokenStore.get(userId);
    if (tokens) {
      // Revoke the token
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, {
        method: 'POST',
      });
      this.tokenStore.delete(userId);
    }
  }

  /**
   * Check if user is connected
   */
  async isConnected(userId: string): Promise<boolean> {
    const tokens = this.tokenStore.get(userId);
    return !!tokens;
  }

  /**
   * Get valid access token, refreshing if needed
   */
  private async getAccessToken(userId: string): Promise<string> {
    const tokens = this.tokenStore.get(userId);
    if (!tokens) {
      throw new Error('User not connected to Google Drive');
    }

    // Refresh if expired or expiring soon (within 5 minutes)
    if (Date.now() > tokens.expiry_date - 5 * 60 * 1000) {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const newTokens = await response.json();
      tokens.access_token = newTokens.access_token;
      tokens.expiry_date = Date.now() + newTokens.expires_in * 1000;
      this.tokenStore.set(userId, tokens);
    }

    return tokens.access_token;
  }

  /**
   * Get or create TidKit folder in user's Drive
   */
  private async getTidKitFolderId(accessToken: string): Promise<string> {
    // Search for existing TidKit folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='TidKit' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const searchResult = await searchResponse.json();
    if (searchResult.files && searchResult.files.length > 0) {
      return searchResult.files[0].id;
    }

    // Create TidKit folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'TidKit',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const folder = await createResponse.json();
    return folder.id;
  }

  /**
   * Upload a file to Google Drive
   */
  async upload(
    userId: string,
    file: Buffer | Blob | ReadableStream,
    options: UploadOptions
  ): Promise<StorageFile> {
    const accessToken = await this.getAccessToken(userId);
    const folderId = await this.getTidKitFolderId(accessToken);

    // Prepare file content
    let fileContent: Blob;
    if (file instanceof Buffer) {
      fileContent = new Blob([new Uint8Array(file)]);
    } else if (file instanceof Blob) {
      fileContent = file;
    } else {
      // ReadableStream
      const chunks: Uint8Array[] = [];
      const reader = (file as ReadableStream).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      fileContent = new Blob(chunks as unknown as BlobPart[]);
    }

    // Create metadata
    const metadata = {
      name: options.filename || 'untitled',
      parents: [folderId],
      mimeType: options.mimeType || 'application/octet-stream',
    };

    // Use multipart upload
    const boundary = 'tidkit_upload_boundary';
    const body = this.buildMultipartBody(metadata, fileContent, boundary);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const driveFile: GoogleDriveFile = await response.json();

    return {
      id: driveFile.id,
      name: driveFile.name,
      mimeType: driveFile.mimeType,
      size: parseInt(driveFile.size || '0', 10),
      url: driveFile.webViewLink || '',
      createdAt: new Date(driveFile.createdTime || Date.now()),
      updatedAt: new Date(driveFile.modifiedTime || Date.now()),
      metadata: options.metadata,
    };
  }

  /**
   * Build multipart body for upload
   */
  private buildMultipartBody(
    metadata: object,
    content: Blob,
    boundary: string
  ): Blob {
    const metadataString = JSON.stringify(metadata);

    return new Blob([
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataString,
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${(content as Blob).type || 'application/octet-stream'}\r\n\r\n`,
      content,
      `\r\n--${boundary}--`,
    ]);
  }

  /**
   * Download a file from Google Drive
   */
  async download(userId: string, fileId: string): Promise<Buffer> {
    const accessToken = await this.getAccessToken(userId);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file from Google Drive
   */
  async delete(userId: string, fileId: string): Promise<void> {
    const accessToken = await this.getAccessToken(userId);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFile(userId: string, fileId: string): Promise<StorageFile | null> {
    const accessToken = await this.getAccessToken(userId);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        return null;
      }

      const driveFile: GoogleDriveFile = await response.json();

      return {
        id: driveFile.id,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        size: parseInt(driveFile.size || '0', 10),
        url: driveFile.webViewLink || '',
        createdAt: new Date(driveFile.createdTime || Date.now()),
        updatedAt: new Date(driveFile.modifiedTime || Date.now()),
      };
    } catch {
      return null;
    }
  }

  /**
   * List files in Google Drive
   */
  async listFiles(userId: string, options?: ListOptions): Promise<ListResult> {
    const accessToken = await this.getAccessToken(userId);
    const folderId = await this.getTidKitFolderId(accessToken);

    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      pageSize: String(options?.limit || 100),
      fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime)',
    });

    if (options?.cursor) {
      params.set('pageToken', options.cursor);
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      files: (result.files || []).map((file: GoogleDriveFile) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size || '0', 10),
        url: file.webViewLink || '',
        createdAt: new Date(file.createdTime || Date.now()),
        updatedAt: new Date(file.modifiedTime || Date.now()),
      })),
      cursor: result.nextPageToken,
      hasMore: !!result.nextPageToken,
    };
  }

  /**
   * Get public URL (creates shareable link)
   */
  async getPublicUrl(userId: string, fileId: string): Promise<string> {
    const accessToken = await this.getAccessToken(userId);

    // Create a public permission
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );

    // Get the web content link
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const file = await response.json();
    return file.webContentLink || '';
  }

  /**
   * Get signed URL (time-limited access)
   * Note: Google Drive doesn't support native signed URLs,
   * so we return a direct download link
   */
  async getSignedUrl(userId: string, fileId: string, _expiresIn?: number): Promise<string> {
    const accessToken = await this.getAccessToken(userId);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const file = await response.json();
    return file.webContentLink || '';
  }
}
