/**
 * TidKit Builder - Opening Trim Generation
 * Generates flat trim pieces for windows and doors based on trim style.
 */

import type { Opening, FloorConfig, TrimStyle, TrimProfile, BuildingParams } from '@/types/building';
import { TRIM_PROFILES } from '@/types/building';
import type { Panel, Point2D } from './unfold';

const PANEL_SPACING = 0.3;

/**
 * Create a rectangular detail panel with all cut edges
 */
function createTrimPanel(
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
 * Generate trim pieces for a single opening
 */
function generateTrimForOpening(
  opening: Opening,
  profile: TrimProfile,
  wallLabel: string,
  feetToInches: number,
  startPos: Point2D
): { panels: Panel[]; width: number; height: number } {
  const panels: Panel[] = [];
  let x = startPos.x;

  const openingW = opening.width * feetToInches;
  const openingH = opening.height * feetToInches;
  const fw = profile.frameWidth;
  const openingLabel = opening.label || (opening.type === 'door' ? 'Door' : 'Window');
  const prefix = `${wallLabel} ${openingLabel}`;

  // Left frame strip
  panels.push(createTrimPanel(
    `trim-${opening.id}-left`, `${prefix} - Left Frame`,
    fw, openingH,
    { x, y: startPos.y }
  ));
  x += fw + PANEL_SPACING * 0.5;

  // Right frame strip
  panels.push(createTrimPanel(
    `trim-${opening.id}-right`, `${prefix} - Right Frame`,
    fw, openingH,
    { x, y: startPos.y }
  ));
  x += fw + PANEL_SPACING * 0.5;

  // Header strip (top frame, may extend past frame on sides)
  const headerW = openingW + 2 * fw + 2 * profile.headerExtension;
  panels.push(createTrimPanel(
    `trim-${opening.id}-header`, `${prefix} - Header`,
    headerW, profile.headerHeight,
    { x, y: startPos.y }
  ));
  x += headerW + PANEL_SPACING * 0.5;

  // Sill strip (bottom frame, may extend past frame on sides)
  const sillW = openingW + 2 * fw + 2 * profile.sillExtension;
  panels.push(createTrimPanel(
    `trim-${opening.id}-sill`, `${prefix} - Sill`,
    sillW, profile.sillDepth,
    { x, y: startPos.y }
  ));
  x += sillW + PANEL_SPACING * 0.5;

  // Victorian-specific: sill bracket pieces (small L-shaped brackets under sill)
  if (profile.label === 'Victorian') {
    for (let i = 0; i < 2; i++) {
      const bracketLabel = i === 0 ? 'Left Bracket' : 'Right Bracket';
      panels.push(createTrimPanel(
        `trim-${opening.id}-bracket-${i}`, `${prefix} - ${bracketLabel}`,
        profile.sillDepth, profile.sillDepth * 1.5,
        { x, y: startPos.y }
      ));
      x += profile.sillDepth + PANEL_SPACING * 0.5;
    }
  }

  const totalWidth = x - startPos.x;
  const maxHeight = Math.max(openingH, profile.headerHeight, profile.sillDepth);

  return { panels, width: totalWidth, height: maxHeight };
}

/**
 * Get the wall label for display
 */
function wallLabel(wall: string): string {
  switch (wall) {
    case 'front': return 'Front';
    case 'back': return 'Back';
    case 'left': return 'Left';
    case 'right': return 'Right';
    default: return wall;
  }
}

/**
 * Generate all opening trim panels for a building.
 *
 * @param openings - Array of openings from BuildingParams
 * @param params - Building params (for scale)
 * @param trimStyle - Selected trim style
 * @param startY - Y position to start placing trim panels
 * @returns Array of detail panels
 */
export function generateOpeningTrim(
  openings: Opening[],
  params: BuildingParams,
  trimStyle: TrimStyle,
  startY: number
): Panel[] {
  if (trimStyle === 'none' || !openings || openings.length === 0) return [];

  const profile = TRIM_PROFILES[trimStyle];
  if (!profile) return [];

  const feetToInches = 12 / params.scale.ratio;
  const allPanels: Panel[] = [];

  let currentX = PANEL_SPACING;
  let currentY = startY + PANEL_SPACING;
  let rowMaxHeight = 0;
  const maxRowWidth = 20;

  // Group by wall for organized output
  const walls: ('front' | 'back' | 'left' | 'right')[] = ['front', 'back', 'left', 'right'];

  for (const wall of walls) {
    const wallOpenings = openings.filter((o) => o.wall === wall);
    if (wallOpenings.length === 0) continue;

    for (const opening of wallOpenings) {
      const { panels, width, height } = generateTrimForOpening(
        opening, profile, wallLabel(wall), feetToInches,
        { x: currentX, y: currentY }
      );

      // Wrap if too wide
      if (currentX + width > maxRowWidth && currentX > PANEL_SPACING) {
        currentY += rowMaxHeight + PANEL_SPACING;
        currentX = PANEL_SPACING;
        rowMaxHeight = 0;

        // Reposition panels
        const dx = currentX - panels[0].position.x;
        const dy = currentY - panels[0].position.y;
        for (const p of panels) {
          p.position.x += dx;
          p.position.y += dy;
        }
      }

      allPanels.push(...panels);
      currentX += width + PANEL_SPACING;
      rowMaxHeight = Math.max(rowMaxHeight, height);
    }
  }

  return allPanels;
}
