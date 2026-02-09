/**
 * @tidkit/config - Shared configuration
 */

export * from './scales';
export * from './categories';

// App URLs (environment-dependent)
export const APP_URLS = {
  studio: process.env.NEXT_PUBLIC_STUDIO_URL || 'http://localhost:3000',
  builder: process.env.NEXT_PUBLIC_BUILDER_URL || 'http://localhost:3001',
  landing: process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3002',
  api: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
};

// Default DPI for print exports
export const PRINT_DPI = 300;

// Image size limits
export const MAX_TEXTURE_SIZE = 4096; // pixels
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    maxTextures: 5,
    maxProjects: 3,
    storageLimit: 100 * 1024 * 1024, // 100MB
    features: ['basic_textures', 'basic_export'],
  },
  PRO: {
    name: 'Pro',
    maxTextures: Infinity,
    maxProjects: Infinity,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    features: [
      'all_textures',
      'true_scale',
      'weathering',
      'hd_export',
      'cloud_storage',
      'priority_support',
    ],
  },
  LIFETIME: {
    name: 'Lifetime',
    maxTextures: Infinity,
    maxProjects: Infinity,
    storageLimit: Infinity,
    features: ['all_pro_features', 'early_access', 'commercial_use'],
  },
} as const;
