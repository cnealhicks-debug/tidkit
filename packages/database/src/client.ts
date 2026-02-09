/**
 * TidKit Database Client
 * Singleton PrismaClient instance with connection pooling
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create PrismaClient with logging in development
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

/**
 * Singleton PrismaClient instance
 * Uses global variable in development to prevent multiple instances during hot reload
 */
export const prisma: PrismaClient =
  globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Graceful shutdown helper
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
