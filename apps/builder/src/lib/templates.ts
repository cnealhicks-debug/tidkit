/**
 * TidKit Builder - Building Templates
 * Pre-configured building presets for common structures
 */

import { BuildingParams, RoofStyle, ModelScale, MODEL_SCALES, DEFAULT_FLOORS, DEFAULT_INTERIOR, createFloors, Opening } from '@/types/building';

export interface BuildingTemplate {
  id: string;
  name: string;
  description: string;
  category: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'misc';
  thumbnail?: string;
  params: BuildingParams;
}

// Helper to find scale by name
const getScale = (name: string): ModelScale => {
  return MODEL_SCALES.find(s => s.name === name) || MODEL_SCALES.find(s => s.name === 'HO')!;
};

// Helper to create params with default openings and floors
const createParams = (
  dimensions: { width: number; depth: number; height: number },
  roof: { style: RoofStyle; pitch: number; overhang: number },
  scaleName: string = 'HO',
  storyCount: number = 1,
  openings: Opening[] = []
): BuildingParams => ({
  dimensions,
  roof,
  scale: getScale(scaleName),
  openings,
  floors: createFloors(storyCount, dimensions.height / storyCount),
  interior: DEFAULT_INTERIOR,
});

export const BUILDING_TEMPLATES: BuildingTemplate[] = [
  // === RESIDENTIAL ===
  {
    id: 'small-house',
    name: 'Small House',
    description: 'A cozy single-story cottage with gable roof',
    category: 'residential',
    params: createParams({ width: 24, depth: 20, height: 9 }, { style: 'gable', pitch: 35, overhang: 1 }),
  },
  {
    id: 'ranch-house',
    name: 'Ranch House',
    description: 'Long, single-story ranch-style home',
    category: 'residential',
    params: createParams({ width: 50, depth: 28, height: 10 }, { style: 'hip', pitch: 25, overhang: 2 }),
  },
  {
    id: 'two-story-house',
    name: 'Two-Story House',
    description: 'Traditional two-story family home',
    category: 'residential',
    params: createParams({ width: 30, depth: 24, height: 18 }, { style: 'gable', pitch: 40, overhang: 1.5 }, 'HO', 2),
  },
  {
    id: 'cabin',
    name: 'Cabin',
    description: 'Rustic mountain cabin with steep roof',
    category: 'residential',
    params: createParams({ width: 18, depth: 16, height: 8 }, { style: 'gable', pitch: 50, overhang: 2 }),
  },
  {
    id: 'modern-house',
    name: 'Modern House',
    description: 'Contemporary home with flat roof',
    category: 'residential',
    params: createParams({ width: 40, depth: 30, height: 12 }, { style: 'flat', pitch: 0, overhang: 1 }),
  },
  {
    id: 'saltbox-house',
    name: 'Saltbox House',
    description: 'Colonial-era asymmetric roof home',
    category: 'residential',
    params: createParams({ width: 28, depth: 22, height: 10 }, { style: 'saltbox', pitch: 45, overhang: 1.5 }),
  },
  {
    id: 'townhouse',
    name: 'Townhouse',
    description: 'Urban row house with mansard roof',
    category: 'residential',
    params: createParams({ width: 16, depth: 40, height: 20 }, { style: 'mansard', pitch: 70, overhang: 0.5 }, 'HO', 2),
  },
  {
    id: 'victorian-house',
    name: 'Victorian House',
    description: 'Ornate Victorian-era home (3 stories)',
    category: 'residential',
    params: createParams({ width: 35, depth: 28, height: 30 }, { style: 'mansard', pitch: 65, overhang: 2 }, 'HO', 3),
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    description: 'Classic American farmhouse',
    category: 'residential',
    params: createParams({ width: 32, depth: 26, height: 18 }, { style: 'gable', pitch: 40, overhang: 2 }, 'HO', 2),
  },
  {
    id: 'bungalow',
    name: 'Bungalow',
    description: 'Craftsman-style bungalow',
    category: 'residential',
    params: createParams({ width: 30, depth: 22, height: 9 }, { style: 'gable', pitch: 30, overhang: 3 }),
  },

  // === COMMERCIAL ===
  {
    id: 'small-shop',
    name: 'Small Shop',
    description: 'Main street storefront building',
    category: 'commercial',
    params: createParams({ width: 20, depth: 40, height: 14 }, { style: 'flat', pitch: 0, overhang: 0.5 }),
  },
  {
    id: 'general-store',
    name: 'General Store',
    description: 'Classic general store with gable front',
    category: 'commercial',
    params: createParams({ width: 30, depth: 50, height: 16 }, { style: 'gable', pitch: 30, overhang: 1 }),
  },
  {
    id: 'office-building',
    name: 'Office Building',
    description: 'Small commercial office building (2 stories)',
    category: 'commercial',
    params: createParams({ width: 40, depth: 35, height: 24 }, { style: 'flat', pitch: 0, overhang: 0.5 }, 'HO', 2),
  },
  {
    id: 'gas-station',
    name: 'Gas Station',
    description: 'Service station with canopy roof',
    category: 'commercial',
    params: createParams({ width: 24, depth: 20, height: 10 }, { style: 'flat', pitch: 0, overhang: 8 }),
  },
  {
    id: 'bank',
    name: 'Bank',
    description: 'Classic bank building with hip roof',
    category: 'commercial',
    params: createParams({ width: 40, depth: 50, height: 18 }, { style: 'hip', pitch: 25, overhang: 2 }),
  },
  {
    id: 'hotel',
    name: 'Hotel',
    description: 'Three-story hotel with mansard roof',
    category: 'commercial',
    params: createParams({ width: 50, depth: 40, height: 36 }, { style: 'mansard', pitch: 60, overhang: 1 }, 'HO', 3),
  },
  {
    id: 'diner',
    name: 'Diner',
    description: 'Classic American roadside diner',
    category: 'commercial',
    params: createParams({ width: 40, depth: 20, height: 12 }, { style: 'flat', pitch: 0, overhang: 1 }),
  },
  {
    id: 'train-station',
    name: 'Train Station',
    description: 'Small town passenger depot',
    category: 'commercial',
    params: createParams({ width: 30, depth: 80, height: 14 }, { style: 'hip', pitch: 30, overhang: 4 }),
  },
  {
    id: 'post-office',
    name: 'Post Office',
    description: 'Town post office building',
    category: 'commercial',
    params: createParams({ width: 30, depth: 35, height: 14 }, { style: 'hip', pitch: 25, overhang: 1.5 }),
  },

  // === INDUSTRIAL ===
  {
    id: 'small-warehouse',
    name: 'Small Warehouse',
    description: 'Basic storage warehouse',
    category: 'industrial',
    params: createParams({ width: 40, depth: 60, height: 20 }, { style: 'gable', pitch: 20, overhang: 1 }),
  },
  {
    id: 'large-warehouse',
    name: 'Large Warehouse',
    description: 'Industrial distribution center',
    category: 'industrial',
    params: createParams({ width: 80, depth: 120, height: 30 }, { style: 'gable', pitch: 15, overhang: 2 }),
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Manufacturing facility with saw-tooth roof',
    category: 'industrial',
    params: createParams({ width: 60, depth: 100, height: 25 }, { style: 'shed', pitch: 15, overhang: 1 }),
  },
  {
    id: 'engine-house',
    name: 'Engine House',
    description: 'Railroad engine maintenance building',
    category: 'industrial',
    params: createParams({ width: 30, depth: 80, height: 22 }, { style: 'gable', pitch: 25, overhang: 1.5 }),
  },
  {
    id: 'freight-depot',
    name: 'Freight Depot',
    description: 'Railroad freight handling facility',
    category: 'industrial',
    params: createParams({ width: 35, depth: 100, height: 18 }, { style: 'gable', pitch: 22, overhang: 4 }),
  },

  // === AGRICULTURAL ===
  {
    id: 'barn',
    name: 'Barn',
    description: 'Traditional red barn with gambrel roof',
    category: 'agricultural',
    params: createParams({ width: 36, depth: 48, height: 16 }, { style: 'gambrel', pitch: 60, overhang: 2 }),
  },
  {
    id: 'dairy-barn',
    name: 'Dairy Barn',
    description: 'Large dairy barn with gambrel roof',
    category: 'agricultural',
    params: createParams({ width: 50, depth: 80, height: 20 }, { style: 'gambrel', pitch: 55, overhang: 2.5 }),
  },
  {
    id: 'small-barn',
    name: 'Small Barn',
    description: 'Compact storage barn',
    category: 'agricultural',
    params: createParams({ width: 24, depth: 30, height: 12 }, { style: 'gable', pitch: 40, overhang: 1.5 }),
  },
  {
    id: 'chicken-coop',
    name: 'Chicken Coop',
    description: 'Small poultry house',
    category: 'agricultural',
    params: createParams({ width: 8, depth: 12, height: 6 }, { style: 'shed', pitch: 20, overhang: 1 }),
  },
  {
    id: 'grain-elevator',
    name: 'Grain Elevator',
    description: 'Tall grain storage building',
    category: 'agricultural',
    params: createParams({ width: 20, depth: 20, height: 60 }, { style: 'gable', pitch: 30, overhang: 1 }),
  },
  {
    id: 'farm-shed',
    name: 'Farm Shed',
    description: 'Open equipment storage shed',
    category: 'agricultural',
    params: createParams({ width: 20, depth: 30, height: 10 }, { style: 'shed', pitch: 15, overhang: 3 }),
  },

  // === MISC ===
  {
    id: 'guard-shack',
    name: 'Guard Shack',
    description: 'Small security checkpoint',
    category: 'misc',
    params: createParams({ width: 8, depth: 8, height: 8 }, { style: 'hip', pitch: 30, overhang: 1 }),
  },
  {
    id: 'outhouse',
    name: 'Outhouse',
    description: 'Classic outdoor privy',
    category: 'misc',
    params: createParams({ width: 4, depth: 4, height: 7 }, { style: 'shed', pitch: 20, overhang: 0.5 }),
  },
  {
    id: 'phone-booth',
    name: 'Phone Booth',
    description: 'Vintage telephone booth',
    category: 'misc',
    params: createParams({ width: 3, depth: 3, height: 8 }, { style: 'flat', pitch: 0, overhang: 0.25 }),
  },
  {
    id: 'water-tower-base',
    name: 'Water Tower Base',
    description: 'Support structure for water tower',
    category: 'misc',
    params: createParams({ width: 12, depth: 12, height: 30 }, { style: 'flat', pitch: 0, overhang: 0.5 }),
  },
  {
    id: 'church',
    name: 'Church',
    description: 'Small town church with steeple',
    category: 'misc',
    params: createParams({ width: 30, depth: 50, height: 20 }, { style: 'gable', pitch: 50, overhang: 1 }),
  },
  {
    id: 'schoolhouse',
    name: 'Schoolhouse',
    description: 'One-room country schoolhouse',
    category: 'misc',
    params: createParams({ width: 24, depth: 30, height: 12 }, { style: 'gable', pitch: 35, overhang: 1.5 }),
  },
  {
    id: 'firehouse',
    name: 'Fire House',
    description: 'Vintage fire station with bell tower',
    category: 'misc',
    params: createParams({ width: 30, depth: 40, height: 16 }, { style: 'gable', pitch: 30, overhang: 1 }),
  },
  {
    id: 'gazebo',
    name: 'Gazebo',
    description: 'Park gazebo with hip roof',
    category: 'misc',
    params: createParams({ width: 12, depth: 12, height: 10 }, { style: 'hip', pitch: 35, overhang: 3 }),
  },
  {
    id: 'bandstand',
    name: 'Bandstand',
    description: 'Town square bandstand',
    category: 'misc',
    params: createParams({ width: 20, depth: 20, height: 14 }, { style: 'hip', pitch: 40, overhang: 4 }),
  },
  {
    id: 'covered-bridge',
    name: 'Covered Bridge',
    description: 'Historic covered bridge section',
    category: 'misc',
    params: createParams({ width: 16, depth: 60, height: 14 }, { style: 'gable', pitch: 45, overhang: 0.5 }),
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): BuildingTemplate[] {
  return BUILDING_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all categories with counts
 */
export function getCategories(): { name: string; count: number }[] {
  const categories = ['residential', 'commercial', 'industrial', 'agricultural', 'misc'];
  return categories.map(cat => ({
    name: cat,
    count: BUILDING_TEMPLATES.filter(t => t.category === cat).length,
  }));
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): BuildingTemplate | undefined {
  return BUILDING_TEMPLATES.find(t => t.id === id);
}

/**
 * Apply template to store (creates a copy with current scale preserved)
 */
export function applyTemplate(template: BuildingTemplate, currentScale: ModelScale): BuildingParams {
  return {
    ...template.params,
    scale: currentScale, // Preserve user's selected scale
    openings: [], // Start with no openings when applying a template
    floors: template.params.floors || DEFAULT_FLOORS,
    interior: template.params.interior || DEFAULT_INTERIOR,
  };
}
