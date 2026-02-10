/**
 * TidKit Builder - Wall Detail Generation
 * Generates flat detail pieces for wall architectural elements:
 * corner boards, baseboards, belt courses, wainscoting, and quoins.
 */

import type { BuildingParams, WallDetails } from '@/types/building';
import { calculateTotalHeight } from '@/types/building';
import type { Panel, Point2D } from './unfold';

const PANEL_SPACING = 0.3;

// Default dimensions in model inches (these are scaled by feetToInches)
const CORNER_BOARD_WIDTH = 0.5;  // feet
const BASEBOARD_HEIGHT = 0.75;   // feet
const BELT_COURSE_HEIGHT = 0.5;  // feet
const WAINSCOTING_FRACTION = 0.33; // lower third of wall
const QUOIN_WIDTH = 0.5;         // feet
const QUOIN_HEIGHT_LARGE = 0.75; // feet
const QUOIN_HEIGHT_SMALL = 0.5;  // feet

function createDetailPanel(
  id: string,
  name: string,
  width: number,
  height: number,
  position: Point2D
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
    panelGroup: 'detail',
  };
}

/**
 * Generate corner board panels — 8 vertical strips (2 per corner)
 */
function generateCornerBoards(
  buildingW: number,
  buildingD: number,
  buildingH: number,
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const cbW = CORNER_BOARD_WIDTH * f;
  const h = buildingH * f;
  let x = startPos.x;

  const corners = [
    { name: 'Front-Left', faces: ['Front', 'Left'] },
    { name: 'Front-Right', faces: ['Front', 'Right'] },
    { name: 'Back-Left', faces: ['Back', 'Left'] },
    { name: 'Back-Right', faces: ['Back', 'Right'] },
  ];

  for (const corner of corners) {
    for (const face of corner.faces) {
      panels.push(createDetailPanel(
        `detail-cb-${corner.name}-${face}`.toLowerCase().replace(/\s/g, '-'),
        `Corner Board - ${corner.name} (${face})`,
        cbW, h, { x, y: startPos.y }
      ));
      x += cbW + PANEL_SPACING * 0.4;
    }
    x += PANEL_SPACING * 0.3;
  }

  return { panels, nextX: x, maxH: h };
}

/**
 * Generate baseboard panels — 4 horizontal strips
 */
function generateBaseboards(
  buildingW: number,
  buildingD: number,
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const bh = BASEBOARD_HEIGHT * f;
  let x = startPos.x;

  const walls = [
    { name: 'Front', width: buildingW },
    { name: 'Back', width: buildingW },
    { name: 'Left', width: buildingD },
    { name: 'Right', width: buildingD },
  ];

  for (const wall of walls) {
    const w = wall.width * f;
    panels.push(createDetailPanel(
      `detail-baseboard-${wall.name.toLowerCase()}`,
      `Baseboard - ${wall.name}`,
      w, bh, { x, y: startPos.y }
    ));
    x += w + PANEL_SPACING;
  }

  return { panels, nextX: x, maxH: bh };
}

/**
 * Generate belt course panels — horizontal strips at floor boundaries
 */
function generateBeltCourses(
  buildingW: number,
  buildingD: number,
  floors: { height: number }[],
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const bch = BELT_COURSE_HEIGHT * f;
  let x = startPos.x;

  // Belt courses go between floors (not above top floor)
  const transitions = floors.length - 1;
  if (transitions <= 0) return { panels: [], nextX: x, maxH: 0 };

  const walls = [
    { name: 'Front', width: buildingW },
    { name: 'Back', width: buildingW },
    { name: 'Left', width: buildingD },
    { name: 'Right', width: buildingD },
  ];

  for (let t = 0; t < transitions; t++) {
    for (const wall of walls) {
      const w = wall.width * f;
      panels.push(createDetailPanel(
        `detail-belt-${t}-${wall.name.toLowerCase()}`,
        `Belt Course ${t + 1} - ${wall.name}`,
        w, bch, { x, y: startPos.y }
      ));
      x += w + PANEL_SPACING;
    }
  }

  return { panels, nextX: x, maxH: bch };
}

/**
 * Generate wainscoting panels — lower wall panels
 */
function generateWainscoting(
  buildingW: number,
  buildingD: number,
  buildingH: number,
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const wH = buildingH * WAINSCOTING_FRACTION * f;
  let x = startPos.x;

  const walls = [
    { name: 'Front', width: buildingW },
    { name: 'Back', width: buildingW },
    { name: 'Left', width: buildingD },
    { name: 'Right', width: buildingD },
  ];

  for (const wall of walls) {
    const w = wall.width * f;
    panels.push(createDetailPanel(
      `detail-wainscot-${wall.name.toLowerCase()}`,
      `Wainscoting - ${wall.name}`,
      w, wH, { x, y: startPos.y }
    ));
    x += w + PANEL_SPACING;
  }

  return { panels, nextX: x, maxH: wH };
}

/**
 * Generate quoin panels — alternating corner blocks
 */
function generateQuoins(
  buildingH: number,
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const qW = QUOIN_WIDTH * f;
  const qHL = QUOIN_HEIGHT_LARGE * f;
  const qHS = QUOIN_HEIGHT_SMALL * f;
  const h = buildingH * f;
  let x = startPos.x;
  let maxH = 0;

  // 4 corners, alternating large/small blocks stacked up
  for (let corner = 0; corner < 4; corner++) {
    const cornerName = ['Front-Left', 'Front-Right', 'Back-Left', 'Back-Right'][corner];
    let y = startPos.y;
    let blockIdx = 0;
    let stackH = 0;

    while (stackH < h) {
      const isLarge = blockIdx % 2 === 0;
      const blockH = isLarge ? qHL : qHS;
      if (stackH + blockH > h) break;

      panels.push(createDetailPanel(
        `detail-quoin-${corner}-${blockIdx}`,
        `Quoin ${cornerName} #${blockIdx + 1}`,
        qW, blockH, { x, y }
      ));
      y += blockH + PANEL_SPACING * 0.2;
      stackH += blockH + PANEL_SPACING * 0.2;
      blockIdx++;
    }

    maxH = Math.max(maxH, y - startPos.y);
    x += qW + PANEL_SPACING;
  }

  return { panels, nextX: x, maxH };
}

/**
 * Generate all wall detail panels for a building.
 */
export function generateWallDetails(
  params: BuildingParams,
  startY: number
): Panel[] {
  const details = params.wallDetails;
  if (!details) return [];

  const hasAny = details.cornerBoards || details.baseboard || details.beltCourse || details.wainscoting || details.quoins;
  if (!hasAny) return [];

  const f = 12 / params.scale.ratio; // feetToModelInches
  const { width, depth } = params.dimensions;
  const totalH = calculateTotalHeight(params.floors);
  const allPanels: Panel[] = [];

  let currentX = PANEL_SPACING;
  let currentY = startY + PANEL_SPACING;
  let rowMaxH = 0;
  const maxRowWidth = 20;

  const generators: { enabled: boolean; fn: () => { panels: Panel[]; nextX: number; maxH: number } }[] = [
    {
      enabled: details.cornerBoards,
      fn: () => generateCornerBoards(width, depth, totalH, f, { x: currentX, y: currentY }),
    },
    {
      enabled: details.baseboard,
      fn: () => generateBaseboards(width, depth, f, { x: currentX, y: currentY }),
    },
    {
      enabled: details.beltCourse,
      fn: () => generateBeltCourses(width, depth, params.floors, f, { x: currentX, y: currentY }),
    },
    {
      enabled: details.wainscoting,
      fn: () => generateWainscoting(width, depth, totalH, f, { x: currentX, y: currentY }),
    },
    {
      enabled: details.quoins,
      fn: () => generateQuoins(totalH, f, { x: currentX, y: currentY }),
    },
  ];

  for (const gen of generators) {
    if (!gen.enabled) continue;

    const result = gen.fn();
    if (result.panels.length === 0) continue;

    // Check if we need to wrap
    if (result.nextX > maxRowWidth && currentX > PANEL_SPACING) {
      currentY += rowMaxH + PANEL_SPACING;
      currentX = PANEL_SPACING;
      rowMaxH = 0;
      // Re-run with new position
      const rerun = gen.fn();
      allPanels.push(...rerun.panels);
      currentX = rerun.nextX + PANEL_SPACING;
      rowMaxH = Math.max(rowMaxH, rerun.maxH);
    } else {
      allPanels.push(...result.panels);
      currentX = result.nextX + PANEL_SPACING;
      rowMaxH = Math.max(rowMaxH, result.maxH);
    }
  }

  return allPanels;
}
