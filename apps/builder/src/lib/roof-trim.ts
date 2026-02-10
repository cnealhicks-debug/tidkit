/**
 * TidKit Builder - Roof Trim Generation
 * Generates flat detail pieces for roof trim elements:
 * fascia boards, bargeboards (plain/scalloped/gingerbread), and ridge caps.
 */

import type { BuildingParams, RoofTrim } from '@/types/building';
import type { Panel, Point2D } from './unfold';

const PANEL_SPACING = 0.3;
const FASCIA_HEIGHT = 0.5; // feet
const RIDGE_CAP_WIDTH = 1;  // feet (real-world)

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
 * Generate fascia board panels — strips along each eave edge
 */
function generateFascia(
  params: BuildingParams,
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const { width, depth } = params.dimensions;
  const overhang = params.roof.overhang;
  const fh = FASCIA_HEIGHT * f;
  let x = startPos.x;

  const roofStyle = params.roof.style;

  if (roofStyle === 'flat') {
    // All four sides
    const eaves = [
      { name: 'Front', length: width + 2 * overhang },
      { name: 'Back', length: width + 2 * overhang },
      { name: 'Left', length: depth + 2 * overhang },
      { name: 'Right', length: depth + 2 * overhang },
    ];
    for (const eave of eaves) {
      const w = eave.length * f;
      panels.push(createDetailPanel(
        `detail-fascia-${eave.name.toLowerCase()}`,
        `Fascia - ${eave.name}`,
        w, fh, { x, y: startPos.y }
      ));
      x += w + PANEL_SPACING;
    }
  } else if (roofStyle === 'hip') {
    // All four sides (hip roof has eaves on all sides)
    const eaves = [
      { name: 'Front', length: width + 2 * overhang },
      { name: 'Back', length: width + 2 * overhang },
      { name: 'Left', length: depth + 2 * overhang },
      { name: 'Right', length: depth + 2 * overhang },
    ];
    for (const eave of eaves) {
      const w = eave.length * f;
      panels.push(createDetailPanel(
        `detail-fascia-${eave.name.toLowerCase()}`,
        `Fascia - ${eave.name}`,
        w, fh, { x, y: startPos.y }
      ));
      x += w + PANEL_SPACING;
    }
  } else {
    // Gable/shed/gambrel/mansard/saltbox: eaves on left and right (sides)
    const eaves = [
      { name: 'Left', length: width + 2 * overhang },
      { name: 'Right', length: width + 2 * overhang },
    ];
    for (const eave of eaves) {
      const w = eave.length * f;
      panels.push(createDetailPanel(
        `detail-fascia-${eave.name.toLowerCase()}`,
        `Fascia - ${eave.name}`,
        w, fh, { x, y: startPos.y }
      ));
      x += w + PANEL_SPACING;
    }
  }

  return { panels, nextX: x, maxH: fh };
}

/**
 * Generate bargeboard panels — decorative strips on gable ends
 */
function generateBargeboard(
  params: BuildingParams,
  f: number,
  style: 'plain' | 'scalloped' | 'gingerbread',
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const panels: Panel[] = [];
  const { depth } = params.dimensions;
  const pitchRad = (params.roof.pitch * Math.PI) / 180;
  const roofHeight = (depth / 2) * Math.tan(pitchRad);

  // Rafter length (hypotenuse)
  const rafterLength = Math.sqrt((depth / 2) ** 2 + roofHeight ** 2);
  const bargeW = rafterLength * f;
  const bargeH = 0.06 * f * 12; // ~6 inches in model scale, proportional
  let x = startPos.x;

  // 2 bargeboards per gable end, 2 gable ends for standard gable
  const gableCount = params.roof.style === 'saltbox' ? 2 : 2;
  const piecesPerGable = 2; // left slope and right slope

  for (let g = 0; g < gableCount; g++) {
    const gableName = g === 0 ? 'Front' : 'Back';
    for (let s = 0; s < piecesPerGable; s++) {
      const sideName = s === 0 ? 'Left' : 'Right';
      const id = `detail-bargeboard-${gableName.toLowerCase()}-${sideName.toLowerCase()}`;
      const name = `Bargeboard - ${gableName} ${sideName}`;

      if (style === 'plain') {
        panels.push(createDetailPanel(id, name, bargeW, bargeH, { x, y: startPos.y }));
      } else {
        // Scalloped or gingerbread — create panel with decorative bottom edge
        // Use SVG path vertices for the scalloped/gingerbread bottom
        const scallops = Math.max(3, Math.floor(bargeW / (bargeH * 1.5)));
        const scW = bargeW / scallops;

        // Build vertices: top is straight, bottom has scallops
        const vertices: Point2D[] = [];
        // Top edge (left to right)
        vertices.push({ x: 0, y: 0 });
        vertices.push({ x: bargeW, y: 0 });

        // Bottom edge (right to left, with scallops)
        if (style === 'scalloped') {
          for (let i = scallops; i >= 0; i--) {
            const cx = i * scW;
            vertices.push({ x: cx, y: bargeH });
            if (i > 0) {
              // Semicircle peak between scallops
              vertices.push({ x: cx - scW / 2, y: bargeH * 0.6 });
            }
          }
        } else {
          // Gingerbread — deeper cutouts with pointed peaks
          for (let i = scallops; i >= 0; i--) {
            const cx = i * scW;
            vertices.push({ x: cx, y: bargeH });
            if (i > 0) {
              vertices.push({ x: cx - scW * 0.35, y: bargeH * 0.4 });
              vertices.push({ x: cx - scW * 0.5, y: bargeH * 0.5 });
              vertices.push({ x: cx - scW * 0.65, y: bargeH * 0.4 });
            }
          }
        }

        const edges = vertices.map((_, i) => ({
          type: 'cut' as const,
          from: i,
          to: (i + 1) % vertices.length,
        }));

        panels.push({
          id,
          name,
          vertices,
          edges,
          position: { x, y: startPos.y },
          rotation: 0,
          panelGroup: 'detail',
        });
      }

      x += bargeW + PANEL_SPACING;
    }
  }

  return { panels, nextX: x, maxH: bargeH };
}

/**
 * Generate ridge cap panel — strip along the roof ridge
 */
function generateRidgeCap(
  params: BuildingParams,
  f: number,
  startPos: Point2D
): { panels: Panel[]; nextX: number; maxH: number } {
  const roofStyle = params.roof.style;
  let ridgeLength: number;

  if (roofStyle === 'gable' || roofStyle === 'saltbox' || roofStyle === 'gambrel') {
    ridgeLength = params.dimensions.width; // Ridge runs along the width
  } else if (roofStyle === 'hip') {
    // Hip roof ridge is shorter than building width
    ridgeLength = Math.max(0, params.dimensions.width - params.dimensions.depth);
  } else {
    ridgeLength = params.dimensions.width;
  }

  if (ridgeLength <= 0) {
    return { panels: [], nextX: startPos.x, maxH: 0 };
  }

  const w = ridgeLength * f;
  const h = RIDGE_CAP_WIDTH * f;

  const panel = createDetailPanel(
    'detail-ridge-cap',
    'Ridge Cap',
    w, h, startPos
  );

  return { panels: [panel], nextX: startPos.x + w + PANEL_SPACING, maxH: h };
}

/**
 * Generate all roof trim panels for a building.
 */
export function generateRoofTrimPanels(
  params: BuildingParams,
  startY: number
): Panel[] {
  const trim = params.roofTrim;
  if (!trim) return [];

  const hasAny = trim.fascia || trim.bargeboard || trim.ridgeCap;
  if (!hasAny) return [];

  const f = 12 / params.scale.ratio;
  const allPanels: Panel[] = [];

  let currentX = PANEL_SPACING;
  let currentY = startY + PANEL_SPACING;
  let rowMaxH = 0;

  if (trim.fascia) {
    const result = generateFascia(params, f, { x: currentX, y: currentY });
    allPanels.push(...result.panels);
    currentX = result.nextX + PANEL_SPACING;
    rowMaxH = Math.max(rowMaxH, result.maxH);
  }

  if (trim.bargeboard) {
    const isGable = params.roof.style === 'gable' || params.roof.style === 'saltbox' || params.roof.style === 'gambrel';
    if (isGable) {
      // Wrap to next row if needed
      if (currentX > 10) {
        currentY += rowMaxH + PANEL_SPACING;
        currentX = PANEL_SPACING;
        rowMaxH = 0;
      }
      const result = generateBargeboard(
        params, f,
        trim.bargeboardStyle || 'plain',
        { x: currentX, y: currentY }
      );
      allPanels.push(...result.panels);
      currentX = result.nextX + PANEL_SPACING;
      rowMaxH = Math.max(rowMaxH, result.maxH);
    }
  }

  if (trim.ridgeCap) {
    const noRidge = params.roof.style === 'flat' || params.roof.style === 'shed';
    if (!noRidge) {
      if (currentX > 15) {
        currentY += rowMaxH + PANEL_SPACING;
        currentX = PANEL_SPACING;
        rowMaxH = 0;
      }
      const result = generateRidgeCap(params, f, { x: currentX, y: currentY });
      allPanels.push(...result.panels);
    }
  }

  return allPanels;
}
