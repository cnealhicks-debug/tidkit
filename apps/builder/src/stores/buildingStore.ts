/**
 * TidKit Builder - Zustand Store
 * Global state management for building parameters
 */

import { create } from 'zustand';
import {
  BuildingParams,
  BuildingDimensions,
  RoofParams,
  RoofStyle,
  ModelScale,
  TextureAssignment,
  Opening,
  FloorConfig,
  InteriorConfig,
  Accessory,
  AccessoryType,
  AccessoryCategory,
  AccessoryPosition,
  ACCESSORY_PRESETS,
  DEFAULT_BUILDING,
  MODEL_SCALES,
  createFloors,
  calculateTotalHeight,
} from '@/types/building';

// Texture type from UI library (used for textures saved in local library)
export interface LibraryTexture {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  fullUrl: string;
  metadata: {
    realWidth: number;
    realHeight: number;
    pixelWidth: number;
    pixelHeight: number;
    isSeamless: boolean;
  };
  createdAt: number;
  isSample?: boolean;
}

// Surface types for the building
export type BuildingSurface = 'frontWall' | 'sideWalls' | 'backWall' | 'roof' | 'foundation' | 'trim';

// Extended texture assignment that can hold either API texture ID or library texture
export interface ExtendedTextureAssignment {
  frontWall?: string | LibraryTexture;
  sideWalls?: string | LibraryTexture;
  backWall?: string | LibraryTexture;
  roof?: string | LibraryTexture;
  foundation?: string | LibraryTexture;
  trim?: string | LibraryTexture;
}

interface BuildingState {
  // Building parameters
  params: BuildingParams;
  textures: ExtendedTextureAssignment;
  accessories: Accessory[];

  // UI state
  showWireframe: boolean;
  showDimensions: boolean;
  previewMode: '3d' | 'unfolded';

  // Actions - Dimensions
  setWidth: (width: number) => void;
  setDepth: (depth: number) => void;
  setHeight: (height: number) => void;
  setDimensions: (dimensions: Partial<BuildingDimensions>) => void;

  // Actions - Roof
  setRoofStyle: (style: RoofStyle) => void;
  setRoofPitch: (pitch: number) => void;
  setRoofOverhang: (overhang: number) => void;

  // Actions - Scale
  setScale: (scale: ModelScale) => void;
  setScaleByName: (name: string) => void;

  // Actions - Textures (supports both API IDs and library textures)
  setTexture: (surface: BuildingSurface, texture: string | LibraryTexture | null) => void;
  clearTextures: () => void;

  // Actions - Openings
  addOpening: (opening: Opening) => void;
  updateOpening: (id: string, updates: Partial<Opening>) => void;
  removeOpening: (id: string) => void;
  clearOpenings: () => void;

  // Actions - Floors (multi-story)
  setFloorCount: (count: number) => void;
  updateFloor: (id: string, updates: Partial<FloorConfig>) => void;
  setInteriorEnabled: (enabled: boolean) => void;
  updateInterior: (updates: Partial<InteriorConfig>) => void;

  // Actions - Accessories
  addAccessory: (accessory: Accessory) => void;
  updateAccessory: (id: string, updates: Partial<Accessory>) => void;
  removeAccessory: (id: string) => void;
  clearAccessories: () => void;

  // Actions - UI
  toggleWireframe: () => void;
  toggleDimensions: () => void;
  setPreviewMode: (mode: '3d' | 'unfolded') => void;

  // Actions - Reset
  resetToDefaults: () => void;

  // Computed - Get model dimensions in inches
  getModelDimensions: () => {
    widthInches: number;
    depthInches: number;
    heightInches: number;
  };
}

export const useBuildingStore = create<BuildingState>((set, get) => ({
  // Initial state
  params: DEFAULT_BUILDING,
  textures: {},
  accessories: [],
  showWireframe: false,
  showDimensions: true,
  previewMode: '3d',

  // Dimension actions
  setWidth: (width) =>
    set((state) => ({
      params: {
        ...state.params,
        dimensions: { ...state.params.dimensions, width },
      },
    })),

  setDepth: (depth) =>
    set((state) => ({
      params: {
        ...state.params,
        dimensions: { ...state.params.dimensions, depth },
      },
    })),

  setHeight: (height) =>
    set((state) => ({
      params: {
        ...state.params,
        dimensions: { ...state.params.dimensions, height },
      },
    })),

  setDimensions: (dimensions) =>
    set((state) => ({
      params: {
        ...state.params,
        dimensions: { ...state.params.dimensions, ...dimensions },
      },
    })),

  // Roof actions
  setRoofStyle: (style) =>
    set((state) => ({
      params: {
        ...state.params,
        roof: {
          ...state.params.roof,
          style,
          // Reset pitch for flat roofs
          pitch: style === 'flat' ? 0 : state.params.roof.pitch || 30,
        },
      },
    })),

  setRoofPitch: (pitch) =>
    set((state) => ({
      params: {
        ...state.params,
        roof: { ...state.params.roof, pitch },
      },
    })),

  setRoofOverhang: (overhang) =>
    set((state) => ({
      params: {
        ...state.params,
        roof: { ...state.params.roof, overhang },
      },
    })),

  // Scale actions
  setScale: (scale) =>
    set((state) => ({
      params: { ...state.params, scale },
    })),

  setScaleByName: (name) => {
    const scale = MODEL_SCALES.find((s) => s.name === name);
    if (scale) {
      set((state) => ({
        params: { ...state.params, scale },
      }));
    }
  },

  // Texture actions (supports both API IDs and library textures)
  setTexture: (surface, texture) =>
    set((state) => ({
      textures: texture === null
        ? Object.fromEntries(
            Object.entries(state.textures).filter(([key]) => key !== surface)
          )
        : { ...state.textures, [surface]: texture },
    })),

  clearTextures: () =>
    set({
      textures: {},
    }),

  // Opening actions
  addOpening: (opening) =>
    set((state) => ({
      params: {
        ...state.params,
        openings: [...state.params.openings, opening],
      },
    })),

  updateOpening: (id, updates) =>
    set((state) => ({
      params: {
        ...state.params,
        openings: state.params.openings.map((o) =>
          o.id === id ? { ...o, ...updates } : o
        ),
      },
    })),

  removeOpening: (id) =>
    set((state) => ({
      params: {
        ...state.params,
        openings: state.params.openings.filter((o) => o.id !== id),
      },
    })),

  clearOpenings: () =>
    set((state) => ({
      params: {
        ...state.params,
        openings: [],
      },
    })),

  // Floor actions (multi-story)
  setFloorCount: (count) =>
    set((state) => {
      const floors = createFloors(Math.max(1, Math.min(10, count)));
      const totalHeight = calculateTotalHeight(floors);
      return {
        params: {
          ...state.params,
          floors,
          dimensions: {
            ...state.params.dimensions,
            height: totalHeight,
          },
          // Clear openings when changing floor count (they may be invalid)
          openings: state.params.openings.filter(o => o.floor < count),
        },
      };
    }),

  updateFloor: (id, updates) =>
    set((state) => {
      const floors = state.params.floors.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      );
      const totalHeight = calculateTotalHeight(floors);
      return {
        params: {
          ...state.params,
          floors,
          dimensions: {
            ...state.params.dimensions,
            height: totalHeight,
          },
        },
      };
    }),

  setInteriorEnabled: (enabled) =>
    set((state) => ({
      params: {
        ...state.params,
        interior: {
          ...state.params.interior,
          enabled,
        },
      },
    })),

  updateInterior: (updates) =>
    set((state) => ({
      params: {
        ...state.params,
        interior: {
          ...state.params.interior,
          ...updates,
        },
      },
    })),

  // Accessory actions
  addAccessory: (accessory) =>
    set((state) => ({
      accessories: [...state.accessories, accessory],
    })),

  updateAccessory: (id, updates) =>
    set((state) => ({
      accessories: state.accessories.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  removeAccessory: (id) =>
    set((state) => ({
      accessories: state.accessories.filter((a) => a.id !== id),
    })),

  clearAccessories: () =>
    set({
      accessories: [],
    }),

  // UI actions
  toggleWireframe: () =>
    set((state) => ({ showWireframe: !state.showWireframe })),

  toggleDimensions: () =>
    set((state) => ({ showDimensions: !state.showDimensions })),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  // Reset
  resetToDefaults: () =>
    set({
      params: DEFAULT_BUILDING,
      textures: {},
      accessories: [],
    }),

  // Computed: Convert real-world feet to model inches
  getModelDimensions: () => {
    const { dimensions, scale } = get().params;
    const feetToInches = 12;

    return {
      widthInches: (dimensions.width * feetToInches) / scale.ratio,
      depthInches: (dimensions.depth * feetToInches) / scale.ratio,
      heightInches: (dimensions.height * feetToInches) / scale.ratio,
    };
  },
}));
