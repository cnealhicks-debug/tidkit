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
  MaterialType,
  MaterialConfig,
  JointMethod,
  MATERIAL_PROPERTIES,
  DEFAULT_MATERIAL,
  ACCESSORY_PRESETS,
  DEFAULT_BUILDING,
  MODEL_SCALES,
  createFloors,
  calculateTotalHeight,
} from '@/types/building';
import type { ProceduralTextureConfig } from '@/types/procedural';
import { isProceduralTexture } from '@/types/procedural';

export { isProceduralTexture };

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

// Extended texture assignment that can hold API texture ID, library texture, or procedural config
export type TextureValue = string | LibraryTexture | ProceduralTextureConfig;

export interface ExtendedTextureAssignment {
  frontWall?: TextureValue;
  sideWalls?: TextureValue;
  backWall?: TextureValue;
  roof?: TextureValue;
  foundation?: TextureValue;
  trim?: TextureValue;
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

  // Actions - Textures (supports API IDs, library textures, and procedural configs)
  setTexture: (surface: BuildingSurface, texture: TextureValue | null) => void;
  clearTextures: () => void;

  // Actions - Procedural Textures
  setProceduralTexture: (surface: BuildingSurface, config: ProceduralTextureConfig) => void;
  updateProceduralParam: (surface: BuildingSurface, path: string, value: any) => void;
  applyProceduralPreset: (surface: BuildingSurface, config: ProceduralTextureConfig) => void;

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

  // Actions - Material
  setMaterialType: (type: MaterialType) => void;
  setMaterialThickness: (thickness: number) => void;
  setJointMethod: (method: JointMethod) => void;
  setGenerateFacades: (generate: boolean) => void;

  // Actions - Architectural Details
  setTrimStyle: (style: import('@/types/building').TrimStyle) => void;
  setWallDetails: (details: Partial<import('@/types/building').WallDetails>) => void;
  setRoofTrim: (trim: Partial<import('@/types/building').RoofTrim>) => void;

  // Actions - Accessories
  addAccessory: (accessory: Accessory) => void;
  updateAccessory: (id: string, updates: Partial<Accessory>) => void;
  removeAccessory: (id: string) => void;
  clearAccessories: () => void;

  // Actions - UI
  toggleWireframe: () => void;
  toggleDimensions: () => void;
  setPreviewMode: (mode: '3d' | 'unfolded') => void;

  // Actions - Projects
  loadProject: (params: BuildingParams, textures: ExtendedTextureAssignment, accessories: Accessory[]) => void;

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

  // Procedural texture actions
  setProceduralTexture: (surface, config) =>
    set((state) => ({
      textures: { ...state.textures, [surface]: config },
    })),

  updateProceduralParam: (surface, path, value) =>
    set((state) => {
      const existing = state.textures[surface];
      if (!existing || !isProceduralTexture(existing)) return state;
      // Deep update via dot-notation path (e.g., "brick.brickColorA" or "weathering.dirtIntensity")
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(existing)) as ProceduralTextureConfig;
      let target: any = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
        if (!target) return state;
      }
      target[parts[parts.length - 1]] = value;
      return { textures: { ...state.textures, [surface]: updated } };
    }),

  applyProceduralPreset: (surface, config) =>
    set((state) => ({
      textures: { ...state.textures, [surface]: JSON.parse(JSON.stringify(config)) },
    })),

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

  // Material actions
  setMaterialType: (type) =>
    set((state) => {
      const props = MATERIAL_PROPERTIES[type];
      return {
        params: {
          ...state.params,
          material: {
            type,
            thickness: props.defaultThickness,
            jointMethod: props.defaultJointMethod,
            generateFacades: !props.foldable, // auto-enable for non-foldable materials
          },
        },
      };
    }),

  setMaterialThickness: (thickness) =>
    set((state) => {
      const current = state.params.material || DEFAULT_MATERIAL;
      return {
        params: {
          ...state.params,
          material: { ...current, thickness },
        },
      };
    }),

  setJointMethod: (method) =>
    set((state) => {
      const current = state.params.material || DEFAULT_MATERIAL;
      return {
        params: {
          ...state.params,
          material: { ...current, jointMethod: method },
        },
      };
    }),

  setGenerateFacades: (generate) =>
    set((state) => {
      const current = state.params.material || DEFAULT_MATERIAL;
      return {
        params: {
          ...state.params,
          material: { ...current, generateFacades: generate },
        },
      };
    }),

  // Architectural detail actions
  setTrimStyle: (style) =>
    set((state) => ({
      params: { ...state.params, trimStyle: style },
    })),

  setWallDetails: (details) =>
    set((state) => ({
      params: {
        ...state.params,
        wallDetails: { ...{ cornerBoards: false, baseboard: false, beltCourse: false, wainscoting: false, quoins: false }, ...state.params.wallDetails, ...details },
      },
    })),

  setRoofTrim: (trim) =>
    set((state) => ({
      params: {
        ...state.params,
        roofTrim: { ...{ fascia: false, bargeboard: false, ridgeCap: false }, ...state.params.roofTrim, ...trim },
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

  // Project loading
  loadProject: (params, textures, accessories) =>
    set({ params, textures, accessories }),

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
