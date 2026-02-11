/**
 * TidKit Builder - Building Unfolding Algorithm
 * Converts 3D building geometry into flat 2D patterns.
 * Dispatches to material-specific strategies for pattern generation.
 */

import { BuildingParams, MaterialType, MATERIAL_PROPERTIES, DEFAULT_MATERIAL } from '@/types/building';
import { getUnfoldStrategy } from './unfold-strategies';

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

// 2D sticker graphic embedded in a panel
export interface PanelSticker {
  id: string;
  /** Position relative to panel bottom-left, in model inches */
  x: number;
  y: number;
  /** Dimensions in model inches */
  width: number;
  height: number;
  /** Inline SVG element string (no outer wrapper) */
  svgContent: string;
}

export interface Panel {
  id: string;
  name: string;
  vertices: Point2D[];
  // Edge types for cutting/folding
  edges: {
    type: 'cut' | 'mountain' | 'valley' | 'glue-tab' | 'score';
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
  // Panel grouping for multi-layer output
  panelGroup?: 'structural' | 'facade' | 'accessory' | 'detail';
  // Link back to source accessory (for accessory panels)
  parentAccessoryId?: string;
  // 2D sticker graphics printed on this panel
  stickers?: PanelSticker[];
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
  // Material info
  materialType: MaterialType;
  // Assembly instructions (material-specific)
  assemblySteps: string[];
  // Facade panels (for non-paper materials with separate texture sheets)
  facadePanels?: Panel[];
  // Accessory panels (flat pattern pieces for accessories)
  accessoryPanels?: Panel[];
  // Detail panels (trim, wall details, roof trim)
  detailPanels?: Panel[];
}

/**
 * Convert building parameters to unfolded 2D pattern.
 * Dispatches to the appropriate strategy based on material type.
 */
export function unfoldBuilding(
  params: BuildingParams,
  name: string = 'Building',
  accessories?: import('@/types/building').Accessory[]
): UnfoldedPattern {
  const strategy = getUnfoldStrategy(params.material);
  return strategy.unfold(params, name, accessories);
}

/** Map of panel names to baked texture data URLs (from procedural texture baking) */
export type BakedTextureMap = Map<string, string>;

/**
 * Convert pattern to SVG string.
 * @param bakedTextures Optional map of panel name prefix → baked PNG data URL
 */
export function patternToSVG(pattern: UnfoldedPattern, dpi: number = 300, bakedTextures?: BakedTextureMap): string {
  const pxPerInch = dpi;
  const width = pattern.width * pxPerInch;
  const height = pattern.height * pxPerInch;

  const material = pattern.materialType || 'paper';
  const hasFacades = pattern.facadePanels && pattern.facadePanels.length > 0;
  const hasAccessories = pattern.accessoryPanels && pattern.accessoryPanels.length > 0;
  const hasDetails = pattern.detailPanels && pattern.detailPanels.length > 0;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${pattern.width} ${pattern.height}">
  <style>
    .cut { stroke: #000000; stroke-width: 0.02; fill: none; }
    .mountain { stroke: #ff0000; stroke-width: 0.015; stroke-dasharray: 0.1 0.05; fill: none; }
    .valley { stroke: #0000ff; stroke-width: 0.015; stroke-dasharray: 0.05 0.05; fill: none; }
    .score { stroke: #ff8800; stroke-width: 0.015; stroke-dasharray: 0.02 0.04; fill: none; }
    .glue-tab { stroke: #888888; stroke-width: 0.01; fill: #f0f0f0; }
    .panel { fill: #ffffff; stroke: none; }
    .facade-panel { fill: #fffff0; stroke: none; }
    .accessory-panel { fill: #fff8f0; stroke: none; }
    .detail-panel { fill: #f0fff0; stroke: none; }
    .opening { fill: #e8e8e8; stroke: #000000; stroke-width: 0.02; }
    .opening-door { fill: #d4c4a8; stroke: #000000; stroke-width: 0.02; }
    .opening-window { fill: #b8d4e8; stroke: #000000; stroke-width: 0.02; }
    .opening-label { font-family: Arial, sans-serif; font-size: 0.1px; fill: #666666; text-anchor: middle; }
    .label { font-family: Arial, sans-serif; font-size: 0.15px; fill: #333333; }
    .title { font-family: Arial, sans-serif; font-size: 0.2px; fill: #000000; font-weight: bold; }
    .section-title { font-family: Arial, sans-serif; font-size: 0.18px; fill: #666666; font-weight: bold; }
  </style>

  <!-- Title -->
  <text x="0.1" y="0.3" class="title">${pattern.buildingName} - ${pattern.scale}</text>
  <text x="0.1" y="0.5" class="label">${pattern.realWorldDimensions.width}'W × ${pattern.realWorldDimensions.depth}'D × ${pattern.realWorldDimensions.height}'H | Material: ${MATERIAL_PROPERTIES[material].label}</text>

`;

  // Draw glue tabs first (behind panels)
  for (const tab of pattern.glueTabs) {
    const points = tab.vertices
      .map(v => `${(v.x + tab.position.x).toFixed(4)},${(v.y + tab.position.y).toFixed(4)}`)
      .join(' ');
    svg += `  <polygon points="${points}" class="glue-tab" />\n`;
  }

  // Draw structural panels
  svg += renderPanels(pattern.panels, 'panel', bakedTextures);

  // Draw facade panels if present
  if (hasFacades) {
    const facadeMinY = Math.min(...pattern.facadePanels!.map(p => p.position.y));
    svg += `  <text x="0.5" y="${(facadeMinY - 0.2).toFixed(4)}" class="section-title">Facade Sheets (print on paper, glue onto structural panels)</text>\n`;
    svg += renderPanels(pattern.facadePanels!, 'facade-panel', bakedTextures);
  }

  // Draw accessory panels if present
  if (hasAccessories) {
    const accessoryMinY = Math.min(...pattern.accessoryPanels!.map(p => p.position.y));
    svg += `  <text x="0.5" y="${(accessoryMinY - 0.2).toFixed(4)}" class="section-title">Accessory Pieces (cut and assemble separately)</text>\n`;
    svg += renderPanels(pattern.accessoryPanels!, 'accessory-panel');
  }

  // Draw detail panels if present
  if (hasDetails) {
    const detailMinY = Math.min(...pattern.detailPanels!.map(p => p.position.y));
    svg += `  <text x="0.5" y="${(detailMinY - 0.2).toFixed(4)}" class="section-title">Detail &amp; Trim Pieces (glue onto structural panels)</text>\n`;
    svg += renderPanels(pattern.detailPanels!, 'detail-panel');
  }

  // Add legend
  const legendY = pattern.height - 0.5;
  svg += `
  <!-- Legend -->
  <text x="0.1" y="${legendY}" class="label">Legend:</text>
  <line x1="0.6" y1="${legendY - 0.05}" x2="1.0" y2="${legendY - 0.05}" class="cut" />
  <text x="1.1" y="${legendY}" class="label">Cut</text>`;

  if (material === 'paper') {
    svg += `
  <line x1="1.6" y1="${legendY - 0.05}" x2="2.0" y2="${legendY - 0.05}" class="mountain" />
  <text x="2.1" y="${legendY}" class="label">Mountain fold</text>
  <line x1="3.0" y1="${legendY - 0.05}" x2="3.4" y2="${legendY - 0.05}" class="valley" />
  <text x="3.5" y="${legendY}" class="label">Valley fold</text>`;
  } else if (material === 'chipboard') {
    svg += `
  <line x1="1.6" y1="${legendY - 0.05}" x2="2.0" y2="${legendY - 0.05}" class="score" />
  <text x="2.1" y="${legendY}" class="label">Score line</text>`;
  }

  svg += '\n</svg>';

  return svg;
}

/**
 * Render a set of panels to SVG content
 */
function renderPanels(panels: Panel[], panelClass: string, bakedTextures?: BakedTextureMap): string {
  let svg = '';

  for (const panel of panels) {
    const points = panel.vertices
      .map(v => `${(v.x + panel.position.x).toFixed(4)},${(v.y + panel.position.y).toFixed(4)}`)
      .join(' ');
    svg += `  <polygon points="${points}" class="${panelClass}" />\n`;

    // Embed baked procedural texture if available for this panel
    if (bakedTextures) {
      // Match panel to baked texture by surface name prefix
      // Panel names like "Front Wall", "Back Wall", "Left Wall", "Right Wall", "Roof"
      const surfaceKey = panelNameToSurface(panel.name);
      const bakedDataUrl = surfaceKey ? bakedTextures.get(surfaceKey) : undefined;
      if (bakedDataUrl) {
        const minX = Math.min(...panel.vertices.map(v => v.x));
        const minY = Math.min(...panel.vertices.map(v => v.y));
        const maxX = Math.max(...panel.vertices.map(v => v.x));
        const maxY = Math.max(...panel.vertices.map(v => v.y));
        const w = maxX - minX;
        const h = maxY - minY;
        // Clip to panel polygon
        const clipId = `clip-${panel.id}`;
        svg += `  <defs><clipPath id="${clipId}"><polygon points="${points}" /></clipPath></defs>\n`;
        svg += `  <image href="${bakedDataUrl}" x="${(minX + panel.position.x).toFixed(4)}" y="${(minY + panel.position.y).toFixed(4)}" width="${w.toFixed(4)}" height="${h.toFixed(4)}" clip-path="url(#${clipId})" preserveAspectRatio="none" />\n`;
      }
    }

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

    // Draw openings (cutouts)
    if (panel.openings && panel.openings.length > 0) {
      for (const opening of panel.openings) {
        const panelHeight = Math.max(...panel.vertices.map(v => v.y));
        const openingX = panel.position.x + opening.x;
        const openingY = panel.position.y + (panelHeight - opening.y - opening.height);

        const openingClass = opening.type === 'door' ? 'opening-door' : 'opening-window';
        svg += `  <rect x="${openingX.toFixed(4)}" y="${openingY.toFixed(4)}" width="${opening.width.toFixed(4)}" height="${opening.height.toFixed(4)}" class="${openingClass}" />\n`;

        const labelX = openingX + opening.width / 2;
        const labelY = openingY + opening.height / 2;
        const label = opening.label || (opening.type === 'door' ? 'Door' : 'Window');
        svg += `  <text x="${labelX.toFixed(4)}" y="${labelY.toFixed(4)}" class="opening-label">${label}</text>\n`;
      }
    }

    // Draw 2D stickers (printed graphic elements on this panel)
    if (panel.stickers && panel.stickers.length > 0) {
      const panelHeight = Math.max(...panel.vertices.map(v => v.y));
      for (const sticker of panel.stickers) {
        // Y-flip: sticker.y is from panel bottom, SVG y is from top
        const sx = panel.position.x + sticker.x;
        const sy = panel.position.y + (panelHeight - sticker.y - sticker.height);
        svg += `  <g transform="translate(${sx.toFixed(4)}, ${sy.toFixed(4)})">\n`;
        svg += `    ${sticker.svgContent}\n`;
        svg += `  </g>\n`;
      }
    }

    // Panel label
    const centerX = panel.position.x + panel.vertices.reduce((sum, v) => sum + v.x, 0) / panel.vertices.length;
    const centerY = panel.position.y + panel.vertices.reduce((sum, v) => sum + v.y, 0) / panel.vertices.length;
    svg += `  <text x="${centerX.toFixed(4)}" y="${centerY.toFixed(4)}" class="label" text-anchor="middle">${panel.name}</text>\n`;
  }

  return svg;
}

/** Map panel display names to store surface keys for baked texture lookup */
function panelNameToSurface(panelName: string): string | undefined {
  const lower = panelName.toLowerCase();
  if (lower.includes('front')) return 'frontWall';
  if (lower.includes('back') || lower.includes('rear')) return 'backWall';
  if (lower.includes('left') || lower.includes('right') || lower.includes('side')) return 'sideWalls';
  if (lower.includes('roof')) return 'roof';
  if (lower.includes('foundation') || lower.includes('floor') || lower.includes('base')) return 'foundation';
  return undefined;
}
