/**
 * TidKit Storage - Type Definitions
 */

export type StorageProviderType = 'LOCAL' | 'GOOGLE_DRIVE' | 'ICLOUD' | 'S3' | 'DROPBOX';

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StorageFolder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  createdAt: Date;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  mimeType?: string;
  public?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ListOptions {
  folder?: string;
  limit?: number;
  cursor?: string;
}

export interface ListResult {
  files: StorageFile[];
  cursor?: string;
  hasMore: boolean;
}

export interface StorageProvider {
  readonly type: StorageProviderType;

  // Connection management
  connect(userId: string): Promise<{ authUrl: string }>;
  handleCallback(code: string, userId: string): Promise<void>;
  disconnect(userId: string): Promise<void>;
  isConnected(userId: string): Promise<boolean>;

  // File operations
  upload(
    userId: string,
    file: Buffer | Blob | ReadableStream,
    options: UploadOptions
  ): Promise<StorageFile>;

  download(userId: string, fileId: string): Promise<Buffer>;

  delete(userId: string, fileId: string): Promise<void>;

  getFile(userId: string, fileId: string): Promise<StorageFile | null>;

  listFiles(userId: string, options?: ListOptions): Promise<ListResult>;

  // URL generation
  getPublicUrl(userId: string, fileId: string, expiresIn?: number): Promise<string>;
  getSignedUrl(userId: string, fileId: string, expiresIn?: number): Promise<string>;

  // Folder operations (optional)
  createFolder?(userId: string, name: string, parentId?: string): Promise<StorageFolder>;
  listFolders?(userId: string, parentId?: string): Promise<StorageFolder[]>;
}

export interface StorageConnection {
  id: string;
  userId: string;
  provider: StorageProviderType;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
