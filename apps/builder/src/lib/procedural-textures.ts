/**
 * TidKit Builder - Procedural Texture Registry & Presets
 * Definitions, defaults, and preset configurations for procedural textures.
 */

import type { ProceduralTextureConfig, ProceduralPreset } from '@/types/procedural';
import { DEFAULT_WEATHERING, DEFAULT_BRICK_PARAMS, DEFAULT_STONE_PARAMS } from '@/types/procedural';

// =============================================================================
// Brick Presets
// =============================================================================

export const BRICK_PRESETS: ProceduralPreset[] = [
  {
    id: 'classic-red-brick',
    name: 'Classic Red Brick',
    description: 'Traditional running bond red brick',
    config: {
      type: 'brick',
      brick: {
        ...DEFAULT_BRICK_PARAMS,
        bondPattern: 'running',
        brickColorA: '#8B4513',
        brickColorB: '#A0522D',
        mortarColor: '#C0B8A0',
        colorVariation: 0.3,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
  {
    id: 'weathered-old-brick',
    name: 'Weathered Old Brick',
    description: 'Aged brick with moss and dirt',
    config: {
      type: 'brick',
      brick: {
        ...DEFAULT_BRICK_PARAMS,
        bondPattern: 'running',
        brickColorA: '#7A4B2A',
        brickColorB: '#8B5E3C',
        mortarColor: '#9A9080',
        colorVariation: 0.5,
        mortarDepth: 0.7,
      },
      weathering: {
        enabled: true,
        dirtIntensity: 0.4,
        dirtColor: '#3d2b1f',
        waterStainIntensity: 0.3,
        mossIntensity: 0.25,
        mossColor: '#2d5a27',
        ageFactor: 0.3,
        edgeWearIntensity: 0.2,
      },
      worldScale: 1.0,
    },
  },
  {
    id: 'yellow-london-stock',
    name: 'Yellow London Stock',
    description: 'Traditional yellow London brick',
    config: {
      type: 'brick',
      brick: {
        ...DEFAULT_BRICK_PARAMS,
        bondPattern: 'flemish',
        brickColorA: '#C4A860',
        brickColorB: '#D4B870',
        mortarColor: '#B8B0A0',
        colorVariation: 0.25,
        brickRoughness: 0.6,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
  {
    id: 'dark-engineering-brick',
    name: 'Dark Engineering Brick',
    description: 'Dense dark industrial brick',
    config: {
      type: 'brick',
      brick: {
        ...DEFAULT_BRICK_PARAMS,
        bondPattern: 'stretcher',
        brickColorA: '#3A2820',
        brickColorB: '#4A3830',
        mortarColor: '#A0A0A0',
        colorVariation: 0.15,
        brickRoughness: 0.4,
        mortarRoughness: 0.6,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
  {
    id: 'whitewashed-brick',
    name: 'Whitewashed Brick',
    description: 'Painted white brick with color bleeding through',
    config: {
      type: 'brick',
      brick: {
        ...DEFAULT_BRICK_PARAMS,
        bondPattern: 'running',
        brickColorA: '#E8E0D8',
        brickColorB: '#DDD5CC',
        mortarColor: '#F0EDE8',
        colorVariation: 0.15,
        brickRoughness: 0.5,
      },
      weathering: {
        ...DEFAULT_WEATHERING,
        enabled: true,
        ageFactor: 0.2,
      },
      worldScale: 1.0,
    },
  },
];

// =============================================================================
// Stone Presets
// =============================================================================

export const STONE_PRESETS: ProceduralPreset[] = [
  {
    id: 'fieldstone',
    name: 'Fieldstone',
    description: 'Natural irregular fieldstone',
    config: {
      type: 'stone',
      stone: {
        ...DEFAULT_STONE_PARAMS,
        layout: 'random',
        stoneSize: 14,
        sizeVariation: 0.5,
        stoneColorA: '#808070',
        stoneColorB: '#909080',
        stoneColorC: '#706860',
        mortarColor: '#A09888',
        mortarWidth: 0.75,
        surfaceRoughness: 0.85,
        grainIntensity: 0.4,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
  {
    id: 'castle-stone',
    name: 'Castle Stone',
    description: 'Large coursed blocks for castle walls',
    config: {
      type: 'stone',
      stone: {
        ...DEFAULT_STONE_PARAMS,
        layout: 'coursed',
        stoneSize: 18,
        sizeVariation: 0.2,
        stoneColorA: '#7A7A70',
        stoneColorB: '#8A8A80',
        stoneColorC: '#6A6A60',
        mortarColor: '#5A5A50',
        mortarWidth: 0.5,
        surfaceRoughness: 0.9,
        grainIntensity: 0.35,
      },
      weathering: {
        enabled: true,
        dirtIntensity: 0.3,
        dirtColor: '#3d3530',
        waterStainIntensity: 0.4,
        mossIntensity: 0.35,
        mossColor: '#2d5a27',
        ageFactor: 0.4,
        edgeWearIntensity: 0.3,
      },
      worldScale: 1.0,
    },
  },
  {
    id: 'cobblestone-path',
    name: 'Cobblestone Path',
    description: 'Small rounded cobblestones',
    config: {
      type: 'stone',
      stone: {
        ...DEFAULT_STONE_PARAMS,
        layout: 'cobblestone',
        stoneSize: 6,
        sizeVariation: 0.3,
        stoneColorA: '#888880',
        stoneColorB: '#9A9A90',
        stoneColorC: '#787870',
        mortarColor: '#606058',
        mortarWidth: 0.3,
        surfaceRoughness: 0.75,
        grainIntensity: 0.2,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
  {
    id: 'cut-ashlar',
    name: 'Cut Ashlar',
    description: 'Precision-cut dressed stone blocks',
    config: {
      type: 'stone',
      stone: {
        ...DEFAULT_STONE_PARAMS,
        layout: 'coursed',
        stoneSize: 16,
        sizeVariation: 0.05,
        stoneColorA: '#C8C0B0',
        stoneColorB: '#D0C8B8',
        stoneColorC: '#B8B0A0',
        mortarColor: '#A8A098',
        mortarWidth: 0.25,
        surfaceRoughness: 0.5,
        grainIntensity: 0.15,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    description: 'Warm sandstone blocks with fine grain',
    config: {
      type: 'stone',
      stone: {
        ...DEFAULT_STONE_PARAMS,
        layout: 'coursed',
        stoneSize: 14,
        sizeVariation: 0.15,
        stoneColorA: '#C4A060',
        stoneColorB: '#D4B070',
        stoneColorC: '#B49050',
        mortarColor: '#A09080',
        mortarWidth: 0.4,
        surfaceRoughness: 0.7,
        grainIntensity: 0.5,
      },
      weathering: DEFAULT_WEATHERING,
      worldScale: 1.0,
    },
  },
];

// =============================================================================
// All presets combined
// =============================================================================

export const ALL_PRESETS: ProceduralPreset[] = [...BRICK_PRESETS, ...STONE_PRESETS];

/** Get a preset by ID */
export function getPreset(id: string): ProceduralPreset | undefined {
  return ALL_PRESETS.find(p => p.id === id);
}

/** Get presets filtered by texture type */
export function getPresetsByType(type: 'brick' | 'stone'): ProceduralPreset[] {
  return ALL_PRESETS.filter(p => p.config.type === type);
}

/** Create a default ProceduralTextureConfig for a given type */
export function createDefaultConfig(type: 'brick' | 'stone'): ProceduralTextureConfig {
  return {
    type,
    brick: type === 'brick' ? { ...DEFAULT_BRICK_PARAMS } : undefined,
    stone: type === 'stone' ? { ...DEFAULT_STONE_PARAMS } : undefined,
    weathering: { ...DEFAULT_WEATHERING },
    worldScale: 1.0,
  };
}
