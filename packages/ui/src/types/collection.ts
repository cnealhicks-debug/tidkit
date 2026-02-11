/**
 * TidKit UI - Collection Type Definitions
 * Shared types for the unified content browser
 */

export type CollectionCategory = 'projects' | 'textures';
// Future: | 'accessories' | 'stickers' | 'building-kits'

export interface CollectionItem {
  id: string;
  name: string;
  category: CollectionCategory;
  thumbnailUrl?: string;
  createdAt: number;
  updatedAt: number;
  source: 'local' | 'cloud';
  metadata: Record<string, unknown>;
}

export interface ProjectCollectionItem extends CollectionItem {
  category: 'projects';
  metadata: {
    dimensions: { width: number; depth: number; height: number };
    roofStyle: string;
    scale: string;
    accessoryCount: number;
    floorCount: number;
  };
}

export interface TextureCollectionItem extends CollectionItem {
  category: 'textures';
  metadata: {
    textureType: 'photo' | 'procedural';
    textureCategory: string;
    dimensions?: { width: number; height: number };
    pixelDimensions?: { width: number; height: number };
    isSeamless?: boolean;
    proceduralType?: string;
  };
}

export type AnyCollectionItem = ProjectCollectionItem | TextureCollectionItem;

export interface CollectionFilter {
  search?: string;
  subcategory?: string;
  sortBy: 'name' | 'date' | 'modified';
  sortOrder: 'asc' | 'desc';
}
