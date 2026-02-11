/**
 * TidKit Builder - Unfold Strategies
 * Strategy pattern for generating 2D patterns based on material type
 */

import {
  BuildingParams,
  MaterialConfig,
  MaterialType,
  MATERIAL_PROPERTIES,
  DEFAULT_MATERIAL,
} from '@/types/building';
import type { Panel, GlueTab, UnfoldedPattern, Point2D, PanelOpening } from './unfold';
import { compensateButtJoint, compensateMiterJoint, generateSlotTabJoints } from './material-compensation';
import { generateAccessoryPanels } from './accessory-patterns';
import { generateOpeningTrim } from './opening-trim';
import { generateWallDetails } from './wall-details';
import { generateRoofTrimPanels } from './roof-trim';
import { getWallProfile, getProfileMaxHeight } from './wall-profiles';
import { attachStickersToPanel } from './sticker-placement';

// =============================================================================
// Strategy Interface
// =============================================================================

export interface UnfoldStrategy {
  /**
   * Generate the unfolded 2D pattern for the given building parameters.
   */
  unfold(params: BuildingParams, name: string, accessories?: import('@/types/building').Accessory[]): UnfoldedPattern;
}

// =============================================================================
// Shared Helpers
// =============================================================================

const GLUE_TAB_WIDTH = 0.25; // inches in model scale
const PANEL_SPACING = 0.5;   // spacing between separate panels

function processOpenings(
  openings: import('@/types/building').Opening[],
  feetToModelInches: number,
  wallOpenings: import('@/types/building').Opening[]
): PanelOpening[] {
  return wallOpenings.map((opening) => ({
    id: opening.id,
    type: opening.type,
    x: opening.x * feetToModelInches,
    y: opening.y * feetToModelInches,
    width: opening.width * feetToModelInches,
    height: opening.height * feetToModelInches,
    label: opening.label,
  }));
}

function createGlueTab(
  id: string,
  parentPanel: string,
  edgeIndex: number,
  panel: Panel,
  tabWidth: number
): GlueTab {
  const v1 = panel.vertices[edgeIndex];
  const v2 = panel.vertices[(edgeIndex + 1) % panel.vertices.length];

  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * tabWidth;
  const ny = (dx / len) * tabWidth;

  const taperFactor = 0.7;
  const vertices: Point2D[] = [
    { x: v1.x, y: v1.y },
    { x: v2.x, y: v2.y },
    { x: v2.x + nx * taperFactor, y: v2.y + ny * taperFactor },
    { x: v1.x + nx * taperFactor, y: v1.y + ny * taperFactor },
  ];

  return {
    id,
    parentPanel,
    edgeIndex,
    vertices,
    position: { x: panel.position.x, y: panel.position.y },
  };
}

function buildPatternResult(
  panels: Panel[],
  glueTabs: GlueTab[],
  params: BuildingParams,
  name: string,
  assemblySteps?: string[],
  facadePanels?: Panel[],
  accessoryPanels?: Panel[],
  detailPanels?: Panel[]
): UnfoldedPattern {
  const allPanels = [...panels, ...(facadePanels || []), ...(accessoryPanels || []), ...(detailPanels || [])];
  const totalWidth =
    Math.max(
      ...allPanels.map((p) => p.position.x + Math.max(...p.vertices.map((v) => v.x)))
    ) + GLUE_TAB_WIDTH;

  const totalHeight =
    Math.max(
      ...allPanels.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y)))
    ) + GLUE_TAB_WIDTH;

  const material = params.material || DEFAULT_MATERIAL;
  const materialProps = MATERIAL_PROPERTIES[material.type];

  return {
    panels,
    glueTabs,
    width: totalWidth,
    height: totalHeight,
    buildingName: name,
    scale: `${params.scale.name} (1:${params.scale.ratio})`,
    realWorldDimensions: {
      width: params.dimensions.width,
      depth: params.dimensions.depth,
      height: params.dimensions.height,
    },
    materialType: material.type,
    assemblySteps: assemblySteps || materialProps.assemblySteps,
    facadePanels,
    accessoryPanels,
    detailPanels,
  };
}

/**
 * Generate edges for a wall profile panel in the paper strip.
 * Bottom = glue-tab, left/right vertical edges = fold or cut,
 * any edges above foldLineY get fold lines at the transition.
 */
function generateWallEdges(
  profile: import('./wall-profiles').WallProfile,
  position: 'first' | 'middle' | 'last',
): Panel['edges'] {
  const verts = profile.vertices;
  const n = verts.length;
  const edges: Panel['edges'] = [];

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const v1 = verts[i];
    const v2 = verts[next];

    // Bottom edge (both y near 0)
    if (v1.y < 0.001 && v2.y < 0.001) {
      edges.push({ type: 'glue-tab', from: i, to: next });
      continue;
    }

    // Left vertical edge (x near 0)
    if (v1.x < 0.001 && v2.x < 0.001) {
      edges.push({ type: position === 'first' ? 'cut' : 'valley', from: i, to: next });
      continue;
    }

    // Right vertical edge (x near max)
    const maxX = Math.max(...verts.map(v => v.x));
    if (Math.abs(v1.x - maxX) < 0.001 && Math.abs(v2.x - maxX) < 0.001) {
      edges.push({ type: position === 'last' ? 'cut' : 'valley', from: i, to: next });
      continue;
    }

    // Top horizontal edge at wall height (fold line where base meets gable)
    if (profile.foldLineY && Math.abs(v1.y - profile.foldLineY) < 0.001 && Math.abs(v2.y - profile.foldLineY) < 0.001) {
      edges.push({ type: 'mountain', from: i, to: next });
      continue;
    }

    // Diagonal/sloped edges above wall height (gable slopes, gambrel, etc.)
    if (v1.y > (profile.foldLineY || 0) - 0.001 || v2.y > (profile.foldLineY || 0) - 0.001) {
      edges.push({ type: 'cut', from: i, to: next });
      continue;
    }

    // Default: mountain fold (top edge of rectangular portion)
    edges.push({ type: 'mountain', from: i, to: next });
  }

  return edges;
}

// =============================================================================
// Paper Unfold Strategy (original logic, extracted verbatim)
// =============================================================================

export class PaperUnfoldStrategy implements UnfoldStrategy {
  unfold(params: BuildingParams, name: string, accessories?: import('@/types/building').Accessory[]): UnfoldedPattern {
    const { dimensions, roof, scale, openings = [] } = params;

    const feetToModelInches = 12 / scale.ratio;
    const width = dimensions.width * feetToModelInches;
    const depth = dimensions.depth * feetToModelInches;
    const height = dimensions.height * feetToModelInches;
    const overhang = roof.overhang * feetToModelInches;

    const frontOpenings = openings.filter((o) => o.wall === 'front');
    const backOpenings = openings.filter((o) => o.wall === 'back');
    const leftOpenings = openings.filter((o) => o.wall === 'left');
    const rightOpenings = openings.filter((o) => o.wall === 'right');

    const pitchRad = (roof.pitch * Math.PI) / 180;
    const roofHeight = roof.style === 'flat' ? 0 : (depth / 2) * Math.tan(pitchRad);

    const panels: Panel[] = [];
    const glueTabs: GlueTab[] = [];

    let currentX = GLUE_TAB_WIDTH;
    let currentY = GLUE_TAB_WIDTH;
    let maxHeight = 0;

    // === WALLS (connected strip: Front -> Right -> Back -> Left) ===
    // Use wall profiles that integrate gable/shed/gambrel extensions into the wall shape

    const wallDefs: Array<{
      id: string; name: string; side: 'front' | 'back' | 'left' | 'right';
      wallWidth: number; openingsForWall: typeof frontOpenings;
      position: 'first' | 'middle' | 'last'; connectsTo?: string;
    }> = [
      { id: 'front-wall', name: 'Front Wall', side: 'front', wallWidth: width, openingsForWall: frontOpenings, position: 'first' },
      { id: 'right-wall', name: 'Right Wall', side: 'right', wallWidth: depth, openingsForWall: rightOpenings, position: 'middle', connectsTo: 'front-wall' },
      { id: 'back-wall', name: 'Back Wall', side: 'back', wallWidth: width, openingsForWall: backOpenings, position: 'middle', connectsTo: 'right-wall' },
      { id: 'left-wall', name: 'Left Wall', side: 'left', wallWidth: depth, openingsForWall: leftOpenings, position: 'last', connectsTo: 'back-wall' },
    ];

    for (const wallDef of wallDefs) {
      const profile = getWallProfile({
        roofStyle: roof.style,
        wallSide: wallDef.side,
        wallWidth: wallDef.wallWidth,
        wallHeight: height,
        roofPitch: roof.pitch,
        buildingDepth: depth,
      });

      const wall: Panel = {
        id: wallDef.id,
        name: wallDef.name,
        vertices: profile.vertices.map(v => ({ x: v.x, y: v.y })),
        edges: generateWallEdges(profile, wallDef.position),
        position: { x: currentX, y: currentY },
        rotation: 0,
        connectsTo: wallDef.connectsTo,
        openings: processOpenings(openings, feetToModelInches, wallDef.openingsForWall),
      };
      panels.push(wall);

      // Glue tabs: first wall gets left tab, last wall gets right tab
      if (wallDef.position === 'first') {
        // Left edge (last vertex index → vertex 0)
        const leftEdgeIdx = profile.vertices.length - 1;
        glueTabs.push(createGlueTab(`${wallDef.id}-left-tab`, wallDef.id, leftEdgeIdx, wall, GLUE_TAB_WIDTH));
      }
      if (wallDef.position === 'last') {
        // Right edge (vertex at max-x going up)
        // Find the edge going from bottom-right upward
        const rightEdgeIdx = profile.vertices.findIndex((v, i) => {
          const next = profile.vertices[(i + 1) % profile.vertices.length];
          return Math.abs(v.x - wallDef.wallWidth) < 0.001 && v.y < next.y;
        });
        if (rightEdgeIdx >= 0) {
          glueTabs.push(createGlueTab(`${wallDef.id}-right-tab`, wallDef.id, rightEdgeIdx, wall, GLUE_TAB_WIDTH));
        }
      }

      currentX += wallDef.wallWidth;
    }

    currentX += GLUE_TAB_WIDTH;
    // Max height accounts for tallest wall profile (e.g. pentagon with gable)
    const maxWallH = Math.max(
      ...wallDefs.map(d => getProfileMaxHeight(getWallProfile({
        roofStyle: roof.style, wallSide: d.side, wallWidth: d.wallWidth,
        wallHeight: height, roofPitch: roof.pitch, buildingDepth: depth,
      })))
    );
    maxHeight = Math.max(maxHeight, maxWallH + GLUE_TAB_WIDTH * 2);

    // === ROOF ===
    currentY = maxHeight + GLUE_TAB_WIDTH * 2;
    currentX = GLUE_TAB_WIDTH;

    if (roof.style === 'flat') {
      const roofWidth = width + overhang * 2;
      const roofDepth = depth + overhang * 2;
      const flatRoof: Panel = {
        id: 'roof',
        name: 'Roof',
        vertices: [
          { x: 0, y: 0 },
          { x: roofWidth, y: 0 },
          { x: roofWidth, y: roofDepth },
          { x: 0, y: roofDepth },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      };
      panels.push(flatRoof);
      maxHeight = currentY + roofDepth + GLUE_TAB_WIDTH;
    } else if (roof.style === 'gable') {
      const roofPanelLength = Math.sqrt(
        Math.pow(depth / 2 + overhang, 2) + Math.pow(roofHeight, 2)
      );
      const roofPanelWidth = width + overhang * 2;

      const leftRoofPanel: Panel = {
        id: 'roof-left',
        name: 'Roof (Left)',
        vertices: [
          { x: 0, y: 0 },
          { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: roofPanelLength },
          { x: 0, y: roofPanelLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'valley', from: 2, to: 3 },
          { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      };
      panels.push(leftRoofPanel);
      glueTabs.push(createGlueTab('roof-left-front', 'roof-left', 1, leftRoofPanel, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-left-back', 'roof-left', 3, leftRoofPanel, GLUE_TAB_WIDTH));

      currentY += roofPanelLength;

      const rightRoofPanel: Panel = {
        id: 'roof-right',
        name: 'Roof (Right)',
        vertices: [
          { x: 0, y: 0 },
          { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: roofPanelLength },
          { x: 0, y: roofPanelLength },
        ],
        edges: [
          { type: 'valley', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
        connectsTo: 'roof-left',
      };
      panels.push(rightRoofPanel);
      glueTabs.push(createGlueTab('roof-right-front', 'roof-right', 1, rightRoofPanel, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-right-back', 'roof-right', 3, rightRoofPanel, GLUE_TAB_WIDTH));

      maxHeight = currentY + roofPanelLength + GLUE_TAB_WIDTH;

      // Gable ends are now integrated into the left/right wall panels as pentagons
    } else if (roof.style === 'saltbox') {
      // Saltbox: asymmetric slopes — short front, long back
      const halfD = depth / 2;
      const ridgePos = halfD * 0.35;
      const pitchRad2 = Math.atan(roofHeight / halfD);
      const peakH = ridgePos * Math.tan(pitchRad2);
      const frontSlopeLen = Math.sqrt(ridgePos * ridgePos + peakH * peakH) + overhang;
      const backRun = halfD - ridgePos + halfD; // ridge to back eave
      const backSlopeLen = Math.sqrt(backRun * backRun + peakH * peakH) + overhang;
      const roofPanelWidth = width + overhang * 2;

      // Front slope
      panels.push({
        id: 'roof-front', name: 'Roof (Front)',
        vertices: [
          { x: 0, y: 0 }, { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: frontSlopeLen }, { x: 0, y: frontSlopeLen },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 },
          { type: 'valley', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      currentY += frontSlopeLen;

      // Back slope
      panels.push({
        id: 'roof-back', name: 'Roof (Back)',
        vertices: [
          { x: 0, y: 0 }, { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: backSlopeLen }, { x: 0, y: backSlopeLen },
        ],
        edges: [
          { type: 'valley', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY }, rotation: 0, connectsTo: 'roof-front',
      });
      maxHeight = currentY + backSlopeLen + GLUE_TAB_WIDTH;
    } else if (roof.style === 'gambrel') {
      // Gambrel: 4 roof panels (steep lower + gentle upper, each side)
      const halfD = depth / 2;
      const lowerSpan = halfD * 0.35;
      const lowerAngle = Math.PI / 3;
      const lowerH = lowerSpan * Math.tan(lowerAngle);
      const upperSpan = halfD - lowerSpan;
      const upperH = upperSpan * Math.tan(pitchRad);
      const lowerSlopeLen = Math.sqrt(lowerSpan * lowerSpan + lowerH * lowerH) + overhang * 0.5;
      const upperSlopeLen = Math.sqrt(upperSpan * upperSpan + upperH * upperH) + overhang * 0.5;
      const roofPanelWidth = width + overhang * 2;

      // Back lower
      panels.push({
        id: 'roof-back-lower', name: 'Roof (Back Lower)',
        vertices: [{ x: 0, y: 0 }, { x: roofPanelWidth, y: 0 }, { x: roofPanelWidth, y: lowerSlopeLen }, { x: 0, y: lowerSlopeLen }],
        edges: [{ type: 'cut', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'valley', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      currentY += lowerSlopeLen;
      // Back upper
      panels.push({
        id: 'roof-back-upper', name: 'Roof (Back Upper)',
        vertices: [{ x: 0, y: 0 }, { x: roofPanelWidth, y: 0 }, { x: roofPanelWidth, y: upperSlopeLen }, { x: 0, y: upperSlopeLen }],
        edges: [{ type: 'valley', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'valley', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0, connectsTo: 'roof-back-lower',
      });
      currentY += upperSlopeLen;
      // Front upper
      panels.push({
        id: 'roof-front-upper', name: 'Roof (Front Upper)',
        vertices: [{ x: 0, y: 0 }, { x: roofPanelWidth, y: 0 }, { x: roofPanelWidth, y: upperSlopeLen }, { x: 0, y: upperSlopeLen }],
        edges: [{ type: 'valley', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'valley', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0, connectsTo: 'roof-back-upper',
      });
      currentY += upperSlopeLen;
      // Front lower
      panels.push({
        id: 'roof-front-lower', name: 'Roof (Front Lower)',
        vertices: [{ x: 0, y: 0 }, { x: roofPanelWidth, y: 0 }, { x: roofPanelWidth, y: lowerSlopeLen }, { x: 0, y: lowerSlopeLen }],
        edges: [{ type: 'valley', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'cut', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0, connectsTo: 'roof-front-upper',
      });
      maxHeight = currentY + lowerSlopeLen + GLUE_TAB_WIDTH;
    } else if (roof.style === 'mansard') {
      // Mansard: 4 steep side panels + 1 flat top
      const inset = depth * 0.15;
      const insetX = width * 0.15;
      const mansardAngle = (70 * Math.PI) / 180;
      const mansardH = inset * Math.tan(mansardAngle);
      const steepSlopeLen = Math.sqrt(inset * inset + mansardH * mansardH);
      const roofPanelWidth = width + overhang * 2;

      // Back steep
      panels.push({
        id: 'roof-back', name: 'Roof (Back Steep)',
        vertices: [{ x: 0, y: 0 }, { x: roofPanelWidth, y: 0 }, { x: roofPanelWidth, y: steepSlopeLen }, { x: 0, y: steepSlopeLen }],
        edges: [{ type: 'cut', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'cut', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      currentY += steepSlopeLen + PANEL_SPACING;
      // Front steep
      panels.push({
        id: 'roof-front', name: 'Roof (Front Steep)',
        vertices: [{ x: 0, y: 0 }, { x: roofPanelWidth, y: 0 }, { x: roofPanelWidth, y: steepSlopeLen }, { x: 0, y: steepSlopeLen }],
        edges: [{ type: 'cut', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'cut', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      currentY += steepSlopeLen + PANEL_SPACING;
      // Side steeps
      const sideRoofW = depth + overhang * 2;
      const sideSlopeLen = Math.sqrt(insetX * insetX + mansardH * mansardH);
      panels.push({
        id: 'roof-left', name: 'Roof (Left Steep)',
        vertices: [{ x: 0, y: 0 }, { x: sideRoofW, y: 0 }, { x: sideRoofW, y: sideSlopeLen }, { x: 0, y: sideSlopeLen }],
        edges: [{ type: 'cut', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'cut', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      currentX += sideRoofW + PANEL_SPACING;
      panels.push({
        id: 'roof-right', name: 'Roof (Right Steep)',
        vertices: [{ x: 0, y: 0 }, { x: sideRoofW, y: 0 }, { x: sideRoofW, y: sideSlopeLen }, { x: 0, y: sideSlopeLen }],
        edges: [{ type: 'cut', from: 0, to: 1 }, { type: 'glue-tab', from: 1, to: 2 }, { type: 'cut', from: 2, to: 3 }, { type: 'glue-tab', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      currentY += sideSlopeLen + PANEL_SPACING;
      // Flat top
      currentX = GLUE_TAB_WIDTH;
      const topW = width - 2 * insetX;
      const topD = depth - 2 * inset;
      panels.push({
        id: 'roof-top', name: 'Roof (Top)',
        vertices: [{ x: 0, y: 0 }, { x: topW, y: 0 }, { x: topW, y: topD }, { x: 0, y: topD }],
        edges: [{ type: 'cut', from: 0, to: 1 }, { type: 'cut', from: 1, to: 2 }, { type: 'cut', from: 2, to: 3 }, { type: 'cut', from: 3, to: 0 }],
        position: { x: currentX, y: currentY }, rotation: 0,
      });
      maxHeight = currentY + topD + GLUE_TAB_WIDTH;
    } else if (roof.style === 'hip') {
      const ridgeLength = Math.max(0, width - depth);
      const slopeLength = Math.sqrt(
        Math.pow(depth / 2 + overhang, 2) + Math.pow(roofHeight, 2)
      );
      const sideSlopeLength = Math.sqrt(
        Math.pow(width / 2 + overhang, 2) + Math.pow(roofHeight, 2)
      );

      const trapezoidTopWidth = ridgeLength + overhang * 2;
      const trapezoidBottomWidth = width + overhang * 2;
      const inset = (trapezoidBottomWidth - trapezoidTopWidth) / 2;

      const frontTrapezoid: Panel = {
        id: 'roof-front',
        name: 'Roof (Front)',
        vertices: [
          { x: 0, y: 0 },
          { x: trapezoidBottomWidth, y: 0 },
          { x: trapezoidBottomWidth - inset, y: slopeLength },
          { x: inset, y: slopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'glue-tab', from: 2, to: 3 },
          { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      };
      panels.push(frontTrapezoid);
      glueTabs.push(createGlueTab('roof-front-right', 'roof-front', 1, frontTrapezoid, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-front-left', 'roof-front', 3, frontTrapezoid, GLUE_TAB_WIDTH));

      const backTrapezoidX = currentX + trapezoidBottomWidth + GLUE_TAB_WIDTH * 2;
      const backTrapezoid: Panel = {
        id: 'roof-back',
        name: 'Roof (Back)',
        vertices: [
          { x: 0, y: 0 },
          { x: trapezoidBottomWidth, y: 0 },
          { x: trapezoidBottomWidth - inset, y: slopeLength },
          { x: inset, y: slopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'glue-tab', from: 2, to: 3 },
          { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: backTrapezoidX, y: currentY },
        rotation: 0,
      };
      panels.push(backTrapezoid);
      glueTabs.push(createGlueTab('roof-back-right', 'roof-back', 1, backTrapezoid, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-back-left', 'roof-back', 3, backTrapezoid, GLUE_TAB_WIDTH));

      const triangleY = currentY + slopeLength + GLUE_TAB_WIDTH * 2;
      const triangleWidth = depth + overhang * 2;

      const leftTriangle: Panel = {
        id: 'roof-left',
        name: 'Roof (Left)',
        vertices: [
          { x: 0, y: 0 },
          { x: triangleWidth, y: 0 },
          { x: triangleWidth / 2, y: sideSlopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'glue-tab', from: 2, to: 0 },
        ],
        position: { x: currentX, y: triangleY },
        rotation: 0,
      };
      panels.push(leftTriangle);
      glueTabs.push(createGlueTab('roof-left-right', 'roof-left', 1, leftTriangle, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-left-left', 'roof-left', 2, leftTriangle, GLUE_TAB_WIDTH));

      const rightTriangle: Panel = {
        id: 'roof-right',
        name: 'Roof (Right)',
        vertices: [
          { x: 0, y: 0 },
          { x: triangleWidth, y: 0 },
          { x: triangleWidth / 2, y: sideSlopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'glue-tab', from: 2, to: 0 },
        ],
        position: { x: currentX + triangleWidth + GLUE_TAB_WIDTH * 2, y: triangleY },
        rotation: 0,
      };
      panels.push(rightTriangle);
      glueTabs.push(createGlueTab('roof-right-right', 'roof-right', 1, rightTriangle, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-right-left', 'roof-right', 2, rightTriangle, GLUE_TAB_WIDTH));

      maxHeight = triangleY + sideSlopeLength + GLUE_TAB_WIDTH;
    } else if (roof.style === 'shed') {
      const roofPanelLength = Math.sqrt(
        Math.pow(depth + overhang * 2, 2) + Math.pow(roofHeight, 2)
      );
      const roofPanelWidth = width + overhang * 2;

      const shedRoof: Panel = {
        id: 'roof',
        name: 'Roof',
        vertices: [
          { x: 0, y: 0 },
          { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: roofPanelLength },
          { x: 0, y: roofPanelLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'glue-tab', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      };
      panels.push(shedRoof);
      glueTabs.push(createGlueTab('roof-right', 'roof', 1, shedRoof, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('roof-left', 'roof', 3, shedRoof, GLUE_TAB_WIDTH));

      maxHeight = currentY + roofPanelLength + GLUE_TAB_WIDTH;
    }

    // Attach 2D stickers to wall panels (paper mode — no facades)
    if (accessories && accessories.length > 0) {
      attachStickersToPanel(accessories, panels, undefined, params);
    }

    // Generate accessory panels (3D parts only — 2D stickers are embedded in walls)
    const maxStructuralY = Math.max(
      ...panels.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y)))
    );
    const accessories3D = accessories?.filter(a => a.renderMode !== '2d') || [];
    const accessoryPanels = accessories3D.length > 0
      ? generateAccessoryPanels(accessories3D, params, maxStructuralY + PANEL_SPACING * 2)
      : undefined;

    // Generate detail panels (opening trim + wall details + roof trim)
    const allAbove = [...panels, ...(accessoryPanels || [])];
    const maxAboveY = allAbove.length > 0
      ? Math.max(...allAbove.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y))))
      : maxStructuralY;

    let detailPanels: Panel[] = [];
    let detailY = maxAboveY + PANEL_SPACING * 2;

    // Opening trim
    const trimStyle = params.trimStyle || 'none';
    if (trimStyle !== 'none' && openings.length > 0) {
      const trimPanels = generateOpeningTrim(openings, params, trimStyle, detailY);
      detailPanels.push(...trimPanels);
      if (trimPanels.length > 0) {
        detailY = Math.max(...trimPanels.map(p => p.position.y + Math.max(...p.vertices.map(v => v.y)))) + PANEL_SPACING;
      }
    }

    // Wall details
    const wallDetailPanels = generateWallDetails(params, detailY);
    if (wallDetailPanels.length > 0) {
      detailPanels.push(...wallDetailPanels);
      detailY = Math.max(...wallDetailPanels.map(p => p.position.y + Math.max(...p.vertices.map(v => v.y)))) + PANEL_SPACING;
    }

    // Roof trim
    const roofTrimPanels = generateRoofTrimPanels(params, detailY);
    if (roofTrimPanels.length > 0) {
      detailPanels.push(...roofTrimPanels);
    }

    return buildPatternResult(panels, glueTabs, params, name, undefined, undefined, accessoryPanels, detailPanels.length > 0 ? detailPanels : undefined);
  }
}

// =============================================================================
// Separate Panel Strategy (Foamcore, Plywood, thick Chipboard)
// =============================================================================

export class SeparatePanelUnfoldStrategy implements UnfoldStrategy {
  unfold(params: BuildingParams, name: string, accessories?: import('@/types/building').Accessory[]): UnfoldedPattern {
    const { dimensions, roof, scale, openings = [] } = params;
    const material = params.material || DEFAULT_MATERIAL;
    const thickness = material.thickness;
    const useSlotTab = material.jointMethod === 'slot-tab';

    const feetToModelInches = 12 / scale.ratio;
    const width = dimensions.width * feetToModelInches;
    const depth = dimensions.depth * feetToModelInches;
    const height = dimensions.height * feetToModelInches;
    const overhang = roof.overhang * feetToModelInches;

    const frontOpenings = openings.filter((o) => o.wall === 'front');
    const backOpenings = openings.filter((o) => o.wall === 'back');
    const leftOpenings = openings.filter((o) => o.wall === 'left');
    const rightOpenings = openings.filter((o) => o.wall === 'right');

    const pitchRad = (roof.pitch * Math.PI) / 180;
    const roofHeight = roof.style === 'flat' ? 0 : (depth / 2) * Math.tan(pitchRad);

    const panels: Panel[] = [];
    const glueTabs: GlueTab[] = [];

    // Joint compensation: miter keeps full dims, butt shortens side panels
    const isMiter = material.jointMethod === 'miter';
    const compensate = isMiter ? compensateMiterJoint : (w: number, h: number, side: 'front' | 'back' | 'left' | 'right') => compensateButtJoint(w, h, side, thickness);

    let currentX = PANEL_SPACING;
    let currentY = PANEL_SPACING;
    let maxRowHeight = 0;

    // === WALL PANELS (separate, all cut edges, with roof-compensated profiles) ===

    const sepWallDefs: Array<{
      id: string; name: string; side: 'front' | 'back' | 'left' | 'right';
      baseWidth: number; openingsForWall: typeof frontOpenings;
    }> = [
      { id: 'front-wall', name: 'Front Wall', side: 'front', baseWidth: width, openingsForWall: frontOpenings },
      { id: 'right-wall', name: 'Right Wall', side: 'right', baseWidth: depth, openingsForWall: rightOpenings },
      { id: 'back-wall', name: 'Back Wall', side: 'back', baseWidth: width, openingsForWall: backOpenings },
      { id: 'left-wall', name: 'Left Wall', side: 'left', baseWidth: depth, openingsForWall: leftOpenings },
    ];

    let wallIdx = 0;
    for (const wallDef of sepWallDefs) {
      const profile = getWallProfile({
        roofStyle: roof.style,
        wallSide: wallDef.side,
        wallWidth: wallDef.baseWidth,
        wallHeight: height,
        roofPitch: roof.pitch,
        buildingDepth: depth,
      });

      // Apply joint compensation: shrink width for butt joints on side walls
      const dims = compensate(wallDef.baseWidth, height, wallDef.side);
      const scaleX = dims.width / wallDef.baseWidth;
      const profileVerts = profile.vertices.map(v => ({
        x: v.x * scaleX,
        y: v.y, // Height stays — joint compensation only affects width
      }));
      const profileMaxH = Math.max(...profileVerts.map(v => v.y));

      const n = profileVerts.length;
      const edges: Panel['edges'] = [];
      for (let i = 0; i < n; i++) {
        edges.push({ type: 'cut', from: i, to: (i + 1) % n });
      }

      const dimLabel = `${dims.width.toFixed(2)}" × ${profileMaxH.toFixed(2)}"`;
      const wall: Panel = {
        id: wallDef.id,
        name: `${wallDef.name} (${dimLabel})`,
        vertices: profileVerts,
        edges,
        position: { x: currentX, y: currentY },
        rotation: 0,
        openings: processOpenings(openings, feetToModelInches, wallDef.openingsForWall),
      };
      panels.push(wall);
      currentX += dims.width + PANEL_SPACING;
      maxRowHeight = Math.max(maxRowHeight, profileMaxH);

      // Start second row after first 2 walls
      wallIdx++;
      if (wallIdx === 2) {
        currentX = PANEL_SPACING;
        currentY += maxRowHeight + PANEL_SPACING;
        maxRowHeight = 0;
      }
    }
    maxRowHeight = Math.max(maxRowHeight, height);

    // === ROOF PANELS ===
    currentX = PANEL_SPACING;
    currentY += maxRowHeight + PANEL_SPACING * 2;

    if (roof.style === 'flat') {
      const roofW = width + overhang * 2;
      const roofD = depth + overhang * 2;
      panels.push({
        id: 'roof',
        name: `Roof (${roofW.toFixed(2)}" × ${roofD.toFixed(2)}")`,
        vertices: [
          { x: 0, y: 0 },
          { x: roofW, y: 0 },
          { x: roofW, y: roofD },
          { x: 0, y: roofD },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });
    } else if (roof.style === 'gable') {
      const roofPanelLength = Math.sqrt(
        Math.pow(depth / 2 + overhang, 2) + Math.pow(roofHeight, 2)
      );
      const roofPanelWidth = width + overhang * 2;

      panels.push({
        id: 'roof-left',
        name: `Roof Left (${roofPanelWidth.toFixed(2)}" × ${roofPanelLength.toFixed(2)}")`,
        vertices: [
          { x: 0, y: 0 },
          { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: roofPanelLength },
          { x: 0, y: roofPanelLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });

      currentX += roofPanelWidth + PANEL_SPACING;

      panels.push({
        id: 'roof-right',
        name: `Roof Right (${roofPanelWidth.toFixed(2)}" × ${roofPanelLength.toFixed(2)}")`,
        vertices: [
          { x: 0, y: 0 },
          { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: roofPanelLength },
          { x: 0, y: roofPanelLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });

      // Gable ends are now integrated into the left/right wall panels as pentagons
    } else if (roof.style === 'hip') {
      const ridgeLength = Math.max(0, width - depth);
      const slopeLength = Math.sqrt(
        Math.pow(depth / 2 + overhang, 2) + Math.pow(roofHeight, 2)
      );
      const sideSlopeLength = Math.sqrt(
        Math.pow(width / 2 + overhang, 2) + Math.pow(roofHeight, 2)
      );

      const trapTopW = ridgeLength + overhang * 2;
      const trapBottomW = width + overhang * 2;
      const inset = (trapBottomW - trapTopW) / 2;

      // Front trapezoid
      panels.push({
        id: 'roof-front',
        name: 'Roof (Front)',
        vertices: [
          { x: 0, y: 0 },
          { x: trapBottomW, y: 0 },
          { x: trapBottomW - inset, y: slopeLength },
          { x: inset, y: slopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });

      currentX += trapBottomW + PANEL_SPACING;

      // Back trapezoid
      panels.push({
        id: 'roof-back',
        name: 'Roof (Back)',
        vertices: [
          { x: 0, y: 0 },
          { x: trapBottomW, y: 0 },
          { x: trapBottomW - inset, y: slopeLength },
          { x: inset, y: slopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });

      // Side triangles
      const triangleWidth = depth + overhang * 2;
      currentX = PANEL_SPACING;
      currentY += slopeLength + PANEL_SPACING;

      panels.push({
        id: 'roof-left',
        name: 'Roof (Left)',
        vertices: [
          { x: 0, y: 0 },
          { x: triangleWidth, y: 0 },
          { x: triangleWidth / 2, y: sideSlopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });

      currentX += triangleWidth + PANEL_SPACING;

      panels.push({
        id: 'roof-right',
        name: 'Roof (Right)',
        vertices: [
          { x: 0, y: 0 },
          { x: triangleWidth, y: 0 },
          { x: triangleWidth / 2, y: sideSlopeLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });
    } else if (roof.style === 'shed') {
      const roofPanelLength = Math.sqrt(
        Math.pow(depth + overhang * 2, 2) + Math.pow(roofHeight, 2)
      );
      const roofPanelWidth = width + overhang * 2;

      panels.push({
        id: 'roof',
        name: `Roof (${roofPanelWidth.toFixed(2)}" × ${roofPanelLength.toFixed(2)}")`,
        vertices: [
          { x: 0, y: 0 },
          { x: roofPanelWidth, y: 0 },
          { x: roofPanelWidth, y: roofPanelLength },
          { x: 0, y: roofPanelLength },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });
    } else if (roof.style === 'saltbox' || roof.style === 'gambrel' || roof.style === 'mansard') {
      // These use the same roof panel logic as the paper strategy, just with all-cut edges
      const roofPanelWidth = width + overhang * 2;
      const cutEdges = (n: number): Panel['edges'] =>
        Array.from({ length: n }, (_, i) => ({ type: 'cut' as const, from: i, to: (i + 1) % n }));

      const addRoofPanel = (id: string, name: string, w: number, h: number) => {
        panels.push({
          id, name: `${name} (${w.toFixed(2)}" × ${h.toFixed(2)}")`,
          vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
          edges: cutEdges(4),
          position: { x: currentX, y: currentY },
          rotation: 0,
        });
        currentY += h + PANEL_SPACING;
      };

      if (roof.style === 'saltbox') {
        const halfD = depth / 2;
        const ridgePos = halfD * 0.35;
        const pitchRad2 = Math.atan(roofHeight / halfD);
        const peakH = ridgePos * Math.tan(pitchRad2);
        const frontSlopeLen = Math.sqrt(ridgePos * ridgePos + peakH * peakH) + overhang;
        const backRun = depth - ridgePos;
        const backSlopeLen = Math.sqrt(backRun * backRun + peakH * peakH) + overhang;
        addRoofPanel('roof-front', 'Roof (Front)', roofPanelWidth, frontSlopeLen);
        addRoofPanel('roof-back', 'Roof (Back)', roofPanelWidth, backSlopeLen);
      } else if (roof.style === 'gambrel') {
        const halfD = depth / 2;
        const lowerSpan = halfD * 0.35;
        const lowerH = lowerSpan * Math.tan(Math.PI / 3);
        const upperSpan = halfD - lowerSpan;
        const upperH = upperSpan * Math.tan(pitchRad);
        const lowerSlopeLen = Math.sqrt(lowerSpan * lowerSpan + lowerH * lowerH) + overhang * 0.5;
        const upperSlopeLen = Math.sqrt(upperSpan * upperSpan + upperH * upperH) + overhang * 0.5;
        addRoofPanel('roof-back-lower', 'Roof (Back Lower)', roofPanelWidth, lowerSlopeLen);
        addRoofPanel('roof-back-upper', 'Roof (Back Upper)', roofPanelWidth, upperSlopeLen);
        addRoofPanel('roof-front-upper', 'Roof (Front Upper)', roofPanelWidth, upperSlopeLen);
        addRoofPanel('roof-front-lower', 'Roof (Front Lower)', roofPanelWidth, lowerSlopeLen);
      } else if (roof.style === 'mansard') {
        const inset = depth * 0.15;
        const insetX = width * 0.15;
        const mansardAngle = (70 * Math.PI) / 180;
        const mansardH = inset * Math.tan(mansardAngle);
        const steepSlopeLen = Math.sqrt(inset * inset + mansardH * mansardH);
        const sideSlopeLen = Math.sqrt(insetX * insetX + mansardH * mansardH);
        const sideRoofW = depth + overhang * 2;
        addRoofPanel('roof-back', 'Roof (Back Steep)', roofPanelWidth, steepSlopeLen);
        addRoofPanel('roof-front', 'Roof (Front Steep)', roofPanelWidth, steepSlopeLen);
        addRoofPanel('roof-left', 'Roof (Left Steep)', sideRoofW, sideSlopeLen);
        addRoofPanel('roof-right', 'Roof (Right Steep)', sideRoofW, sideSlopeLen);
        const topW = width - 2 * insetX;
        const topD = depth - 2 * inset;
        addRoofPanel('roof-top', 'Roof (Top)', topW, topD);
      }
    }

    // Generate facade panels if requested
    let facadePanels: Panel[] | undefined;
    if (material.generateFacades) {
      facadePanels = this.generateFacades(params, panels);
    }

    // Generate slot-tab joints if needed
    if (useSlotTab) {
      this.applySlotTabJoints(panels, thickness);
    }

    // Attach 2D stickers to wall/facade panels
    if (accessories && accessories.length > 0) {
      attachStickersToPanel(accessories, panels, facadePanels, params);
    }

    // Generate accessory panels (3D parts only — 2D stickers are embedded in walls/facades)
    const allStructural = [...panels, ...(facadePanels || [])];
    const maxStructuralY2 = allStructural.length > 0
      ? Math.max(...allStructural.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y))))
      : 1;
    const accessories3D = accessories?.filter(a => a.renderMode !== '2d') || [];
    const accessoryPanels = accessories3D.length > 0
      ? generateAccessoryPanels(accessories3D, params, maxStructuralY2 + PANEL_SPACING * 2)
      : undefined;

    // Generate detail panels (opening trim + wall details + roof trim)
    const allAbove2 = [...allStructural, ...(accessoryPanels || [])];
    const maxAboveY2 = allAbove2.length > 0
      ? Math.max(...allAbove2.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y))))
      : maxStructuralY2;

    let detailPanels2: Panel[] = [];
    let detailY2 = maxAboveY2 + PANEL_SPACING * 2;

    const trimStyle = params.trimStyle || 'none';
    if (trimStyle !== 'none' && openings.length > 0) {
      const trimPanels = generateOpeningTrim(openings, params, trimStyle, detailY2);
      detailPanels2.push(...trimPanels);
      if (trimPanels.length > 0) {
        detailY2 = Math.max(...trimPanels.map(p => p.position.y + Math.max(...p.vertices.map(v => v.y)))) + PANEL_SPACING;
      }
    }

    const wallDetailPanels = generateWallDetails(params, detailY2);
    if (wallDetailPanels.length > 0) {
      detailPanels2.push(...wallDetailPanels);
      detailY2 = Math.max(...wallDetailPanels.map(p => p.position.y + Math.max(...p.vertices.map(v => v.y)))) + PANEL_SPACING;
    }

    const roofTrimPanels = generateRoofTrimPanels(params, detailY2);
    if (roofTrimPanels.length > 0) {
      detailPanels2.push(...roofTrimPanels);
    }

    return buildPatternResult(panels, glueTabs, params, name, undefined, facadePanels, accessoryPanels, detailPanels2.length > 0 ? detailPanels2 : undefined);
  }

  /**
   * Generate facade (texture) sheets that match structural panel dimensions.
   * These are printed on paper and glued onto the structural panels.
   */
  private generateFacades(params: BuildingParams, structuralPanels: Panel[]): Panel[] {
    const facadePanels: Panel[] = [];
    const wallPanelIds = ['front-wall', 'right-wall', 'back-wall', 'left-wall'];

    // Find max Y from structural panels to position facades below
    const maxStructuralY = Math.max(
      ...structuralPanels.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y)))
    );

    let facadeX = PANEL_SPACING;
    let facadeY = maxStructuralY + PANEL_SPACING * 3;
    let maxRowH = 0;

    for (const panel of structuralPanels) {
      if (!wallPanelIds.includes(panel.id)) continue;

      const panelW = Math.max(...panel.vertices.map((v) => v.x));
      const panelH = Math.max(...panel.vertices.map((v) => v.y));

      // Wrap to next row if needed
      if (facadeX + panelW > 20) {
        facadeX = PANEL_SPACING;
        facadeY += maxRowH + PANEL_SPACING;
        maxRowH = 0;
      }

      // Copy polygon shape from structural panel (may be pentagon for gable, etc.)
      const facadeVerts = panel.vertices.map(v => ({ x: v.x, y: v.y }));
      const facadeEdges: Panel['edges'] = facadeVerts.map((_, i) => ({
        type: 'cut' as const,
        from: i,
        to: (i + 1) % facadeVerts.length,
      }));

      const facade: Panel = {
        id: `facade-${panel.id}`,
        name: `Facade: ${panel.name.replace(/ \(.*\)/, '')}`,
        vertices: facadeVerts,
        edges: facadeEdges,
        position: { x: facadeX, y: facadeY },
        rotation: 0,
        openings: panel.openings ? [...panel.openings] : undefined,
      };

      facadePanels.push(facade);
      facadeX += panelW + PANEL_SPACING;
      maxRowH = Math.max(maxRowH, panelH);
    }

    return facadePanels;
  }

  /**
   * Add slot-and-tab joint markers to panels.
   * Marks edges that will have slots or tabs for plywood/MDF construction.
   */
  private applySlotTabJoints(panels: Panel[], thickness: number): void {
    // For wall panels, vertical edges get slot-tab joints
    const wallPanels = panels.filter((p) =>
      ['front-wall', 'back-wall', 'left-wall', 'right-wall'].includes(p.id)
    );

    for (const panel of wallPanels) {
      const panelH = Math.max(...panel.vertices.map((v) => v.y));
      if (panelH <= 0) continue;

      const joints = generateSlotTabJoints(panelH, thickness);

      // Mark vertical edges as slot-tab type
      for (const edge of panel.edges) {
        const v1 = panel.vertices[edge.from];
        const v2 = panel.vertices[edge.to];
        // Vertical edges (same x, different y)
        if (Math.abs(v1.x - v2.x) < 0.001 && Math.abs(v1.y - v2.y) > 0.001) {
          (edge as any).slotTabJoints = joints;
        }
      }
    }
  }
}

// =============================================================================
// Score and Fold Strategy (thin chipboard/matboard)
// =============================================================================

export class ScoreAndFoldUnfoldStrategy implements UnfoldStrategy {
  /**
   * Similar to paper strategy but fold lines become 'score' type
   * and facade sheets are generated separately.
   */
  unfold(params: BuildingParams, name: string, accessories?: import('@/types/building').Accessory[]): UnfoldedPattern {
    // Use paper strategy as base, then modify fold types
    const paperStrategy = new PaperUnfoldStrategy();
    const result = paperStrategy.unfold(params, name, accessories);

    // Convert fold edges to score type
    for (const panel of result.panels) {
      for (const edge of panel.edges) {
        if (edge.type === 'mountain' || edge.type === 'valley') {
          (edge as any).type = 'score';
        }
      }
    }

    // Update material type and assembly steps
    const material = params.material || DEFAULT_MATERIAL;
    result.materialType = material.type;
    result.assemblySteps = MATERIAL_PROPERTIES[material.type].assemblySteps;

    // Generate facade panels if requested
    if (material.generateFacades) {
      const wallPanelIds = ['front-wall', 'right-wall', 'back-wall', 'left-wall'];
      const facadePanels: Panel[] = [];

      const maxStructuralY = Math.max(
        ...result.panels.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y)))
      );

      let facadeX = PANEL_SPACING;
      let facadeY = maxStructuralY + PANEL_SPACING * 3;
      let maxRowH = 0;

      for (const panel of result.panels) {
        if (!wallPanelIds.includes(panel.id)) continue;

        const panelW = Math.max(...panel.vertices.map((v) => v.x));
        const panelH = Math.max(...panel.vertices.map((v) => v.y));

        // Copy polygon shape from structural panel (may be pentagon for gable, etc.)
        const facadeVerts = panel.vertices.map(v => ({ x: v.x, y: v.y }));
        const facadeEdges: Panel['edges'] = facadeVerts.map((_, i) => ({
          type: 'cut' as const,
          from: i,
          to: (i + 1) % facadeVerts.length,
        }));

        const facade: Panel = {
          id: `facade-${panel.id}`,
          name: `Facade: ${panel.name}`,
          vertices: facadeVerts,
          edges: facadeEdges,
          position: { x: facadeX, y: facadeY },
          rotation: 0,
          openings: panel.openings ? [...panel.openings] : undefined,
        };

        facadePanels.push(facade);
        facadeX += panelW + PANEL_SPACING;
        maxRowH = Math.max(maxRowH, panelH);
      }

      result.facadePanels = facadePanels;

      // Recalculate total dimensions
      const allPanels = [...result.panels, ...facadePanels, ...(result.accessoryPanels || []), ...(result.detailPanels || [])];
      result.width =
        Math.max(
          ...allPanels.map((p) => p.position.x + Math.max(...p.vertices.map((v) => v.x)))
        ) + GLUE_TAB_WIDTH;
      result.height =
        Math.max(
          ...allPanels.map((p) => p.position.y + Math.max(...p.vertices.map((v) => v.y)))
        ) + GLUE_TAB_WIDTH;
    }

    return result;
  }
}

// =============================================================================
// Strategy Selection
// =============================================================================

/**
 * Select the appropriate unfold strategy based on material configuration.
 */
export function getUnfoldStrategy(material?: MaterialConfig): UnfoldStrategy {
  const mat = material || DEFAULT_MATERIAL;
  const props = MATERIAL_PROPERTIES[mat.type];

  // Chipboard: use score-and-fold if thin enough, separate panels otherwise
  if (mat.type === 'chipboard') {
    if (props.conditionalFold && props.maxFoldThickness && mat.thickness <= props.maxFoldThickness) {
      return new ScoreAndFoldUnfoldStrategy();
    }
    return new SeparatePanelUnfoldStrategy();
  }

  // Paper: always fold
  if (props.foldable) {
    return new PaperUnfoldStrategy();
  }

  // Everything else (foamcore, plywood): separate panels
  return new SeparatePanelUnfoldStrategy();
}
