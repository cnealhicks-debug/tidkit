/**
 * TidKit Studio - Zustand Store
 * Global state management for texture processing
 */

import { create } from 'zustand';
import type { TextureFile, ProcessingOptions, TextureMetadata } from '@/types/texture';
import type { ModelScale, TextureCategory } from '@tidkit/config';
import { MODEL_SCALES, TEXTURE_CATEGORIES } from '@tidkit/config';

interface TextureState {
  // Current texture
  currentTexture: TextureFile | null;
  processedTexture: TextureFile | null;

  // Processing options
  options: ProcessingOptions;

  // Scale settings
  selectedScale: ModelScale;
  realWidth: number;   // Inches
  realHeight: number;  // Inches

  // Category
  selectedCategory: TextureCategory;
  tags: string[];

  // UI state
  isProcessing: boolean;
  showPreview: boolean;
  previewTiled: boolean;

  // Actions
  setCurrentTexture: (texture: TextureFile | null) => void;
  setProcessedTexture: (texture: TextureFile | null) => void;
  updateOptions: (options: Partial<ProcessingOptions>) => void;
  setScale: (scale: ModelScale) => void;
  setRealDimensions: (width: number, height: number) => void;
  setCategory: (category: TextureCategory) => void;
  setTags: (tags: string[]) => void;
  setProcessing: (isProcessing: boolean) => void;
  togglePreview: () => void;
  toggleTiled: () => void;
  reset: () => void;

  // Computed
  getCalculatedDPI: () => number;
  getMetadata: () => TextureMetadata;
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  makeSeamless: false,
  seamlessMethod: 'smart',
  blendWidth: 15,
  resampleMethod: 'bicubic',
  autoLevels: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  outputFormat: 'png',
  quality: 90,
};

export const useTextureStore = create<TextureState>((set, get) => ({
  // Initial state
  currentTexture: null,
  processedTexture: null,
  options: DEFAULT_OPTIONS,
  selectedScale: MODEL_SCALES.find((s) => s.name === 'HO')!,
  realWidth: 12,   // 1 foot default
  realHeight: 12,
  selectedCategory: TEXTURE_CATEGORIES[0],
  tags: [],
  isProcessing: false,
  showPreview: true,
  previewTiled: false,

  // Actions
  setCurrentTexture: (texture) =>
    set({
      currentTexture: texture,
      processedTexture: null, // Clear processed when new texture loaded
    }),

  setProcessedTexture: (texture) => set({ processedTexture: texture }),

  updateOptions: (newOptions) =>
    set((state) => ({
      options: { ...state.options, ...newOptions },
    })),

  setScale: (scale) => set({ selectedScale: scale }),

  setRealDimensions: (width, height) =>
    set({ realWidth: width, realHeight: height }),

  setCategory: (category) => set({ selectedCategory: category }),

  setTags: (tags) => set({ tags }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  togglePreview: () => set((state) => ({ showPreview: !state.showPreview })),

  toggleTiled: () => set((state) => ({ previewTiled: !state.previewTiled })),

  reset: () =>
    set({
      currentTexture: null,
      processedTexture: null,
      options: DEFAULT_OPTIONS,
      tags: [],
    }),

  // Computed
  getCalculatedDPI: () => {
    const { currentTexture, realWidth } = get();
    if (!currentTexture) return 0;

    // DPI = pixels / inches
    return currentTexture.metadata.pixelWidth / realWidth;
  },

  getMetadata: () => {
    const {
      currentTexture,
      selectedScale,
      realWidth,
      realHeight,
      selectedCategory,
      tags,
      options,
    } = get();

    const pixelWidth = currentTexture?.metadata.pixelWidth || 0;
    const pixelHeight = currentTexture?.metadata.pixelHeight || 0;
    const dpi = pixelWidth / realWidth;

    return {
      scale: selectedScale,
      realWidth,
      realHeight,
      pixelWidth,
      pixelHeight,
      dpi: Math.round(dpi),
      category: selectedCategory,
      tags,
      isSeamless: options.makeSeamless,
    };
  },
}));
