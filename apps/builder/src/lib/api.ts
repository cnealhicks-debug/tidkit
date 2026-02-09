/**
 * TidKit API Client
 * Connects Builder to the shared TidKit API
 */

// API base URL - configure for environment
const API_BASE = process.env.NEXT_PUBLIC_TIDKIT_API_URL || 'http://localhost/texture-app/api';

export interface User {
  id: number;
  email: string;
  name: string;
  subscription_status: string;
  has_active_subscription: boolean;
}

export interface Texture {
  id: number;
  name: string;
  slug: string;
  category: string;
  thumbnail_url: string;
  image_url?: string;
  is_free: boolean;
  price: number | null;
  has_access: boolean;
  true_scale?: {
    width_inches: number;
    height_inches: number;
    presets?: ScalePreset[];
  };
}

export interface ScalePreset {
  name: string;
  ratio: number;
  tile_width_inches: number;
  tile_height_inches: number;
}

export interface ScaleCategory {
  name: string;
  ratio: number;
}

export interface ScalesResponse {
  scales: {
    model_railroad: ScaleCategory[];
    wargaming: ScaleCategory[];
    dollhouse: ScaleCategory[];
  };
}

export interface TexturesResponse {
  textures: Texture[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  user: User | null;
}

// ============================================
// API Functions
// ============================================

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<AuthCheckResponse> {
  const res = await fetch(`${API_BASE}/auth/check`, {
    credentials: 'include',
  });
  return res.json();
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    return { success: false, error: data.error || 'Login failed' };
  }

  const data = await res.json();
  return { success: true, user: data.user };
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

/**
 * Get list of textures
 */
export async function getTextures(options: {
  category?: string;
  search?: string;
  free_only?: boolean;
  include_scale?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<TexturesResponse> {
  const params = new URLSearchParams();

  if (options.category) params.set('category', options.category);
  if (options.search) params.set('search', options.search);
  if (options.free_only) params.set('free_only', 'true');
  if (options.include_scale) params.set('include_scale', 'true');
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const res = await fetch(`${API_BASE}/textures?${params}`, {
    credentials: 'include',
  });

  return res.json();
}

/**
 * Get single texture by ID or slug
 */
export async function getTexture(idOrSlug: number | string): Promise<Texture> {
  const res = await fetch(`${API_BASE}/textures/${idOrSlug}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Texture not found');
  }

  return res.json();
}

/**
 * Get all scale presets
 */
export async function getScales(): Promise<ScalesResponse> {
  const res = await fetch(`${API_BASE}/scales`);
  return res.json();
}

/**
 * Get texture image URL with access control
 */
export function getTextureImageUrl(textureId: number, size: 'full' | 'thumb' = 'full'): string {
  return `${API_BASE}/image.php?id=${textureId}&size=${size}`;
}

/**
 * Get all texture categories
 */
export async function getCategories(): Promise<string[]> {
  // Get all textures and extract unique categories
  const res = await getTextures({ limit: 1000 });
  const categories = new Set(res.textures.map(t => t.category));
  return Array.from(categories).sort();
}
