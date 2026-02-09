/**
 * TidKit Studio - Texture Types
 * Type definitions for texture processing and metadata
 */

import type { ModelScale, TextureCategory } from '@tidkit/config';

export interface TextureMetadata {
  // Scale information
  scale: ModelScale;
  realWidth: number;    // Real-world width in inches
  realHeight: number;   // Real-world height in inches

  // Image dimensions
  pixelWidth: number;
  pixelHeight: number;
  dpi: number;          // Calculated DPI for true scale

  // Category and tags
  category: TextureCategory;
  tags: string[];

  // Processing state
  isSeamless: boolean;
  originalUrl?: string;
}

export interface TextureFile {
  id: string;
  name: string;
  file: File | Blob;
  url: string;          // Object URL for preview
  metadata: TextureMetadata;
  thumbnail?: string;
}

export interface ProcessingOptions {
  // Seamless generation
  makeSeamless: boolean;
  seamlessMethod: 'blend' | 'mirror' | 'smart';
  blendWidth: number;   // Percentage of image width for blending

  // Scale adjustment
  targetScale?: ModelScale;
  resampleMethod: 'nearest' | 'bilinear' | 'bicubic';

  // Color correction
  autoLevels: boolean;
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100

  // Output
  outputFormat: 'png' | 'jpeg' | 'webp';
  quality: number;      // 1-100 for lossy formats
}

export interface ProcessingResult {
  success: boolean;
  texture?: TextureFile;
  error?: string;
  processingTime: number;
}

export interface ScaleDetectionResult {
  detected: boolean;
  scale?: ModelScale;
  confidence: number;   // 0-1
  referenceObject?: string;
  measurements?: {
    pixelWidth: number;
    realWidth: number;
  };
}

// Camera capture state
export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  facingMode: 'user' | 'environment';
  stream?: MediaStream;
}

// Reference card dimensions (for scale detection)
export const REFERENCE_CARD = {
  width: 3.375,   // Standard credit card width in inches
  height: 2.125,  // Standard credit card height in inches
  aspectRatio: 3.375 / 2.125,
};
