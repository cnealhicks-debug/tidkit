/**
 * TidKit Builder - Accessory Pattern Generation
 * Converts 3D accessory geometry into flat 2D cuttable panels.
 */

import type { Accessory, AccessoryType, BuildingParams, AccessoryPreset } from '@/types/building';
import { ACCESSORY_PRESETS } from '@/types/building';
import type { Panel, Point2D } from './unfold';

const PANEL_SPACING = 0.3;

/**
 * Find the preset for an accessory type
 */
function getPreset(type: AccessoryType): AccessoryPreset | undefined {
  return ACCESSORY_PRESETS.find((p) => p.type === type);
}

/**
 * Create a rectangular panel with all cut edges
 */
function createRectPanel(
  id: string,
  name: string,
  width: number,
  height: number,
  position: Point2D,
  parentAccessoryId: string
): Panel {
  return {
    id,
    name,
    vertices: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    edges: [
      { type: 'cut', from: 0, to: 1 },
      { type: 'cut', from: 1, to: 2 },
      { type: 'cut', from: 2, to: 3 },
      { type: 'cut', from: 3, to: 0 },
    ],
    position,
    rotation: 0,
    panelGroup: 'accessory',
    parentAccessoryId,
  };
}

/**
 * Generate panels for a chimney: 4 walls + cap
 */
function generateChimneyPanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches;
  const h = dims.height * feetToInches;
  const d = dims.depth * feetToInches;
  const scale = accessory.scale;
  const panels: Panel[] = [];
  let x = startPos.x;

  // Front wall
  panels.push(createRectPanel(
    `acc-${accessory.id}-front`, `${accessory.name} - Front`,
    w * scale, h * scale, { x, y: startPos.y }, accessory.id
  ));
  x += w * scale + PANEL_SPACING;

  // Right wall
  panels.push(createRectPanel(
    `acc-${accessory.id}-right`, `${accessory.name} - Right`,
    d * scale, h * scale, { x, y: startPos.y }, accessory.id
  ));
  x += d * scale + PANEL_SPACING;

  // Back wall
  panels.push(createRectPanel(
    `acc-${accessory.id}-back`, `${accessory.name} - Back`,
    w * scale, h * scale, { x, y: startPos.y }, accessory.id
  ));
  x += w * scale + PANEL_SPACING;

  // Left wall
  panels.push(createRectPanel(
    `acc-${accessory.id}-left`, `${accessory.name} - Left`,
    d * scale, h * scale, { x, y: startPos.y }, accessory.id
  ));
  x += d * scale + PANEL_SPACING;

  // Cap (top)
  panels.push(createRectPanel(
    `acc-${accessory.id}-cap`, `${accessory.name} - Cap`,
    (w + 0.5) * scale * feetToInches / feetToInches, // slightly wider cap
    (d + 0.5) * scale * feetToInches / feetToInches,
    { x, y: startPos.y }, accessory.id
  ));

  return panels;
}

/**
 * Generate panels for steps: treads + 2 side stringers
 */
function generateStepsPanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const d = dims.depth * feetToInches * accessory.scale;
  const stepCount = accessory.properties?.stepCount || 3;
  const panels: Panel[] = [];
  let x = startPos.x;

  // Individual treads
  const treadDepth = d / stepCount;
  for (let i = 0; i < stepCount; i++) {
    panels.push(createRectPanel(
      `acc-${accessory.id}-tread-${i}`, `${accessory.name} - Tread ${i + 1}`,
      w, treadDepth, { x, y: startPos.y }, accessory.id
    ));
    x += w + PANEL_SPACING;
  }

  // Two side stringers (staircase profile)
  const stepH = h / stepCount;
  for (let side = 0; side < 2; side++) {
    const label = side === 0 ? 'Left Stringer' : 'Right Stringer';
    // Stringer is a stepped profile — approximate as rectangle for cutting
    panels.push(createRectPanel(
      `acc-${accessory.id}-stringer-${side}`, `${accessory.name} - ${label}`,
      d, h, { x, y: startPos.y }, accessory.id
    ));
    x += d + PANEL_SPACING;
  }

  return panels;
}

/**
 * Generate panels for a column: unrolled cylinder + base + capital circles
 */
function generateColumnPanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const diameter = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const circumference = Math.PI * diameter;
  const panels: Panel[] = [];
  let x = startPos.x;

  // Unrolled cylinder body
  panels.push(createRectPanel(
    `acc-${accessory.id}-body`, `${accessory.name} - Body (wrap)`,
    circumference, h, { x, y: startPos.y }, accessory.id
  ));
  x += circumference + PANEL_SPACING;

  // Base circle (approximated as square with "cut circle" note in name)
  const baseSize = diameter * 1.2;
  panels.push(createRectPanel(
    `acc-${accessory.id}-base`, `${accessory.name} - Base (cut circle)`,
    baseSize, baseSize, { x, y: startPos.y }, accessory.id
  ));
  x += baseSize + PANEL_SPACING;

  // Capital circle
  panels.push(createRectPanel(
    `acc-${accessory.id}-capital`, `${accessory.name} - Capital (cut circle)`,
    baseSize, baseSize, { x, y: startPos.y }, accessory.id
  ));

  return panels;
}

/**
 * Generate panels for an awning: front face + 2 triangular sides
 */
function generateAwningPanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const d = dims.depth * feetToInches * accessory.scale;
  const panels: Panel[] = [];
  let x = startPos.x;

  // Front face (sloped rectangle)
  const slopeLength = Math.sqrt(d * d + h * h);
  panels.push(createRectPanel(
    `acc-${accessory.id}-front`, `${accessory.name} - Front Face`,
    w, slopeLength, { x, y: startPos.y }, accessory.id
  ));
  x += w + PANEL_SPACING;

  // Two triangular side panels (approximated as right triangles)
  for (let side = 0; side < 2; side++) {
    const label = side === 0 ? 'Left Side' : 'Right Side';
    const triPanel: Panel = {
      id: `acc-${accessory.id}-side-${side}`,
      name: `${accessory.name} - ${label}`,
      vertices: [
        { x: 0, y: h },
        { x: d, y: h },
        { x: 0, y: 0 },
      ],
      edges: [
        { type: 'cut', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'cut', from: 2, to: 0 },
      ],
      position: { x, y: startPos.y },
      rotation: 0,
      panelGroup: 'accessory',
      parentAccessoryId: accessory.id,
    };
    panels.push(triPanel);
    x += d + PANEL_SPACING;
  }

  return panels;
}

/**
 * Generate panels for fence: pickets + rails + posts
 */
function generateFencePanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const panels: Panel[] = [];
  let x = startPos.x;

  // Pickets (evenly spaced)
  const picketWidth = 0.08; // model inches
  const picketSpacing = 0.15;
  const picketCount = Math.max(2, Math.floor(w / (picketWidth + picketSpacing)));

  for (let i = 0; i < picketCount; i++) {
    panels.push(createRectPanel(
      `acc-${accessory.id}-picket-${i}`, `${accessory.name} - Picket ${i + 1}`,
      picketWidth, h, { x, y: startPos.y }, accessory.id
    ));
    x += picketWidth + PANEL_SPACING * 0.3;
  }

  // 2 horizontal rails
  const railHeight = 0.06;
  for (let i = 0; i < 2; i++) {
    panels.push(createRectPanel(
      `acc-${accessory.id}-rail-${i}`, `${accessory.name} - Rail ${i + 1}`,
      w, railHeight, { x, y: startPos.y + i * (railHeight + PANEL_SPACING * 0.3) }, accessory.id
    ));
  }
  x += w + PANEL_SPACING;

  // 2 posts (if posts property is true)
  if (accessory.properties?.posts !== false) {
    const postWidth = 0.1;
    for (let i = 0; i < 2; i++) {
      panels.push(createRectPanel(
        `acc-${accessory.id}-post-${i}`, `${accessory.name} - Post ${i + 1}`,
        postWidth, h * 1.1, { x, y: startPos.y }, accessory.id
      ));
      x += postWidth + PANEL_SPACING * 0.5;
    }
  }

  return panels;
}

/**
 * Generate panels for a gate: same as fence + diagonal brace
 */
function generateGatePanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const panels = generateFencePanels(accessory, dims, startPos, feetToInches);

  // Add diagonal brace strip
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const braceLength = Math.sqrt(w * w + h * h);
  const lastPanel = panels[panels.length - 1];
  const braceX = lastPanel.position.x + Math.max(...lastPanel.vertices.map(v => v.x)) + PANEL_SPACING;

  panels.push(createRectPanel(
    `acc-${accessory.id}-brace`, `${accessory.name} - Diagonal Brace`,
    braceLength, 0.06, { x: braceX, y: startPos.y }, accessory.id
  ));

  return panels;
}

/**
 * Generate panels for shutters: 2 rectangular panels with score lines for louvers
 */
function generateShuttersPanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const panels: Panel[] = [];
  let x = startPos.x;

  for (let i = 0; i < 2; i++) {
    const label = i === 0 ? 'Left Shutter' : 'Right Shutter';
    const panel: Panel = {
      id: `acc-${accessory.id}-shutter-${i}`,
      name: `${accessory.name} - ${label}`,
      vertices: [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ],
      edges: [
        { type: 'cut', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'cut', from: 2, to: 3 },
        { type: 'cut', from: 3, to: 0 },
      ],
      position: { x, y: startPos.y },
      rotation: 0,
      panelGroup: 'accessory',
      parentAccessoryId: accessory.id,
    };
    panels.push(panel);
    x += w + PANEL_SPACING;
  }

  return panels;
}

/**
 * Generate panels for a hanging sign: sign face + bracket strip
 */
function generateSignHangingPanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;
  const panels: Panel[] = [];
  let x = startPos.x;

  // Sign face (2 copies for double-sided)
  for (let i = 0; i < 2; i++) {
    panels.push(createRectPanel(
      `acc-${accessory.id}-face-${i}`, `${accessory.name} - Face ${i + 1}`,
      w, h, { x, y: startPos.y }, accessory.id
    ));
    x += w + PANEL_SPACING;
  }

  // Bracket strip
  const bracketH = h * 0.6;
  panels.push(createRectPanel(
    `acc-${accessory.id}-bracket`, `${accessory.name} - Bracket`,
    0.08, bracketH, { x, y: startPos.y }, accessory.id
  ));

  return panels;
}

/**
 * Generate a simple rectangular panel for flat items (signs, flower boxes, etc.)
 */
function generateSimplePanels(
  accessory: Accessory,
  dims: { width: number; height: number; depth: number },
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const w = dims.width * feetToInches * accessory.scale;
  const h = dims.height * feetToInches * accessory.scale;

  return [
    createRectPanel(
      `acc-${accessory.id}-face`, `${accessory.name}`,
      w, h, startPos, accessory.id
    ),
  ];
}

/**
 * Generate flat pattern panels for a single accessory.
 */
function generatePanelsForAccessory(
  accessory: Accessory,
  startPos: Point2D,
  feetToInches: number
): Panel[] {
  const preset = getPreset(accessory.type);
  if (!preset) {
    // Unknown accessory type — generate a generic panel from properties
    const w = 1 * feetToInches * accessory.scale;
    const h = 1 * feetToInches * accessory.scale;
    return [createRectPanel(
      `acc-${accessory.id}-generic`, accessory.name,
      w, h, startPos, accessory.id
    )];
  }

  const dims = preset.dimensions;

  switch (accessory.type) {
    case 'chimney':
      return generateChimneyPanels(accessory, dims, startPos, feetToInches);
    case 'steps':
      return generateStepsPanels(accessory, dims, startPos, feetToInches);
    case 'column':
      return generateColumnPanels(accessory, dims, startPos, feetToInches);
    case 'awning':
    case 'sign-awning':
      return generateAwningPanels(accessory, dims, startPos, feetToInches);
    case 'fence':
      return generateFencePanels(accessory, dims, startPos, feetToInches);
    case 'gate':
      return generateGatePanels(accessory, dims, startPos, feetToInches);
    case 'shutters':
      return generateShuttersPanels(accessory, dims, startPos, feetToInches);
    case 'sign-hanging':
      return generateSignHangingPanels(accessory, dims, startPos, feetToInches);
    case 'sign-flat':
    case 'flower-box':
    case 'light-fixture':
    case 'house-number':
    case 'trim':
    case 'vent':
    case 'skylight':
    case 'platform':
    case 'ramp':
    case 'dormer':
      return generateSimplePanels(accessory, dims, startPos, feetToInches);
    default:
      return generateSimplePanels(accessory, dims, startPos, feetToInches);
  }
}

/**
 * Generate flat pattern panels for all accessories in a building.
 * Panels are laid out in rows below the structural pattern.
 *
 * @param accessories - Array of accessories from BuildingParams
 * @param params - Building params (for scale conversion)
 * @param startY - Y position to start placing accessory panels
 * @returns Array of panels with panelGroup='accessory'
 */
export function generateAccessoryPanels(
  accessories: Accessory[],
  params: BuildingParams,
  startY: number
): Panel[] {
  if (!accessories || accessories.length === 0) return [];

  const feetToInches = 12 / params.scale.ratio;
  const allPanels: Panel[] = [];

  let currentX = PANEL_SPACING;
  let currentY = startY + PANEL_SPACING;
  let rowMaxHeight = 0;
  const maxRowWidth = 20; // max width before wrapping to next row

  for (const accessory of accessories) {
    const panels = generatePanelsForAccessory(accessory, { x: currentX, y: currentY }, feetToInches);

    if (panels.length === 0) continue;

    // Calculate bounding box of this accessory's panels
    const maxX = Math.max(...panels.map(p => p.position.x + Math.max(...p.vertices.map(v => v.x))));
    const maxH = Math.max(...panels.map(p => Math.max(...p.vertices.map(v => v.y))));

    // Wrap to next row if too wide
    if (maxX > maxRowWidth && currentX > PANEL_SPACING) {
      currentY += rowMaxHeight + PANEL_SPACING * 2;
      currentX = PANEL_SPACING;
      rowMaxHeight = 0;

      // Reposition panels
      const offsetX = currentX - panels[0].position.x;
      const offsetY = currentY - panels[0].position.y;
      for (const p of panels) {
        p.position.x += offsetX;
        p.position.y += offsetY;
      }
    }

    allPanels.push(...panels);

    // Advance position for next accessory
    const furthestX = Math.max(...panels.map(p => p.position.x + Math.max(...p.vertices.map(v => v.x))));
    currentX = furthestX + PANEL_SPACING * 2;
    rowMaxHeight = Math.max(rowMaxHeight, maxH);
  }

  return allPanels;
}
