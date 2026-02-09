/**
 * TidKit Auth - OAuth Providers Configuration
 */

import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import EmailProvider from 'next-auth/providers/email';
import type { Provider } from 'next-auth/providers/index';

/**
 * Get configured authentication providers
 */
export function getProviders(): Provider[] {
  const providers: Provider[] = [];

  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
            // Request additional scopes for Google Drive access
            scope: [
              'openid',
              'email',
              'profile',
              'https://www.googleapis.com/auth/drive.file',
            ].join(' '),
          },
        },
      })
    );
  }

  // Apple OAuth
  if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_ID,
        clientSecret: process.env.APPLE_SECRET,
      })
    );
  }

  // Magic Link (Email)
  if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
    providers.push(
      EmailProvider({
        server: process.env.EMAIL_SERVER,
        from: process.env.EMAIL_FROM,
        maxAge: 60 * 60, // 1 hour
      })
    );
  }

  return providers;
}

export { GoogleProvider, AppleProvider, EmailProvider };
