/**
 * TidKit Builder - Procedural Texture Types
 * Type definitions for procedural texture generation via GLSL shaders.
 */

export type ProceduralTextureType = 'brick' | 'stone';

export type BrickBondPattern = 'running' | 'stack' | 'stretcher' | 'flemish';

export type StoneLayout = 'coursed' | 'random' | 'cobblestone';

export interface BrickParams {
  bondPattern: BrickBondPattern;
  brickWidth: number;       // inches (default: 8)
  brickHeight: number;      // inches (default: 2.25)
  mortarWidth: number;      // inches (default: 0.375)
  mortarDepth: number;      // 0-1
  brickColorA: string;      // hex
  brickColorB: string;      // hex
  mortarColor: string;      // hex
  colorVariation: number;   // 0-1
  brickRoughness: number;   // 0-1
  mortarRoughness: number;  // 0-1
}

export interface StoneParams {
  layout: StoneLayout;
  stoneSize: number;        // inches (default: 12)
  sizeVariation: number;    // 0-1
  stoneColorA: string;      // hex (3-color palette)
  stoneColorB: string;
  stoneColorC: string;
  mortarColor: string;      // hex
  mortarWidth: number;      // inches
  surfaceRoughness: number; // 0-1
  grainIntensity: number;   // 0-1
}

export interface WeatheringParams {
  enabled: boolean;
  dirtIntensity: number;        // 0-1
  dirtColor: string;            // hex
  waterStainIntensity: number;  // 0-1
  mossIntensity: number;        // 0-1
  mossColor: string;            // hex
  ageFactor: number;            // 0-1
  edgeWearIntensity: number;    // 0-1
}

export interface ProceduralTextureConfig {
  type: ProceduralTextureType;
  brick?: BrickParams;
  stone?: StoneParams;
  weathering: WeatheringParams;
  worldScale: number; // feet per UV unit
}

export const DEFAULT_WEATHERING: WeatheringParams = {
  enabled: false,
  dirtIntensity: 0,
  dirtColor: '#3d2b1f',
  waterStainIntensity: 0,
  mossIntensity: 0,
  mossColor: '#2d5a27',
  ageFactor: 0,
  edgeWearIntensity: 0,
};

export const DEFAULT_BRICK_PARAMS: BrickParams = {
  bondPattern: 'running',
  brickWidth: 8,
  brickHeight: 2.25,
  mortarWidth: 0.375,
  mortarDepth: 0.5,
  brickColorA: '#8B4513',
  brickColorB: '#A0522D',
  mortarColor: '#C0B8A0',
  colorVariation: 0.3,
  brickRoughness: 0.7,
  mortarRoughness: 0.5,
};

export const DEFAULT_STONE_PARAMS: StoneParams = {
  layout: 'coursed',
  stoneSize: 12,
  sizeVariation: 0.3,
  stoneColorA: '#808080',
  stoneColorB: '#A0A0A0',
  stoneColorC: '#909090',
  mortarColor: '#C0B8A0',
  mortarWidth: 0.5,
  surfaceRoughness: 0.8,
  grainIntensity: 0.3,
};

/** Type guard for ProceduralTextureConfig */
export function isProceduralTexture(value: unknown): value is ProceduralTextureConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'weathering' in value &&
    ((value as any).type === 'brick' || (value as any).type === 'stone')
  );
}

/** Preset definition for the UI */
export interface ProceduralPreset {
  id: string;
  name: string;
  description: string;
  config: ProceduralTextureConfig;
}
