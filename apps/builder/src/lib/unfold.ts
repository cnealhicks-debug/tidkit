/**
 * TidKit Builder - Building Unfolding Algorithm
 * Converts 3D building geometry into flat 2D patterns for papercraft
 */

import { BuildingParams, RoofStyle, Opening, FloorConfig, calculateTotalHeight } from '@/types/building';

export interface Point2D {
  x: number;
  y: number;
}

// Opening cutout in a panel (converted from Opening)
export interface PanelOpening {
  id: string;
  type: 'window' | 'door';
  // Position relative to panel (in model inches)
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface Panel {
  id: string;
  name: string;
  vertices: Point2D[];
  // Edge types for cutting/folding
  edges: {
    type: 'cut' | 'mountain' | 'valley' | 'glue-tab';
    from: number; // vertex index
    to: number;   // vertex index
  }[];
  // Connection info for assembly
  connectsTo?: string;
  // Position in the unfolded layout
  position: Point2D;
  rotation: number; // degrees
  // Openings (cutouts) in this panel
  openings?: PanelOpening[];
}

export interface GlueTab {
  id: string;
  parentPanel: string;
  edgeIndex: number;
  vertices: Point2D[];
  position: Point2D;
}

export interface UnfoldedPattern {
  panels: Panel[];
  glueTabs: GlueTab[];
  // Total bounding box in model inches
  width: number;
  height: number;
  // Building info for labels
  buildingName: string;
  scale: string;
  realWorldDimensions: {
    width: number;
    depth: number;
    height: number;
  };
}

const GLUE_TAB_WIDTH = 0.25; // inches in model scale

/**
 * Convert openings from real-world feet to model inches and assign to wall panels
 */
function processOpenings(
  openings: Opening[],
  feetToModelInches: number,
  wallId: string,
  wallOpenings: Opening[]
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

/**
 * Convert building parameters to unfolded 2D pattern
 */
export function unfoldBuilding(params: BuildingParams, name: string = 'Building'): UnfoldedPattern {
  const { dimensions, roof, scale, openings = [] } = params;

  // Convert real-world feet to model inches
  const feetToModelInches = 12 / scale.ratio;
  const width = dimensions.width * feetToModelInches;
  const depth = dimensions.depth * feetToModelInches;
  const height = dimensions.height * feetToModelInches;
  const overhang = roof.overhang * feetToModelInches;

  // Group openings by wall
  const frontOpenings = openings.filter(o => o.wall === 'front');
  const backOpenings = openings.filter(o => o.wall === 'back');
  const leftOpenings = openings.filter(o => o.wall === 'left');
  const rightOpenings = openings.filter(o => o.wall === 'right');

  // Calculate roof height
  const pitchRad = (roof.pitch * Math.PI) / 180;
  const roofHeight = roof.style === 'flat' ? 0 : (depth / 2) * Math.tan(pitchRad);

  const panels: Panel[] = [];
  const glueTabs: GlueTab[] = [];

  // Current layout position
  let currentX = GLUE_TAB_WIDTH;
  let currentY = GLUE_TAB_WIDTH;
  let maxHeight = 0;

  // === WALLS ===
  // Layout walls in a strip: Front -> Right -> Back -> Left

  // Front wall
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
      { type: 'glue-tab', from: 0, to: 1 },  // bottom - glue to base
      { type: 'valley', from: 1, to: 2 },     // right - fold to right wall
      { type: 'mountain', from: 2, to: 3 },   // top - fold to roof
      { type: 'cut', from: 3, to: 0 },        // left - cut edge
    ],
    position: { x: currentX, y: currentY },
    rotation: 0,
    openings: processOpenings(openings, feetToModelInches, 'front-wall', frontOpenings),
  };
  panels.push(frontWall);

  // Add glue tab for front wall left edge
  glueTabs.push(createGlueTab('front-left-tab', 'front-wall', 3, frontWall, GLUE_TAB_WIDTH));

  currentX += width;

  // Right wall
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
    openings: processOpenings(openings, feetToModelInches, 'right-wall', rightOpenings),
  };
  panels.push(rightWall);
  currentX += depth;

  // Back wall
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
    openings: processOpenings(openings, feetToModelInches, 'back-wall', backOpenings),
  };
  panels.push(backWall);
  currentX += width;

  // Left wall
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
      { type: 'cut', from: 1, to: 2 },  // right edge - cut (connects to front)
      { type: 'mountain', from: 2, to: 3 },
      { type: 'valley', from: 3, to: 0 },
    ],
    position: { x: currentX, y: currentY },
    rotation: 0,
    connectsTo: 'back-wall',
    openings: processOpenings(openings, feetToModelInches, 'left-wall', leftOpenings),
  };
  panels.push(leftWall);

  // Add glue tab for left wall right edge
  glueTabs.push(createGlueTab('left-right-tab', 'left-wall', 1, leftWall, GLUE_TAB_WIDTH));

  currentX += depth + GLUE_TAB_WIDTH;
  maxHeight = Math.max(maxHeight, height + GLUE_TAB_WIDTH * 2);

  // === ROOF ===
  currentY = maxHeight + GLUE_TAB_WIDTH * 2;
  currentX = GLUE_TAB_WIDTH;

  if (roof.style === 'flat') {
    // Flat roof - single panel
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
    // Gable roof - two roof panels + two gable ends
    const roofPanelLength = Math.sqrt(Math.pow(depth / 2 + overhang, 2) + Math.pow(roofHeight, 2));
    const roofPanelWidth = width + overhang * 2;

    // Left roof panel
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
        { type: 'valley', from: 2, to: 3 },  // ridge fold
        { type: 'glue-tab', from: 3, to: 0 },
      ],
      position: { x: currentX, y: currentY },
      rotation: 0,
    };
    panels.push(leftRoofPanel);
    glueTabs.push(createGlueTab('roof-left-front', 'roof-left', 1, leftRoofPanel, GLUE_TAB_WIDTH));
    glueTabs.push(createGlueTab('roof-left-back', 'roof-left', 3, leftRoofPanel, GLUE_TAB_WIDTH));

    currentY += roofPanelLength;

    // Right roof panel (connected at ridge)
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
        { type: 'valley', from: 0, to: 1 },  // ridge fold (connected to left panel)
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

    // Gable ends (triangles)
    currentX = roofPanelWidth + GLUE_TAB_WIDTH * 3;
    currentY = panels[0].position.y; // Back to wall row

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
        { type: 'glue-tab', from: 0, to: 1 },  // bottom
        { type: 'glue-tab', from: 1, to: 2 },  // right slope
        { type: 'glue-tab', from: 2, to: 0 },  // left slope
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
    // Hip roof - 4 panels (2 trapezoids for front/back + 2 triangles for sides)
    const ridgeLength = Math.max(0, width - depth);
    const slopeLength = Math.sqrt(Math.pow(depth / 2 + overhang, 2) + Math.pow(roofHeight, 2));
    const sideSlopeLength = Math.sqrt(Math.pow(width / 2 + overhang, 2) + Math.pow(roofHeight, 2));

    // Front/back trapezoids
    const trapezoidTopWidth = ridgeLength + overhang * 2;
    const trapezoidBottomWidth = width + overhang * 2;
    const inset = (trapezoidBottomWidth - trapezoidTopWidth) / 2;

    // Front trapezoid
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

    // Back trapezoid (next to front)
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

    // Side triangles (below trapezoids)
    const triangleY = currentY + slopeLength + GLUE_TAB_WIDTH * 2;
    const triangleWidth = depth + overhang * 2;

    // Left triangle
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

    // Right triangle
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
    // Shed roof - single sloped panel
    const roofPanelLength = Math.sqrt(Math.pow(depth + overhang * 2, 2) + Math.pow(roofHeight, 2));
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

  // Calculate total dimensions
  const totalWidth = Math.max(
    ...panels.map(p => p.position.x + Math.max(...p.vertices.map(v => v.x)))
  ) + GLUE_TAB_WIDTH;

  const totalHeight = Math.max(
    maxHeight,
    ...panels.map(p => p.position.y + Math.max(...p.vertices.map(v => v.y)))
  ) + GLUE_TAB_WIDTH;

  return {
    panels,
    glueTabs,
    width: totalWidth,
    height: totalHeight,
    buildingName: name,
    scale: `${scale.name} (1:${scale.ratio})`,
    realWorldDimensions: {
      width: dimensions.width,
      depth: dimensions.depth,
      height: dimensions.height,
    },
  };
}

/**
 * Create a glue tab for a panel edge
 */
function createGlueTab(
  id: string,
  parentPanel: string,
  edgeIndex: number,
  panel: Panel,
  tabWidth: number
): GlueTab {
  const v1 = panel.vertices[edgeIndex];
  const v2 = panel.vertices[(edgeIndex + 1) % panel.vertices.length];

  // Calculate perpendicular direction for tab
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len * tabWidth;
  const ny = dx / len * tabWidth;

  // Tab vertices (trapezoid shape)
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

/**
 * Convert pattern to SVG string
 */
export function patternToSVG(pattern: UnfoldedPattern, dpi: number = 300): string {
  // Convert inches to pixels
  const pxPerInch = dpi;
  const width = pattern.width * pxPerInch;
  const height = pattern.height * pxPerInch;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${pattern.width} ${pattern.height}">
  <style>
    .cut { stroke: #000000; stroke-width: 0.02; fill: none; }
    .mountain { stroke: #ff0000; stroke-width: 0.015; stroke-dasharray: 0.1 0.05; fill: none; }
    .valley { stroke: #0000ff; stroke-width: 0.015; stroke-dasharray: 0.05 0.05; fill: none; }
    .glue-tab { stroke: #888888; stroke-width: 0.01; fill: #f0f0f0; }
    .panel { fill: #ffffff; stroke: none; }
    .opening { fill: #e8e8e8; stroke: #000000; stroke-width: 0.02; }
    .opening-door { fill: #d4c4a8; stroke: #000000; stroke-width: 0.02; }
    .opening-window { fill: #b8d4e8; stroke: #000000; stroke-width: 0.02; }
    .opening-label { font-family: Arial, sans-serif; font-size: 0.1px; fill: #666666; text-anchor: middle; }
    .label { font-family: Arial, sans-serif; font-size: 0.15px; fill: #333333; }
    .title { font-family: Arial, sans-serif; font-size: 0.2px; fill: #000000; font-weight: bold; }
  </style>

  <!-- Title -->
  <text x="0.1" y="0.3" class="title">${pattern.buildingName} - ${pattern.scale}</text>
  <text x="0.1" y="0.5" class="label">${pattern.realWorldDimensions.width}'W × ${pattern.realWorldDimensions.depth}'D × ${pattern.realWorldDimensions.height}'H</text>

`;

  // Draw glue tabs first (behind panels)
  for (const tab of pattern.glueTabs) {
    const points = tab.vertices
      .map(v => `${(v.x + tab.position.x).toFixed(4)},${(v.y + tab.position.y).toFixed(4)}`)
      .join(' ');
    svg += `  <polygon points="${points}" class="glue-tab" />\n`;
  }

  // Draw panels
  for (const panel of pattern.panels) {
    const points = panel.vertices
      .map(v => `${(v.x + panel.position.x).toFixed(4)},${(v.y + panel.position.y).toFixed(4)}`)
      .join(' ');
    svg += `  <polygon points="${points}" class="panel" />\n`;

    // Draw edges with appropriate styles
    for (const edge of panel.edges) {
      const v1 = panel.vertices[edge.from];
      const v2 = panel.vertices[edge.to];
      const x1 = v1.x + panel.position.x;
      const y1 = v1.y + panel.position.y;
      const x2 = v2.x + panel.position.x;
      const y2 = v2.y + panel.position.y;

      if (edge.type !== 'glue-tab') {
        svg += `  <line x1="${x1.toFixed(4)}" y1="${y1.toFixed(4)}" x2="${x2.toFixed(4)}" y2="${y2.toFixed(4)}" class="${edge.type}" />\n`;
      }
    }

    // Draw openings (cutouts) for this panel
    if (panel.openings && panel.openings.length > 0) {
      for (const opening of panel.openings) {
        // Opening position is relative to panel, with y=0 at bottom
        // SVG coordinates have y=0 at top, so we need to flip
        const panelHeight = Math.max(...panel.vertices.map(v => v.y));
        const openingX = panel.position.x + opening.x;
        const openingY = panel.position.y + (panelHeight - opening.y - opening.height);

        const openingClass = opening.type === 'door' ? 'opening-door' : 'opening-window';
        svg += `  <rect x="${openingX.toFixed(4)}" y="${openingY.toFixed(4)}" width="${opening.width.toFixed(4)}" height="${opening.height.toFixed(4)}" class="${openingClass}" />\n`;

        // Add opening label
        const labelX = openingX + opening.width / 2;
        const labelY = openingY + opening.height / 2;
        const label = opening.label || (opening.type === 'door' ? 'Door' : 'Window');
        svg += `  <text x="${labelX.toFixed(4)}" y="${labelY.toFixed(4)}" class="opening-label">${label}</text>\n`;
      }
    }

    // Add panel label
    const centerX = panel.position.x + panel.vertices.reduce((sum, v) => sum + v.x, 0) / panel.vertices.length;
    const centerY = panel.position.y + panel.vertices.reduce((sum, v) => sum + v.y, 0) / panel.vertices.length;
    svg += `  <text x="${centerX.toFixed(4)}" y="${centerY.toFixed(4)}" class="label" text-anchor="middle">${panel.name}</text>\n`;
  }

  // Add legend
  const legendY = pattern.height - 0.5;
  svg += `
  <!-- Legend -->
  <text x="0.1" y="${legendY}" class="label">Legend:</text>
  <line x1="0.6" y1="${legendY - 0.05}" x2="1.0" y2="${legendY - 0.05}" class="cut" />
  <text x="1.1" y="${legendY}" class="label">Cut</text>
  <line x1="1.6" y1="${legendY - 0.05}" x2="2.0" y2="${legendY - 0.05}" class="mountain" />
  <text x="2.1" y="${legendY}" class="label">Mountain fold</text>
  <line x1="3.0" y1="${legendY - 0.05}" x2="3.4" y2="${legendY - 0.05}" class="valley" />
  <text x="3.5" y="${legendY}" class="label">Valley fold</text>
`;

  svg += '</svg>';

  return svg;
}
