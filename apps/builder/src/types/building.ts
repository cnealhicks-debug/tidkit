/**
 * TidKit Builder - Building Types
 * Type definitions for parametric building generation
 */

// Re-export shared types
export type { ModelScale } from '@tidkit/config';
import { MODEL_SCALES as SHARED_SCALES, type ModelScale } from '@tidkit/config';

export type RoofStyle = 'flat' | 'gable' | 'hip' | 'shed' | 'gambrel' | 'mansard' | 'saltbox';

// =============================================================================
// Material Types
// =============================================================================

export type MaterialType = 'paper' | 'foamcore' | 'plywood' | 'chipboard';

export type JointMethod = 'glue-tab' | 'butt' | 'slot-tab' | 'miter';

export interface MaterialConfig {
  type: MaterialType;
  thickness: number;       // In inches (model scale)
  jointMethod: JointMethod;
  generateFacades: boolean; // Whether to generate separate texture facade sheets
}

export interface MaterialProperties {
  label: string;
  description: string;
  icon: string;
  foldable: boolean;
  conditionalFold?: boolean; // true for chipboard (foldable if thin enough)
  maxFoldThickness?: number; // Max thickness in inches for folding (chipboard)
  thicknessOptions: { label: string; value: number }[];
  jointMethods: JointMethod[];
  defaultJointMethod: JointMethod;
  defaultThickness: number;
  exportTip: string;
  assemblySteps: string[];
}

export const MATERIAL_PROPERTIES: Record<MaterialType, MaterialProperties> = {
  paper: {
    label: 'Paper/Cardstock',
    description: 'Traditional papercraft — fold and glue',
    icon: '📄',
    foldable: true,
    thicknessOptions: [
      { label: '65 lb', value: 0.008 },
      { label: '80 lb', value: 0.01 },
      { label: '110 lb', value: 0.012 },
    ],
    jointMethods: ['glue-tab'],
    defaultJointMethod: 'glue-tab',
    defaultThickness: 0.01,
    exportTip: 'For best results, print at 100% scale (no scaling). Use high-quality cardstock (65-110 lb) for sturdier models.',
    assemblySteps: [
      'Print the pattern at 100% scale (no scaling)',
      'Cut along solid black lines',
      'Score and fold along dashed lines (red = mountain, blue = valley)',
      'Apply glue to gray tabs and assemble walls into a box',
      'Attach roof panels, folding at the ridge',
      'Glue gable ends (if applicable) to close the roof',
    ],
  },
  foamcore: {
    label: 'Foamcore',
    description: 'Rigid foam board — separate flat panels',
    icon: '🧱',
    foldable: false,
    thicknessOptions: [
      { label: '3mm', value: 0.118 },
      { label: '5mm', value: 0.197 },
      { label: '10mm', value: 0.394 },
    ],
    jointMethods: ['butt', 'miter'],
    defaultJointMethod: 'butt',
    defaultThickness: 0.197,
    exportTip: 'Print facade sheets on paper and glue onto foamcore panels. Cut foamcore panels to the structural dimensions shown.',
    assemblySteps: [
      'Cut foamcore panels to the dimensions shown (all edges are cut lines)',
      'Front and back panels are full width; left and right panels are shortened by 2x material thickness',
      'Glue side panels between front and back panels at butt joints',
      'Print facade sheets separately and glue onto structural panels for texture',
      'Attach roof panels on top',
    ],
  },
  plywood: {
    label: 'Plywood/MDF',
    description: 'Thin wood — slot-and-tab or butt joints',
    icon: '🪵',
    foldable: false,
    thicknessOptions: [
      { label: '1/16"', value: 0.0625 },
      { label: '1/8"', value: 0.125 },
      { label: '3/16"', value: 0.1875 },
      { label: '1/4"', value: 0.25 },
    ],
    jointMethods: ['butt', 'slot-tab', 'miter'],
    defaultJointMethod: 'slot-tab',
    defaultThickness: 0.125,
    exportTip: 'Use the structural panel outlines as cutting templates for wood. Facade sheets can be printed on paper and glued on. DXF export is available for laser cutters.',
    assemblySteps: [
      'Transfer or print panel outlines onto plywood/MDF as cutting guides',
      'Cut panels using scroll saw, laser cutter, or CNC',
      'If using slot-and-tab joints: insert tabs into matching slots and glue',
      'If using butt joints: glue panels edge-to-face at corners',
      'If using mitered joints: cut 45° bevels on mating edges and glue',
      'Print facade sheets on paper and glue onto structural panels',
      'Attach roof panels',
    ],
  },
  chipboard: {
    label: 'Chipboard/Matboard',
    description: 'Thick card — score and fold or separate panels',
    icon: '📋',
    foldable: false,
    conditionalFold: true,
    maxFoldThickness: 0.04, // ~1mm — above this, use separate panels
    thicknessOptions: [
      { label: '0.5mm', value: 0.02 },
      { label: '1mm', value: 0.04 },
      { label: '1/16"', value: 0.0625 },
    ],
    jointMethods: ['butt', 'miter'],
    defaultJointMethod: 'butt',
    defaultThickness: 0.04,
    exportTip: 'For thin chipboard (< 1mm), score fold lines deeply with a craft knife. For thicker matboard, cut separate panels and butt-join them.',
    assemblySteps: [
      'Cut panels along solid lines using a craft knife and straightedge',
      'For thin chipboard: score fold lines deeply (do not cut through), then fold',
      'For thick matboard: cut separate panels and glue at butt joints',
      'Print facade sheets separately and glue onto structural panels for texture',
      'Attach roof panels',
    ],
  },
};

export const DEFAULT_MATERIAL: MaterialConfig = {
  type: 'paper',
  thickness: MATERIAL_PROPERTIES.paper.defaultThickness,
  jointMethod: MATERIAL_PROPERTIES.paper.defaultJointMethod,
  generateFacades: false,
};

// Roof style descriptions for UI
export const ROOF_STYLE_INFO: Record<RoofStyle, { label: string; description: string; icon: string }> = {
  flat: { label: 'Flat', description: 'Simple flat roof', icon: '▭' },
  gable: { label: 'Gable', description: 'Classic triangular roof', icon: '△' },
  hip: { label: 'Hip', description: 'All sides slope down', icon: '◇' },
  shed: { label: 'Shed', description: 'Single sloped roof', icon: '⟋' },
  gambrel: { label: 'Gambrel', description: 'Barn-style dual slope', icon: '⌂' },
  mansard: { label: 'Mansard', description: 'Four-sided steep lower slope', icon: '⎈' },
  saltbox: { label: 'Saltbox', description: 'Asymmetric gable', icon: '⟍' },
};

export interface BuildingDimensions {
  // Real-world dimensions in feet
  width: number;   // Front to back
  depth: number;   // Side to side
  height: number;  // Wall height (not including roof)
}

// Floor/story configuration
export interface FloorConfig {
  id: string;
  name: string;
  height: number;        // Height of this floor in feet
  hasFloor: boolean;     // Include floor panel (false for ground floor usually)
  hasCeiling: boolean;   // Include ceiling panel
}

// Interior surface options
export interface InteriorConfig {
  enabled: boolean;
  wallThickness: number;  // In inches (for tab generation)
  includeFloors: boolean;
  includeCeilings: boolean;
}

export interface RoofParams {
  style: RoofStyle;
  pitch: number;     // Roof pitch in degrees (0 for flat)
  overhang: number;  // Overhang in feet
}

// =============================================================================
// Trim & Detail Types
// =============================================================================

export type TrimStyle = 'none' | 'simple' | 'colonial' | 'craftsman' | 'victorian';

export interface TrimProfile {
  label: string;
  description: string;
  frameWidth: number;    // Inches — frame strip width around opening
  sillDepth: number;     // Inches — sill projection depth
  sillExtension: number; // Inches — how far sill extends past frame on each side
  headerHeight: number;  // Inches — header/lintel height above opening frame
  headerExtension: number; // Inches — header extends past frame on each side
}

export const TRIM_PROFILES: Record<TrimStyle, TrimProfile | null> = {
  none: null,
  simple: {
    label: 'Simple',
    description: 'Clean flat frame on all sides',
    frameWidth: 0.04,
    sillDepth: 0.02,
    sillExtension: 0,
    headerHeight: 0.04,
    headerExtension: 0,
  },
  colonial: {
    label: 'Colonial',
    description: 'Classic trim with header cap and extended sill',
    frameWidth: 0.06,
    sillDepth: 0.04,
    sillExtension: 0.03,
    headerHeight: 0.08,
    headerExtension: 0.03,
  },
  craftsman: {
    label: 'Craftsman',
    description: 'Bold flat trim with thick sill and header board',
    frameWidth: 0.08,
    sillDepth: 0.06,
    sillExtension: 0.04,
    headerHeight: 0.1,
    headerExtension: 0.04,
  },
  victorian: {
    label: 'Victorian',
    description: 'Ornate trim with decorative header and sill brackets',
    frameWidth: 0.06,
    sillDepth: 0.05,
    sillExtension: 0.04,
    headerHeight: 0.12,
    headerExtension: 0.04,
  },
};

export interface WallDetails {
  cornerBoards: boolean;
  baseboard: boolean;
  beltCourse: boolean;
  wainscoting: boolean;
  quoins: boolean;
}

export interface RoofTrim {
  fascia: boolean;
  bargeboard: boolean;
  ridgeCap: boolean;
  bargeboardStyle?: 'plain' | 'scalloped' | 'gingerbread';
}

export interface BuildingParams {
  dimensions: BuildingDimensions;
  roof: RoofParams;
  scale: ModelScale;
  openings: Opening[];
  // Multi-story support
  floors: FloorConfig[];
  interior: InteriorConfig;
  // Material type (optional — defaults to paper for backward compatibility)
  material?: MaterialConfig;
  // Architectural details (optional — all default to off)
  trimStyle?: TrimStyle;
  wallDetails?: WallDetails;
  roofTrim?: RoofTrim;
}

export interface TextureAssignment {
  frontWall?: string;
  sideWalls?: string;
  backWall?: string;
  roof?: string;
  foundation?: string;
  trim?: string;
}

// Opening types for windows and doors
export type OpeningType = 'window' | 'door';

export interface Opening {
  id: string;
  type: OpeningType;
  wall: 'front' | 'back' | 'left' | 'right';
  floor: number;  // 0-indexed floor number (0 = ground floor)
  // Position from bottom-left of wall section, in feet
  x: number;  // distance from left edge
  y: number;  // distance from floor level (0 for doors)
  // Dimensions in feet
  width: number;
  height: number;
  // Optional label
  label?: string;
}

// Common opening presets
export const OPENING_PRESETS: { name: string; type: OpeningType; width: number; height: number; y: number }[] = [
  { name: 'Standard Door', type: 'door', width: 3, height: 7, y: 0 },
  { name: 'Double Door', type: 'door', width: 6, height: 7, y: 0 },
  { name: 'Garage Door', type: 'door', width: 9, height: 8, y: 0 },
  { name: 'Standard Window', type: 'window', width: 3, height: 4, y: 3 },
  { name: 'Large Window', type: 'window', width: 5, height: 4, y: 3 },
  { name: 'Small Window', type: 'window', width: 2, height: 2, y: 4 },
  { name: 'Tall Window', type: 'window', width: 2, height: 6, y: 2 },
];

// Panel definitions for unfolding
export interface Panel {
  id: string;
  name: string;
  vertices: [number, number][];  // 2D vertices in model units
  foldEdges: { from: number; to: number; type: 'mountain' | 'valley' | 'score' }[];
  cutEdges: { from: number; to: number }[];
  slotEdges?: { from: number; to: number; slotWidth: number; slotDepth: number; count: number }[];
  connectsTo?: string;
  textureId?: string;
}

export interface UnfoldedBuilding {
  panels: Panel[];
  glueTabWidth: number;  // In model units
  totalWidth: number;
  totalHeight: number;
}

// Re-export shared scales
export const MODEL_SCALES = SHARED_SCALES;

// Default floor configuration (single story)
export const DEFAULT_FLOORS: FloorConfig[] = [
  { id: 'floor-0', name: 'Ground Floor', height: 10, hasFloor: false, hasCeiling: false },
];

// Default interior configuration
export const DEFAULT_INTERIOR: InteriorConfig = {
  enabled: false,
  wallThickness: 0.125,  // 1/8 inch
  includeFloors: true,
  includeCeilings: false,
};

// Default building parameters
export const DEFAULT_BUILDING: BuildingParams = {
  dimensions: {
    width: 30,   // 30 feet wide
    depth: 20,   // 20 feet deep
    height: 10,  // 10 feet tall walls (single story)
  },
  roof: {
    style: 'gable',
    pitch: 30,
    overhang: 1,
  },
  scale: MODEL_SCALES.find(s => s.name === 'HO')!,
  openings: [],
  floors: DEFAULT_FLOORS,
  interior: DEFAULT_INTERIOR,
};

// Helper to create multi-story floor configurations
export function createFloors(storyCount: number, floorHeight: number = 10): FloorConfig[] {
  return Array.from({ length: storyCount }, (_, i) => ({
    id: `floor-${i}`,
    name: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
    height: floorHeight,
    hasFloor: i > 0, // Ground floor typically doesn't need a floor panel
    hasCeiling: i < storyCount - 1, // Top floor gets ceiling from roof
  }));
}

// Calculate total building height from floors
export function calculateTotalHeight(floors: FloorConfig[]): number {
  return floors.reduce((sum, floor) => sum + floor.height, 0);
}

// =============================================================================
// Architectural Items & Accessories
// =============================================================================

// Categories of architectural items
export type AccessoryCategory = 'exterior' | 'structural' | 'decorative' | 'signage';

// Accessory placement positions
export type AccessoryPosition =
  | 'wall-front' | 'wall-back' | 'wall-left' | 'wall-right'
  | 'roof' | 'ground' | 'corner';

// Base accessory type
export interface Accessory {
  id: string;
  type: AccessoryType;
  category: AccessoryCategory;
  name: string;
  // Position in feet from building origin
  position: {
    x: number;
    y: number;
    z: number;
  };
  // Rotation in degrees
  rotation: number;
  // Scale multiplier (1 = normal)
  scale: number;
  // Which wall/surface it's attached to (if applicable)
  attachedTo?: AccessoryPosition;
  // Custom properties depending on type
  properties?: Record<string, any>;
}

// Specific accessory types
export type AccessoryType =
  // Exterior
  | 'fence' | 'gate' | 'steps' | 'ramp' | 'platform'
  // Structural
  | 'chimney' | 'vent' | 'skylight' | 'dormer' | 'awning'
  // Decorative
  | 'shutters' | 'flower-box' | 'light-fixture' | 'trim' | 'column'
  // Signage
  | 'sign-flat' | 'sign-hanging' | 'sign-awning' | 'house-number';

// Accessory preset definitions
export interface AccessoryPreset {
  type: AccessoryType;
  category: AccessoryCategory;
  name: string;
  description: string;
  // Default dimensions in feet
  dimensions: { width: number; height: number; depth: number };
  // Default properties
  defaultProperties?: Record<string, any>;
  // Icon or preview
  icon: string;
}

// Accessory presets library
export const ACCESSORY_PRESETS: AccessoryPreset[] = [
  // Exterior
  {
    type: 'fence',
    category: 'exterior',
    name: 'Picket Fence',
    description: 'Traditional wooden picket fence section',
    dimensions: { width: 8, height: 4, depth: 0.5 },
    defaultProperties: { style: 'picket', posts: true },
    icon: '🪻',
  },
  {
    type: 'gate',
    category: 'exterior',
    name: 'Fence Gate',
    description: 'Swinging gate for fence',
    dimensions: { width: 4, height: 4, depth: 0.5 },
    defaultProperties: { style: 'picket', hinged: 'left' },
    icon: '🚪',
  },
  {
    type: 'steps',
    category: 'exterior',
    name: 'Porch Steps',
    description: 'Entry stairs with 3 steps',
    dimensions: { width: 5, height: 2, depth: 3 },
    defaultProperties: { stepCount: 3, railing: true },
    icon: '🪜',
  },
  {
    type: 'platform',
    category: 'exterior',
    name: 'Loading Dock',
    description: 'Raised platform for loading',
    dimensions: { width: 12, height: 4, depth: 6 },
    defaultProperties: { railing: true, ramp: false },
    icon: '📦',
  },

  // Structural
  {
    type: 'chimney',
    category: 'structural',
    name: 'Brick Chimney',
    description: 'Traditional brick chimney',
    dimensions: { width: 2, height: 6, depth: 2 },
    defaultProperties: { style: 'brick', cap: true },
    icon: '🏭',
  },
  {
    type: 'vent',
    category: 'structural',
    name: 'Roof Vent',
    description: 'Roof ventilation unit',
    dimensions: { width: 1.5, height: 1, depth: 1.5 },
    defaultProperties: { style: 'box' },
    icon: '💨',
  },
  {
    type: 'skylight',
    category: 'structural',
    name: 'Skylight',
    description: 'Roof-mounted window',
    dimensions: { width: 3, height: 0.5, depth: 4 },
    defaultProperties: { style: 'flat', panes: 1 },
    icon: '☀️',
  },
  {
    type: 'awning',
    category: 'structural',
    name: 'Window Awning',
    description: 'Protective awning over window/door',
    dimensions: { width: 6, height: 1, depth: 3 },
    defaultProperties: { style: 'sloped', color: 'striped' },
    icon: '🏕️',
  },

  // Decorative
  {
    type: 'shutters',
    category: 'decorative',
    name: 'Window Shutters',
    description: 'Pair of decorative shutters',
    dimensions: { width: 1, height: 4, depth: 0.25 },
    defaultProperties: { style: 'louvered', pair: true },
    icon: '🪟',
  },
  {
    type: 'flower-box',
    category: 'decorative',
    name: 'Flower Box',
    description: 'Window-mounted planter',
    dimensions: { width: 3, height: 0.5, depth: 0.75 },
    defaultProperties: { flowers: true },
    icon: '🌸',
  },
  {
    type: 'light-fixture',
    category: 'decorative',
    name: 'Wall Light',
    description: 'Exterior wall-mounted light',
    dimensions: { width: 0.5, height: 1, depth: 0.5 },
    defaultProperties: { style: 'lantern' },
    icon: '💡',
  },
  {
    type: 'column',
    category: 'decorative',
    name: 'Porch Column',
    description: 'Supporting column for porch/overhang',
    dimensions: { width: 0.75, height: 10, depth: 0.75 },
    defaultProperties: { style: 'round', base: true, capital: true },
    icon: '🏛️',
  },

  // Signage
  {
    type: 'sign-flat',
    category: 'signage',
    name: 'Wall Sign',
    description: 'Flat wall-mounted sign',
    dimensions: { width: 6, height: 2, depth: 0.25 },
    defaultProperties: { text: 'SHOP', style: 'rectangular' },
    icon: '🪧',
  },
  {
    type: 'sign-hanging',
    category: 'signage',
    name: 'Hanging Sign',
    description: 'Double-sided hanging sign',
    dimensions: { width: 3, height: 2, depth: 0.25 },
    defaultProperties: { text: 'OPEN', bracket: 'ornate' },
    icon: '🏪',
  },
  {
    type: 'sign-awning',
    category: 'signage',
    name: 'Awning Sign',
    description: 'Storefront awning with text',
    dimensions: { width: 12, height: 2, depth: 4 },
    defaultProperties: { text: 'STORE', color: 'green' },
    icon: '🎪',
  },
  {
    type: 'house-number',
    category: 'signage',
    name: 'House Number',
    description: 'Address number plaque',
    dimensions: { width: 1, height: 0.5, depth: 0.1 },
    defaultProperties: { number: '123', style: 'modern' },
    icon: '🔢',
  },
];
