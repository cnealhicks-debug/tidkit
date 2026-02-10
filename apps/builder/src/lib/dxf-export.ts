/**
 * TidKit Builder - DXF Export
 * Generates DXF (AutoCAD Drawing Exchange Format) files from unfolded patterns.
 * Targeted at laser cutter and CNC users working with plywood/MDF/acrylic.
 *
 * Produces a minimal R12 DXF that is universally compatible with:
 * - LightBurn, LaserGRBL (laser cutters)
 * - Easel, Carbide Create (CNC routers)
 * - AutoCAD, LibreCAD, Inkscape (general CAD)
 */

import type { UnfoldedPattern, Panel } from './unfold';

// DXF layer names for edge types
const LAYERS = {
  cut: 'CUT',
  score: 'SCORE',
  mountain: 'FOLD_MOUNTAIN',
  valley: 'FOLD_VALLEY',
  opening: 'OPENINGS',
  label: 'LABELS',
  facade: 'FACADE_CUT',
} as const;

// DXF color indices (AutoCAD Color Index)
const COLORS = {
  cut: 7,       // White (shows as black on white background)
  score: 30,    // Orange
  mountain: 1,  // Red
  valley: 5,    // Blue
  opening: 3,   // Green
  label: 8,     // Gray
  facade: 4,    // Cyan
} as const;

/**
 * Generate a DXF string from an unfolded pattern.
 * All dimensions are in inches (matching the pattern's model units).
 */
export function patternToDXF(pattern: UnfoldedPattern): string {
  const sections: string[] = [];

  // HEADER section
  sections.push(dxfHeader(pattern));

  // TABLES section (layers, linetypes)
  sections.push(dxfTables());

  // ENTITIES section (the actual geometry)
  sections.push(dxfEntities(pattern));

  // EOF
  sections.push('  0\nEOF\n');

  return sections.join('');
}

function dxfHeader(pattern: UnfoldedPattern): string {
  return `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1009
  9
$INSUNITS
 70
1
  9
$EXTMIN
 10
0.0
 20
0.0
  9
$EXTMAX
 10
${pattern.width.toFixed(6)}
 20
${pattern.height.toFixed(6)}
  0
ENDSEC
`;
}

function dxfTables(): string {
  let out = `  0
SECTION
  2
TABLES
  0
TABLE
  2
LTYPE
 70
3
`;

  // CONTINUOUS linetype
  out += ltype('CONTINUOUS', '', 0, []);
  // DASHED linetype for fold lines
  out += ltype('DASHED', '__ __ __', 0.5, [0.25, -0.25]);
  // DOTTED linetype for score lines
  out += ltype('DOTTED', '. . . .', 0.2, [0.05, -0.15]);

  out += `  0
ENDTAB
  0
TABLE
  2
LAYER
 70
${Object.keys(LAYERS).length}
`;

  // Define layers
  out += layer(LAYERS.cut, COLORS.cut, 'CONTINUOUS');
  out += layer(LAYERS.score, COLORS.score, 'DOTTED');
  out += layer(LAYERS.mountain, COLORS.mountain, 'DASHED');
  out += layer(LAYERS.valley, COLORS.valley, 'DASHED');
  out += layer(LAYERS.opening, COLORS.opening, 'CONTINUOUS');
  out += layer(LAYERS.label, COLORS.label, 'CONTINUOUS');
  out += layer(LAYERS.facade, COLORS.facade, 'CONTINUOUS');

  out += `  0
ENDTAB
  0
ENDSEC
`;

  return out;
}

function dxfEntities(pattern: UnfoldedPattern): string {
  let out = `  0
SECTION
  2
ENTITIES
`;

  // Draw structural panels
  for (const panel of pattern.panels) {
    out += panelToEntities(panel, false);
  }

  // Draw facade panels
  if (pattern.facadePanels) {
    for (const panel of pattern.facadePanels) {
      out += panelToEntities(panel, true);
    }
  }

  // Draw glue tab outlines (on CUT layer)
  for (const tab of pattern.glueTabs) {
    for (let i = 0; i < tab.vertices.length; i++) {
      const v1 = tab.vertices[i];
      const v2 = tab.vertices[(i + 1) % tab.vertices.length];
      out += line(
        v1.x + tab.position.x,
        v1.y + tab.position.y,
        v2.x + tab.position.x,
        v2.y + tab.position.y,
        LAYERS.cut
      );
    }
  }

  out += `  0
ENDSEC
`;

  return out;
}

function panelToEntities(panel: Panel, isFacade: boolean): string {
  let out = '';

  // Draw edges
  for (const edge of panel.edges) {
    const v1 = panel.vertices[edge.from];
    const v2 = panel.vertices[edge.to];
    const x1 = v1.x + panel.position.x;
    const y1 = v1.y + panel.position.y;
    const x2 = v2.x + panel.position.x;
    const y2 = v2.y + panel.position.y;

    let layerName: string;
    if (isFacade) {
      layerName = LAYERS.facade;
    } else {
      switch (edge.type) {
        case 'cut': layerName = LAYERS.cut; break;
        case 'mountain': layerName = LAYERS.mountain; break;
        case 'valley': layerName = LAYERS.valley; break;
        case 'score': layerName = LAYERS.score; break;
        case 'glue-tab': layerName = LAYERS.cut; break;
        default: layerName = LAYERS.cut;
      }
    }

    out += line(x1, y1, x2, y2, layerName);
  }

  // Draw openings as rectangles
  if (panel.openings) {
    for (const opening of panel.openings) {
      const panelHeight = Math.max(...panel.vertices.map(v => v.y));
      const ox = panel.position.x + opening.x;
      // DXF y-axis is same as pattern (y=0 at bottom for openings,
      // but our panels have y=0 at top in SVG). Convert consistently.
      const oy = panel.position.y + (panelHeight - opening.y - opening.height);
      const ow = opening.width;
      const oh = opening.height;

      out += line(ox, oy, ox + ow, oy, LAYERS.opening);
      out += line(ox + ow, oy, ox + ow, oy + oh, LAYERS.opening);
      out += line(ox + ow, oy + oh, ox, oy + oh, LAYERS.opening);
      out += line(ox, oy + oh, ox, oy, LAYERS.opening);
    }
  }

  // Panel label as TEXT entity
  const cx = panel.position.x + panel.vertices.reduce((s, v) => s + v.x, 0) / panel.vertices.length;
  const cy = panel.position.y + panel.vertices.reduce((s, v) => s + v.y, 0) / panel.vertices.length;
  out += text(cx, cy, panel.name, 0.1, LAYERS.label);

  return out;
}

// =============================================================================
// DXF entity helpers
// =============================================================================

function line(x1: number, y1: number, x2: number, y2: number, layerName: string): string {
  return `  0
LINE
  8
${layerName}
 10
${x1.toFixed(6)}
 20
${y1.toFixed(6)}
 11
${x2.toFixed(6)}
 21
${y2.toFixed(6)}
`;
}

function text(x: number, y: number, content: string, height: number, layerName: string): string {
  return `  0
TEXT
  8
${layerName}
 10
${x.toFixed(6)}
 20
${y.toFixed(6)}
 40
${height.toFixed(6)}
  1
${content}
 72
1
 11
${x.toFixed(6)}
 21
${y.toFixed(6)}
`;
}

function ltype(name: string, description: string, totalLength: number, pattern: number[]): string {
  let out = `  0
LTYPE
  2
${name}
 70
0
  3
${description}
 72
65
 73
${pattern.length}
 40
${totalLength.toFixed(6)}
`;
  for (const p of pattern) {
    out += ` 49
${p.toFixed(6)}
`;
  }
  return out;
}

function layer(name: string, color: number, linetype: string): string {
  return `  0
LAYER
  2
${name}
 70
0
 62
${color}
  6
${linetype}
`;
}
