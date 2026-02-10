/**
 * TidKit Storage - Local/Vercel Blob Provider
 * Default storage using Vercel Blob (or local filesystem in dev)
 */

import { put, del, list, head } from '@vercel/blob';
import type {
  StorageProvider,
  StorageFile,
  UploadOptions,
  ListOptions,
  ListResult,
} from '../types';

export class LocalProvider implements StorageProvider {
  readonly type = 'LOCAL' as const;

  // Local storage doesn't need OAuth connection
  async connect(_userId: string): Promise<{ authUrl: string }> {
    return { authUrl: '' }; // No auth needed
  }

  async handleCallback(_code: string, _userId: string): Promise<void> {
    // No-op for local storage
  }

  async disconnect(_userId: string): Promise<void> {
    // No-op for local storage
  }

  async isConnected(_userId: string): Promise<boolean> {
    return true; // Always available
  }

  async upload(
    userId: string,
    file: Buffer | Blob | ReadableStream,
    options: UploadOptions
  ): Promise<StorageFile> {
    const path = this.buildPath(userId, options.folder, options.filename || 'untitled');

    const blob = await put(path, file, {
      access: options.public ? 'public' : 'public', // Vercel Blob is always public
      contentType: options.mimeType,
      addRandomSuffix: !options.filename, // Add suffix if no filename provided
    });

    return {
      id: blob.pathname,
      name: options.filename || blob.pathname.split('/').pop() || 'untitled',
      mimeType: options.mimeType || 'application/octet-stream',
      size: file instanceof Buffer ? file.length : 0,
      url: blob.url,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options.metadata,
    };
  }

  async download(_userId: string, fileId: string): Promise<Buffer> {
    // fileId is the pathname, construct full URL
    const baseUrl = process.env.BLOB_URL || '';
    const url = fileId.startsWith('http') ? fileId : `${baseUrl}/${fileId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(_userId: string, fileId: string): Promise<void> {
    await del(fileId);
  }

  async getFile(_userId: string, fileId: string): Promise<StorageFile | null> {
    try {
      const blob = await head(fileId);

      return {
        id: blob.pathname,
        name: blob.pathname.split('/').pop() || 'untitled',
        mimeType: (blob as any).contentType || 'application/octet-stream',
        size: blob.size,
        url: blob.url,
        createdAt: blob.uploadedAt,
        updatedAt: blob.uploadedAt,
      };
    } catch {
      return null;
    }
  }

  async listFiles(userId: string, options?: ListOptions): Promise<ListResult> {
    const prefix = options?.folder
      ? `users/${userId}/${options.folder}/`
      : `users/${userId}/`;

    const result = await list({
      prefix,
      limit: options?.limit || 100,
      cursor: options?.cursor,
    });

    return {
      files: result.blobs.map((blob) => ({
        id: blob.pathname,
        name: blob.pathname.split('/').pop() || 'untitled',
        mimeType: (blob as any).contentType || 'application/octet-stream',
        size: blob.size,
        url: blob.url,
        createdAt: blob.uploadedAt,
        updatedAt: blob.uploadedAt,
      })),
      cursor: result.cursor,
      hasMore: result.hasMore,
    };
  }

  async getPublicUrl(_userId: string, fileId: string): Promise<string> {
    const blob = await head(fileId);
    return blob.url;
  }

  async getSignedUrl(_userId: string, fileId: string, _expiresIn?: number): Promise<string> {
    // Vercel Blob doesn't support signed URLs, return public URL
    return this.getPublicUrl(_userId, fileId);
  }

  private buildPath(userId: string, folder?: string, filename?: string): string {
    const parts = ['users', userId];
    if (folder) parts.push(folder);
    if (filename) parts.push(filename);
    return parts.join('/');
  }
}
