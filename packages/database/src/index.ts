/**
 * TidKit Database Package
 * Exports Prisma client and types
 */

// Re-export Prisma client
export { prisma, disconnectDatabase, checkDatabaseHealth } from './client';

// Re-export Prisma types
export type {
  User,
  Account,
  Session,
  Texture,
  Project,
  ProjectTexture,
  StorageConnection,
  BuildingTemplate,
  TextureCategory,
  StorageProviderType,
} from '@prisma/client';

// Re-export Prisma utilities
export { Prisma } from '@prisma/client';
