/**
 * TidKit Auth - NextAuth.js Configuration
 */

import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import { prisma } from '@tidkit/database';
import { getProviders } from './providers';

/**
 * NextAuth.js configuration
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: getProviders(),

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    /**
     * Include user ID and custom fields in the session
     */
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },

    /**
     * Store user ID in the JWT token
     */
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      // Store Google access token for Drive access
      if (account?.provider === 'google') {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
      }

      return token;
    },

    /**
     * Handle sign in - save storage tokens
     */
    async signIn({ user, account }) {
      if (account?.provider === 'google' && account.access_token) {
        // Save Google Drive tokens for storage access
        await prisma.storageConnection.upsert({
          where: {
            userId_provider: {
              userId: user.id!,
              provider: 'GOOGLE_DRIVE',
            },
          },
          update: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token || undefined,
            tokenExpiry: account.expires_at
              ? new Date(account.expires_at * 1000)
              : undefined,
          },
          create: {
            userId: user.id!,
            provider: 'GOOGLE_DRIVE',
            accessToken: account.access_token,
            refreshToken: account.refresh_token || undefined,
            tokenExpiry: account.expires_at
              ? new Date(account.expires_at * 1000)
              : undefined,
          },
        });
      }

      return true;
    },
  },

  events: {
    /**
     * Create default storage connection on user creation
     */
    async createUser({ user }) {
      // Set up local storage as default
      await prisma.storageConnection.create({
        data: {
          userId: user.id,
          provider: 'LOCAL',
          isDefault: true,
        },
      });
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

/**
 * Extended session type with user ID
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }
}
