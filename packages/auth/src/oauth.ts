/**
 * TidKit Auth - OAuth Providers
 * Apple Sign In and Google Sign In implementation
 */

import type { AuthProvider, User, AuthConfig } from './types';

// OAuth configuration
let config: AuthConfig = {};

export function configureAuth(authConfig: AuthConfig) {
  config = authConfig;
}

/**
 * Generate OAuth authorization URL for Apple Sign In
 */
export function getAppleAuthUrl(): string {
  if (!config.appleClientId) {
    throw new Error('Apple Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: config.appleClientId,
    redirect_uri: config.redirectUri || window.location.origin + '/auth/callback',
    response_type: 'code id_token',
    scope: 'name email',
    response_mode: 'fragment',
    state: generateState(),
  });

  return 'https://appleid.apple.com/auth/authorize?' + params.toString();
}

/**
 * Generate OAuth authorization URL for Google Sign In
 */
export function getGoogleAuthUrl(): string {
  if (!config.googleClientId) {
    throw new Error('Google Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.redirectUri || window.location.origin + '/auth/callback',
    response_type: 'token',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.appdata',
    state: generateState(),
    prompt: 'consent',
    access_type: 'offline',
  });

  return 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

/**
 * Parse OAuth callback and extract tokens/user info
 */
export async function handleOAuthCallback(
  provider: AuthProvider,
  callbackUrl: string
): Promise<User> {
  const hash = new URL(callbackUrl).hash.substring(1);
  const params = new URLSearchParams(hash);

  if (provider === 'apple') {
    return handleAppleCallback(params);
  } else {
    return handleGoogleCallback(params);
  }
}

async function handleAppleCallback(params: URLSearchParams): Promise<User> {
  const idToken = params.get('id_token');
  if (!idToken) {
    throw new Error('No ID token in Apple callback');
  }

  // Decode JWT to get user info (in production, verify on server)
  const payload = decodeJwt(idToken);

  return {
    id: payload.sub,
    email: payload.email || '',
    name: payload.name || payload.email?.split('@')[0] || 'Apple User',
    provider: 'apple',
    cloudProvider: 'icloud',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
}

async function handleGoogleCallback(params: URLSearchParams): Promise<User> {
  const accessToken = params.get('access_token');
  if (!accessToken) {
    throw new Error('No access token in Google callback');
  }

  // Fetch user info from Google
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const userInfo = await response.json();

  return {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name || userInfo.email.split('@')[0],
    avatar: userInfo.picture,
    provider: 'google',
    cloudProvider: 'google-drive',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
}

/**
 * Initiate OAuth flow with popup window
 */
export function initiateOAuthPopup(provider: AuthProvider): Promise<User> {
  return new Promise((resolve, reject) => {
    const url = provider === 'apple' ? getAppleAuthUrl() : getGoogleAuthUrl();
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      'oauth',
      'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for callback
    const checkPopup = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(checkPopup);
          reject(new Error('Authentication cancelled'));
          return;
        }

        // Check if we're at the callback URL
        if (popup.location.href.includes('/auth/callback')) {
          const callbackUrl = popup.location.href;
          popup.close();
          clearInterval(checkPopup);

          handleOAuthCallback(provider, callbackUrl)
            .then(resolve)
            .catch(reject);
        }
      } catch (e) {
        // Cross-origin error - popup is on different domain, keep waiting
      }
    }, 100);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkPopup);
      popup.close();
      reject(new Error('Authentication timed out'));
    }, 300000);
  });
}

// Helper functions

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function decodeJwt(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded);
}
