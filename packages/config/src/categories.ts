/**
 * TidKit - Texture Categories
 * Shared across Studio and Builder
 */

export interface TextureCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const TEXTURE_CATEGORIES: TextureCategory[] = [
  { id: 'brick', name: 'Brick', description: 'Brick walls and patterns', icon: '🧱' },
  { id: 'stone', name: 'Stone', description: 'Stone walls and masonry', icon: '🪨' },
  { id: 'wood', name: 'Wood', description: 'Wood siding and boards', icon: '🪵' },
  { id: 'metal', name: 'Metal', description: 'Metal panels and corrugated', icon: '🔩' },
  { id: 'concrete', name: 'Concrete', description: 'Concrete and cement', icon: '⬜' },
  { id: 'stucco', name: 'Stucco', description: 'Stucco and plaster', icon: '🏠' },
  { id: 'siding', name: 'Siding', description: 'Vinyl and composite siding', icon: '📐' },
  { id: 'roofing', name: 'Roofing', description: 'Shingles and roof tiles', icon: '🏘️' },
  { id: 'flooring', name: 'Flooring', description: 'Wood floors and tiles', icon: '🪵' },
  { id: 'ground', name: 'Ground', description: 'Grass, dirt, and terrain', icon: '🌱' },
  { id: 'wallpaper', name: 'Wallpaper', description: 'Interior wallpaper patterns', icon: '🎨' },
  { id: 'marble', name: 'Marble', description: 'Marble and polished stone', icon: '💎' },
  { id: 'tile', name: 'Tile', description: 'Ceramic and porcelain tiles', icon: '🔲' },
  { id: 'fantasy', name: 'Fantasy', description: 'Fantasy and themed textures', icon: '🏰' },
  { id: 'scifi', name: 'Sci-Fi', description: 'Science fiction textures', icon: '🚀' },
];

export function getCategoryById(id: string): TextureCategory | undefined {
  return TEXTURE_CATEGORIES.find((c) => c.id === id);
}

export function getCategoryNames(): string[] {
  return TEXTURE_CATEGORIES.map((c) => c.id);
}
