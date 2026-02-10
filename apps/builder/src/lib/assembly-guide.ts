/**
 * TidKit Builder - Assembly Guide Generation
 * Creates a visual assembly map SVG showing where each detail/accessory
 * piece attaches to structural panels.
 */

import type { UnfoldedPattern, Panel } from './unfold';
import { MATERIAL_PROPERTIES } from '@/types/building';

/**
 * Generate an assembly guide SVG that shows structural panels as outlines
 * with numbered attachment zones for detail and accessory pieces.
 */
export function generateAssemblyGuide(pattern: UnfoldedPattern): string {
  const allDetailPanels = [
    ...(pattern.accessoryPanels || []),
    ...(pattern.detailPanels || []),
  ];

  if (allDetailPanels.length === 0) {
    return '';
  }

  // Calculate bounding box of structural panels
  const structuralPanels = pattern.panels;
  const maxX = Math.max(...structuralPanels.map(p =>
    p.position.x + Math.max(...p.vertices.map(v => v.x))
  ));
  const maxY = Math.max(...structuralPanels.map(p =>
    p.position.y + Math.max(...p.vertices.map(v => v.y))
  ));

  const guideWidth = maxX + 4; // Extra space for legend
  const legendHeight = Math.ceil(allDetailPanels.length / 2) * 0.25 + 1;
  const guideHeight = maxY + legendHeight + 2;

  const material = pattern.materialType || 'paper';

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${guideWidth * 96}" height="${guideHeight * 96}"
     viewBox="0 0 ${guideWidth} ${guideHeight}">
  <style>
    .guide-panel { fill: #f8f8f8; stroke: #cccccc; stroke-width: 0.015; }
    .guide-label { font-family: Arial, sans-serif; font-size: 0.12px; fill: #666666; text-anchor: middle; }
    .guide-title { font-family: Arial, sans-serif; font-size: 0.2px; fill: #000000; font-weight: bold; }
    .guide-subtitle { font-family: Arial, sans-serif; font-size: 0.14px; fill: #666666; }
    .piece-number { font-family: Arial, sans-serif; font-size: 0.1px; fill: #ffffff; text-anchor: middle; dominant-baseline: central; }
    .piece-circle-acc { fill: #8B4513; }
    .piece-circle-detail { fill: #2E7D32; }
    .legend-text { font-family: Arial, sans-serif; font-size: 0.1px; fill: #333333; }
    .legend-header { font-family: Arial, sans-serif; font-size: 0.13px; fill: #000000; font-weight: bold; }
  </style>

  <!-- Title -->
  <text x="0.1" y="0.3" class="guide-title">${pattern.buildingName} - Assembly Guide</text>
  <text x="0.1" y="0.5" class="guide-subtitle">${pattern.scale} | ${MATERIAL_PROPERTIES[material].label} | ${allDetailPanels.length} detail/accessory pieces</text>

`;

  // Draw structural panels as light outlines
  for (const panel of structuralPanels) {
    const points = panel.vertices
      .map(v => `${(v.x + panel.position.x).toFixed(4)},${(v.y + panel.position.y).toFixed(4)}`)
      .join(' ');
    svg += `  <polygon points="${points}" class="guide-panel" />\n`;

    // Panel name
    const cx = panel.position.x + panel.vertices.reduce((s, v) => s + v.x, 0) / panel.vertices.length;
    const cy = panel.position.y + panel.vertices.reduce((s, v) => s + v.y, 0) / panel.vertices.length;
    svg += `  <text x="${cx.toFixed(4)}" y="${cy.toFixed(4)}" class="guide-label">${panel.name}</text>\n`;
  }

  // Number all detail/accessory panels and place markers
  const numberedPieces: { num: number; panel: Panel; group: string }[] = [];

  allDetailPanels.forEach((panel, i) => {
    const num = i + 1;
    const group = panel.panelGroup === 'accessory' ? 'acc' : 'detail';
    numberedPieces.push({ num, panel, group });

    // Place a numbered circle at the panel's approximate attachment location
    // For now, place markers distributed along structural panels
    const structPanel = findAttachmentPanel(panel, structuralPanels);
    if (structPanel) {
      const cx = structPanel.position.x + Math.random() * Math.max(...structPanel.vertices.map(v => v.x)) * 0.8 + 0.1;
      const cy = structPanel.position.y + Math.random() * Math.max(...structPanel.vertices.map(v => v.y)) * 0.8 + 0.1;
      const circleClass = group === 'acc' ? 'piece-circle-acc' : 'piece-circle-detail';
      svg += `  <circle cx="${cx.toFixed(4)}" cy="${cy.toFixed(4)}" r="0.08" class="${circleClass}" />\n`;
      svg += `  <text x="${cx.toFixed(4)}" y="${cy.toFixed(4)}" class="piece-number">${num}</text>\n`;
    }
  });

  // Draw legend
  const legendStartY = maxY + 1;
  svg += `\n  <!-- Legend -->\n`;
  svg += `  <text x="0.1" y="${legendStartY.toFixed(4)}" class="legend-header">Pieces List</text>\n`;

  // Two-column legend
  const colWidth = guideWidth / 2;
  numberedPieces.forEach(({ num, panel, group }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.1 + col * colWidth;
    const y = legendStartY + 0.3 + row * 0.2;
    const circleClass = group === 'acc' ? 'piece-circle-acc' : 'piece-circle-detail';

    svg += `  <circle cx="${(x + 0.06).toFixed(4)}" cy="${(y - 0.03).toFixed(4)}" r="0.06" class="${circleClass}" />\n`;
    svg += `  <text x="${(x + 0.06).toFixed(4)}" y="${(y - 0.03).toFixed(4)}" class="piece-number">${num}</text>\n`;
    svg += `  <text x="${(x + 0.16).toFixed(4)}" y="${y.toFixed(4)}" class="legend-text">${panel.name}</text>\n`;
  });

  svg += '\n</svg>';

  return svg;
}

/**
 * Try to find which structural panel a detail/accessory piece should attach to,
 * based on the piece's name containing the wall name.
 */
function findAttachmentPanel(piece: Panel, structuralPanels: Panel[]): Panel | null {
  const name = piece.name.toLowerCase();

  // Try to match by wall name in the piece name
  for (const panel of structuralPanels) {
    const panelName = panel.name.toLowerCase();
    if (
      (name.includes('front') && panelName.includes('front')) ||
      (name.includes('back') && panelName.includes('back')) ||
      (name.includes('left') && panelName.includes('left')) ||
      (name.includes('right') && panelName.includes('right')) ||
      (name.includes('roof') && panelName.includes('roof'))
    ) {
      return panel;
    }
  }

  // Default to first panel
  return structuralPanels[0] || null;
}
