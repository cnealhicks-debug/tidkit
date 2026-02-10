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
import { compensateButtJoint, generateSlotTabJoints } from './material-compensation';

// =============================================================================
// Strategy Interface
// =============================================================================

export interface UnfoldStrategy {
  /**
   * Generate the unfolded 2D pattern for the given building parameters.
   */
  unfold(params: BuildingParams, name: string): UnfoldedPattern;
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
  facadePanels?: Panel[]
): UnfoldedPattern {
  const allPanels = [...panels, ...(facadePanels || [])];
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
  };
}

// =============================================================================
// Paper Unfold Strategy (original logic, extracted verbatim)
// =============================================================================

export class PaperUnfoldStrategy implements UnfoldStrategy {
  unfold(params: BuildingParams, name: string): UnfoldedPattern {
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

    const frontWall: Panel = {
      id: 'front-wall',
      name: 'Front Wall',
      vertices: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
      edges: [
        { type: 'glue-tab', from: 0, to: 1 },
        { type: 'valley', from: 1, to: 2 },
        { type: 'mountain', from: 2, to: 3 },
        { type: 'cut', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      openings: processOpenings(openings, feetToModelInches, frontOpenings),
    };
    panels.push(frontWall);
    glueTabs.push(createGlueTab('front-left-tab', 'front-wall', 3, frontWall, GLUE_TAB_WIDTH));
    currentX += width;

    const rightWall: Panel = {
      id: 'right-wall',
      name: 'Right Wall',
      vertices: [
        { x: 0, y: 0 },
        { x: depth, y: 0 },
        { x: depth, y: height },
        { x: 0, y: height },
      ],
      edges: [
        { type: 'glue-tab', from: 0, to: 1 },
        { type: 'valley', from: 1, to: 2 },
        { type: 'mountain', from: 2, to: 3 },
        { type: 'valley', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      connectsTo: 'front-wall',
      openings: processOpenings(openings, feetToModelInches, rightOpenings),
    };
    panels.push(rightWall);
    currentX += depth;

    const backWall: Panel = {
      id: 'back-wall',
      name: 'Back Wall',
      vertices: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
      edges: [
        { type: 'glue-tab', from: 0, to: 1 },
        { type: 'valley', from: 1, to: 2 },
        { type: 'mountain', from: 2, to: 3 },
        { type: 'valley', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      connectsTo: 'right-wall',
      openings: processOpenings(openings, feetToModelInches, backOpenings),
    };
    panels.push(backWall);
    currentX += width;

    const leftWall: Panel = {
      id: 'left-wall',
      name: 'Left Wall',
      vertices: [
        { x: 0, y: 0 },
        { x: depth, y: 0 },
        { x: depth, y: height },
        { x: 0, y: height },
      ],
      edges: [
        { type: 'glue-tab', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'mountain', from: 2, to: 3 },
        { type: 'valley', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      connectsTo: 'back-wall',
      openings: processOpenings(openings, feetToModelInches, leftOpenings),
    };
    panels.push(leftWall);
    glueTabs.push(createGlueTab('left-right-tab', 'left-wall', 1, leftWall, GLUE_TAB_WIDTH));

    currentX += depth + GLUE_TAB_WIDTH;
    maxHeight = Math.max(maxHeight, height + GLUE_TAB_WIDTH * 2);

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

      // Gable ends
      currentX = roofPanelWidth + GLUE_TAB_WIDTH * 3;
      currentY = panels[0].position.y;

      const gableWidth = depth;
      const gableFront: Panel = {
        id: 'gable-front',
        name: 'Gable (Front)',
        vertices: [
          { x: 0, y: 0 },
          { x: gableWidth, y: 0 },
          { x: gableWidth / 2, y: roofHeight },
        ],
        edges: [
          { type: 'glue-tab', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'glue-tab', from: 2, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      };
      panels.push(gableFront);
      glueTabs.push(createGlueTab('gable-front-bottom', 'gable-front', 0, gableFront, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('gable-front-right', 'gable-front', 1, gableFront, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('gable-front-left', 'gable-front', 2, gableFront, GLUE_TAB_WIDTH));

      currentY += roofHeight + GLUE_TAB_WIDTH * 2;

      const gableBack: Panel = {
        id: 'gable-back',
        name: 'Gable (Back)',
        vertices: [
          { x: 0, y: 0 },
          { x: gableWidth, y: 0 },
          { x: gableWidth / 2, y: roofHeight },
        ],
        edges: [
          { type: 'glue-tab', from: 0, to: 1 },
          { type: 'glue-tab', from: 1, to: 2 },
          { type: 'glue-tab', from: 2, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      };
      panels.push(gableBack);
      glueTabs.push(createGlueTab('gable-back-bottom', 'gable-back', 0, gableBack, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('gable-back-right', 'gable-back', 1, gableBack, GLUE_TAB_WIDTH));
      glueTabs.push(createGlueTab('gable-back-left', 'gable-back', 2, gableBack, GLUE_TAB_WIDTH));
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

    return buildPatternResult(panels, glueTabs, params, name);
  }
}

// =============================================================================
// Separate Panel Strategy (Foamcore, Plywood, thick Chipboard)
// =============================================================================

export class SeparatePanelUnfoldStrategy implements UnfoldStrategy {
  unfold(params: BuildingParams, name: string): UnfoldedPattern {
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

    // Butt joint compensation: side panels are shortened
    const frontDims = compensateButtJoint(width, height, 'front', thickness);
    const backDims = compensateButtJoint(width, height, 'back', thickness);
    const leftDims = compensateButtJoint(depth, height, 'left', thickness);
    const rightDims = compensateButtJoint(depth, height, 'right', thickness);

    let currentX = PANEL_SPACING;
    let currentY = PANEL_SPACING;
    let maxRowHeight = 0;

    // === WALL PANELS (separate, all cut edges) ===

    // Front wall
    const frontWall: Panel = {
      id: 'front-wall',
      name: `Front Wall (${frontDims.width.toFixed(2)}" × ${frontDims.height.toFixed(2)}")`,
      vertices: [
        { x: 0, y: 0 },
        { x: frontDims.width, y: 0 },
        { x: frontDims.width, y: frontDims.height },
        { x: 0, y: frontDims.height },
      ],
      edges: [
        { type: 'cut', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'cut', from: 2, to: 3 },
        { type: 'cut', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      openings: processOpenings(openings, feetToModelInches, frontOpenings),
    };
    panels.push(frontWall);
    currentX += frontDims.width + PANEL_SPACING;
    maxRowHeight = Math.max(maxRowHeight, frontDims.height);

    // Right wall
    const rightWall: Panel = {
      id: 'right-wall',
      name: `Right Wall (${rightDims.width.toFixed(2)}" × ${rightDims.height.toFixed(2)}")`,
      vertices: [
        { x: 0, y: 0 },
        { x: rightDims.width, y: 0 },
        { x: rightDims.width, y: rightDims.height },
        { x: 0, y: rightDims.height },
      ],
      edges: [
        { type: 'cut', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'cut', from: 2, to: 3 },
        { type: 'cut', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      openings: processOpenings(openings, feetToModelInches, rightOpenings),
    };
    panels.push(rightWall);
    currentX += rightDims.width + PANEL_SPACING;
    maxRowHeight = Math.max(maxRowHeight, rightDims.height);

    // Second row
    currentX = PANEL_SPACING;
    currentY += maxRowHeight + PANEL_SPACING;
    maxRowHeight = 0;

    // Back wall
    const backWall: Panel = {
      id: 'back-wall',
      name: `Back Wall (${backDims.width.toFixed(2)}" × ${backDims.height.toFixed(2)}")`,
      vertices: [
        { x: 0, y: 0 },
        { x: backDims.width, y: 0 },
        { x: backDims.width, y: backDims.height },
        { x: 0, y: backDims.height },
      ],
      edges: [
        { type: 'cut', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'cut', from: 2, to: 3 },
        { type: 'cut', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      openings: processOpenings(openings, feetToModelInches, backOpenings),
    };
    panels.push(backWall);
    currentX += backDims.width + PANEL_SPACING;
    maxRowHeight = Math.max(maxRowHeight, backDims.height);

    // Left wall
    const leftWall: Panel = {
      id: 'left-wall',
      name: `Left Wall (${leftDims.width.toFixed(2)}" × ${leftDims.height.toFixed(2)}")`,
      vertices: [
        { x: 0, y: 0 },
        { x: leftDims.width, y: 0 },
        { x: leftDims.width, y: leftDims.height },
        { x: 0, y: leftDims.height },
      ],
      edges: [
        { type: 'cut', from: 0, to: 1 },
        { type: 'cut', from: 1, to: 2 },
        { type: 'cut', from: 2, to: 3 },
        { type: 'cut', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
      openings: processOpenings(openings, feetToModelInches, leftOpenings),
    };
    panels.push(leftWall);
    maxRowHeight = Math.max(maxRowHeight, leftDims.height);

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

      // Gable ends
      const gableWidth = depth;
      currentX = PANEL_SPACING;
      currentY += roofPanelLength + PANEL_SPACING;

      panels.push({
        id: 'gable-front',
        name: 'Gable (Front)',
        vertices: [
          { x: 0, y: 0 },
          { x: gableWidth, y: 0 },
          { x: gableWidth / 2, y: roofHeight },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });

      currentX += gableWidth + PANEL_SPACING;

      panels.push({
        id: 'gable-back',
        name: 'Gable (Back)',
        vertices: [
          { x: 0, y: 0 },
          { x: gableWidth, y: 0 },
          { x: gableWidth / 2, y: roofHeight },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 0 },
        ],
        position: { x: currentX, y: currentY },
        rotation: 0,
      });
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

    return buildPatternResult(panels, glueTabs, params, name, undefined, facadePanels);
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

      const facade: Panel = {
        id: `facade-${panel.id}`,
        name: `Facade: ${panel.name.replace(/ \(.*\)/, '')}`,
        vertices: [
          { x: 0, y: 0 },
          { x: panelW, y: 0 },
          { x: panelW, y: panelH },
          { x: 0, y: panelH },
        ],
        edges: [
          { type: 'cut', from: 0, to: 1 },
          { type: 'cut', from: 1, to: 2 },
          { type: 'cut', from: 2, to: 3 },
          { type: 'cut', from: 3, to: 0 },
        ],
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
  unfold(params: BuildingParams, name: string): UnfoldedPattern {
    // Use paper strategy as base, then modify fold types
    const paperStrategy = new PaperUnfoldStrategy();
    const result = paperStrategy.unfold(params, name);

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

        const facade: Panel = {
          id: `facade-${panel.id}`,
          name: `Facade: ${panel.name}`,
          vertices: [
            { x: 0, y: 0 },
            { x: panelW, y: 0 },
            { x: panelW, y: panelH },
            { x: 0, y: panelH },
          ],
          edges: [
            { type: 'cut', from: 0, to: 1 },
            { type: 'cut', from: 1, to: 2 },
            { type: 'cut', from: 2, to: 3 },
            { type: 'cut', from: 3, to: 0 },
          ],
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
      const allPanels = [...result.panels, ...facadePanels];
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
