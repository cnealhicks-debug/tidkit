'use client';

/**
 * TidKit Builder - Export Panel
 * Enhanced export options with batch export and tiled PDF patterns
 */

import { useState, useMemo } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import { unfoldBuilding, patternToSVG, UnfoldedPattern } from '@/lib/unfold';
import { patternToDXF } from '@/lib/dxf-export';
import { MATERIAL_PROPERTIES, DEFAULT_MATERIAL } from '@/types/building';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  buildingName: string;
}

// Paper sizes in inches
const PAPER_SIZES = {
  letter: { width: 8.5, height: 11, label: 'Letter (8.5" × 11")' },
  legal: { width: 8.5, height: 14, label: 'Legal (8.5" × 14")' },
  tabloid: { width: 11, height: 17, label: 'Tabloid (11" × 17")' },
  a4: { width: 8.27, height: 11.69, label: 'A4 (210 × 297mm)' },
  a3: { width: 11.69, height: 16.54, label: 'A3 (297 × 420mm)' },
};

type PaperSize = keyof typeof PAPER_SIZES;

// Export format options
type ExportFormat = 'svg' | 'pdf' | 'png' | 'dxf';

// Control panel width in pixels (w-80 = 20rem = 320px)
const CONTROL_PANEL_WIDTH = 320;
const PANEL_GAP = 8;

export function ExportPanel({ isOpen, onClose, buildingName }: ExportPanelProps) {
  const { params } = useBuildingStore();

  const [exportFormat, setExportFormat] = useState<ExportFormat>('svg');
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  const [margins, setMargins] = useState(0.5); // inches
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [includeGrid, setIncludeGrid] = useState(false);
  const [tiledExport, setTiledExport] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [isExporting, setIsExporting] = useState(false);

  // Generate pattern
  const pattern = useMemo(() => {
    return unfoldBuilding(params, buildingName);
  }, [params, buildingName]);

  // Calculate if tiling is needed
  const paper = PAPER_SIZES[paperSize];
  const printableWidth = paper.width - margins * 2;
  const printableHeight = paper.height - margins * 2;
  const needsTiling = pattern.width > printableWidth || pattern.height > printableHeight;

  // Calculate number of tiles needed
  const tilesX = Math.ceil(pattern.width / printableWidth);
  const tilesY = Math.ceil(pattern.height / printableHeight);
  const totalTiles = tilesX * tilesY;

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (exportFormat === 'svg') {
        downloadSVG(pattern, dpi);
      } else if (exportFormat === 'pdf') {
        if (tiledExport && needsTiling) {
          downloadTiledPDF(pattern, paperSize, margins, dpi, includeInstructions);
        } else {
          downloadPDF(pattern, paperSize, margins, dpi, includeInstructions);
        }
      } else if (exportFormat === 'png') {
        await downloadPNG(pattern, dpi);
      } else if (exportFormat === 'dxf') {
        downloadDXF(pattern);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Handle batch export (all formats at once)
  const handleBatchExport = async () => {
    setIsExporting(true);

    try {
      // Export SVG
      downloadSVG(pattern, dpi);

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));

      // Export PDF
      if (needsTiling && tiledExport) {
        downloadTiledPDF(pattern, paperSize, margins, dpi, includeInstructions);
      } else {
        downloadPDF(pattern, paperSize, margins, dpi, includeInstructions);
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Export PNG
      await downloadPNG(pattern, dpi);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden max-h-[calc(100vh-8rem)]"
      style={{ right: CONTROL_PANEL_WIDTH + PANEL_GAP }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-900 dark:text-white">Export Pattern</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-14rem)]">
        {/* Pattern Info */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Pattern Size
          </label>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              {pattern.width.toFixed(2)}" × {pattern.height.toFixed(2)}"
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {pattern.panels.length} panels
              {pattern.glueTabs.length > 0 && ` • ${pattern.glueTabs.length} glue tabs`}
              {pattern.facadePanels && pattern.facadePanels.length > 0 && ` • ${pattern.facadePanels.length} facade sheets`}
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
              {MATERIAL_PROPERTIES[pattern.materialType || 'paper'].icon}{' '}
              {MATERIAL_PROPERTIES[pattern.materialType || 'paper'].label}
            </p>
          </div>
        </div>

        {/* Export Format */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['svg', 'pdf', 'png', 'dxf'] as ExportFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors uppercase ${
                  exportFormat === format
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* Paper Size (for PDF) */}
        {exportFormat === 'pdf' && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Paper Size
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Object.entries(PAPER_SIZES).map(([key, size]) => (
                <option key={key} value={key}>{size.label}</option>
              ))}
            </select>

            {/* Margins */}
            <div className="mt-3">
              <label className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Margins</span>
                <span>{margins}"</span>
              </label>
              <input
                type="range"
                min="0.25"
                max="1"
                step="0.25"
                value={margins}
                onChange={(e) => setMargins(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Tiling notification */}
            {needsTiling && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Pattern is larger than printable area ({printableWidth.toFixed(1)}" × {printableHeight.toFixed(1)}").
                  {tiledExport
                    ? ` Will export ${totalTiles} tiles (${tilesX} × ${tilesY}).`
                    : ' Enable tiled export for multi-page printing.'}
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tiledExport}
                    onChange={(e) => setTiledExport(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs text-amber-700 dark:text-amber-300">Enable tiled export</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* DXF Info */}
        {exportFormat === 'dxf' && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3">
              <p className="text-xs text-purple-800 dark:text-purple-300 font-medium mb-1">
                DXF Export (Laser / CNC)
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Generates an AutoCAD R12 DXF file with separate layers for cut lines, fold/score lines, and openings.
                Compatible with LightBurn, LaserGRBL, Easel, and all major CAD software. Dimensions in inches.
              </p>
            </div>
          </div>
        )}

        {/* Quality Settings */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Quality (DPI)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[150, 300, 600].map((d) => (
              <button
                key={d}
                onClick={() => setDpi(d)}
                className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                  dpi === d
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {dpi >= 300 ? 'Recommended for printing' : 'Lower quality, smaller file'}
          </p>
        </div>

        {/* Options */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInstructions}
                onChange={(e) => setIncludeInstructions(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include assembly instructions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGrid}
                onChange={(e) => setIncludeGrid(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include alignment grid</span>
            </label>
          </div>
        </div>

        {/* Export Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export as {exportFormat.toUpperCase()}
              </>
            )}
          </button>

          <button
            onClick={handleBatchExport}
            disabled={isExporting}
            className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batch Export (SVG + PDF + PNG)
          </button>
        </div>

        {/* Tip (dynamic based on material) */}
        <div className="p-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> {MATERIAL_PROPERTIES[pattern.materialType || 'paper'].exportTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Download pattern as DXF file (for laser cutters / CNC)
 */
function downloadDXF(pattern: UnfoldedPattern) {
  const dxfContent = patternToDXF(pattern);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${pattern.buildingName.toLowerCase().replace(/\s+/g, '-')}-pattern.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download pattern as SVG file
 */
function downloadSVG(pattern: UnfoldedPattern, dpi: number) {
  const svgContent = patternToSVG(pattern, dpi);
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${pattern.buildingName.toLowerCase().replace(/\s+/g, '-')}-pattern.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download pattern as PNG using canvas
 */
async function downloadPNG(pattern: UnfoldedPattern, dpi: number): Promise<void> {
  const svgContent = patternToSVG(pattern, dpi);

  // Create an image from SVG
  const img = new Image();
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = pattern.width * dpi;
      canvas.height = pattern.height * dpi;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw SVG
      ctx.drawImage(img, 0, 0);

      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${pattern.buildingName.toLowerCase().replace(/\s+/g, '-')}-pattern.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
        }
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };

    img.src = url;
  });
}

/**
 * Download pattern as PDF (using browser print)
 */
function downloadPDF(
  pattern: UnfoldedPattern,
  paperSize: PaperSize,
  margins: number,
  dpi: number,
  includeInstructions: boolean
) {
  const svgContent = patternToSVG(pattern, dpi);
  const paper = PAPER_SIZES[paperSize];
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pattern.buildingName} - Pattern</title>
        <style>
          @page {
            size: ${paper.width}in ${paper.height}in;
            margin: ${margins}in;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .pattern-container {
            max-width: 100%;
            overflow: visible;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
          .print-info {
            font-size: 10pt;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 8px;
          }
          .instructions {
            margin-top: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
            font-size: 9pt;
            page-break-inside: avoid;
          }
          .instructions h3 {
            margin: 0 0 10px 0;
            font-size: 11pt;
          }
          .instructions ol {
            margin: 0;
            padding-left: 20px;
          }
          .instructions li {
            margin-bottom: 5px;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-info">
          <strong>TidKit Builder</strong> - ${pattern.buildingName}<br>
          Scale: ${pattern.scale} | Print at 100% (no scaling)
        </div>

        <div class="pattern-container">
          ${svgContent}
        </div>

        ${includeInstructions ? `
        <div class="instructions">
          <h3>Assembly Instructions (${MATERIAL_PROPERTIES[pattern.materialType || 'paper'].label})</h3>
          <ol>
            ${(pattern.assemblySteps || MATERIAL_PROPERTIES[pattern.materialType || 'paper'].assemblySteps).map(step => `<li>${step}</li>`).join('\n            ')}
          </ol>
        </div>
        ` : ''}

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

/**
 * Download pattern as tiled PDF for large prints
 */
function downloadTiledPDF(
  pattern: UnfoldedPattern,
  paperSize: PaperSize,
  margins: number,
  dpi: number,
  includeInstructions: boolean
) {
  const paper = PAPER_SIZES[paperSize];
  const printableWidth = paper.width - margins * 2;
  const printableHeight = paper.height - margins * 2;

  const tilesX = Math.ceil(pattern.width / printableWidth);
  const tilesY = Math.ceil(pattern.height / printableHeight);

  // Create tile pages
  const pages: string[] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tileX = tx * printableWidth;
      const tileY = ty * printableHeight;
      const tileNum = ty * tilesX + tx + 1;

      // Create SVG for this tile with a clip path
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${printableWidth}in" height="${printableHeight}in"
     viewBox="${tileX} ${tileY} ${printableWidth} ${printableHeight}">
  <defs>
    <clipPath id="tile-clip">
      <rect x="${tileX}" y="${tileY}" width="${printableWidth}" height="${printableHeight}"/>
    </clipPath>
  </defs>

  <style>
    .cut { stroke: #000000; stroke-width: 0.02; fill: none; }
    .mountain { stroke: #ff0000; stroke-width: 0.015; stroke-dasharray: 0.1 0.05; fill: none; }
    .valley { stroke: #0000ff; stroke-width: 0.015; stroke-dasharray: 0.05 0.05; fill: none; }
    .score { stroke: #ff8800; stroke-width: 0.015; stroke-dasharray: 0.02 0.04; fill: none; }
    .glue-tab { stroke: #888888; stroke-width: 0.01; fill: #f0f0f0; }
    .panel { fill: #ffffff; stroke: none; }
    .facade-panel { fill: #fffff0; stroke: none; }
    .opening-door { fill: #d4c4a8; stroke: #000000; stroke-width: 0.02; }
    .opening-window { fill: #b8d4e8; stroke: #000000; stroke-width: 0.02; }
    .label { font-family: Arial, sans-serif; font-size: 0.15px; fill: #333333; }
    .tile-marker { fill: none; stroke: #cccccc; stroke-width: 0.01; stroke-dasharray: 0.05 0.05; }
    .tile-label { font-family: Arial, sans-serif; font-size: 0.12px; fill: #999999; }
  </style>

  <g clip-path="url(#tile-clip)">
    ${generatePatternContent(pattern)}
  </g>

  <!-- Tile alignment marks -->
  ${tx > 0 ? `<line x1="${tileX + 0.1}" y1="${tileY}" x2="${tileX + 0.1}" y2="${tileY + 0.3}" class="tile-marker"/>` : ''}
  ${ty > 0 ? `<line x1="${tileX}" y1="${tileY + 0.1}" x2="${tileX + 0.3}" y2="${tileY + 0.1}" class="tile-marker"/>` : ''}
  ${tx < tilesX - 1 ? `<line x1="${tileX + printableWidth - 0.1}" y1="${tileY}" x2="${tileX + printableWidth - 0.1}" y2="${tileY + 0.3}" class="tile-marker"/>` : ''}
  ${ty < tilesY - 1 ? `<line x1="${tileX}" y1="${tileY + printableHeight - 0.1}" x2="${tileX + 0.3}" y2="${tileY + printableHeight - 0.1}" class="tile-marker"/>` : ''}

  <!-- Tile label -->
  <text x="${tileX + 0.1}" y="${tileY + 0.2}" class="tile-label">Tile ${tileNum} of ${tilesX * tilesY} (${tx + 1},${ty + 1})</text>
</svg>`;

      pages.push(svgContent);
    }
  }

  // Create print window with all pages
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pattern.buildingName} - Tiled Pattern</title>
        <style>
          @page {
            size: ${paper.width}in ${paper.height}in;
            margin: ${margins}in;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: auto;
          }
          .page-header {
            font-size: 10pt;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ccc;
          }
          svg {
            display: block;
            max-width: 100%;
          }
          .instructions-page {
            padding: 20px;
          }
          .instructions {
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .tile-map {
            margin: 20px 0;
            border: 1px solid #ccc;
            padding: 10px;
          }
          .tile-map-grid {
            display: grid;
            grid-template-columns: repeat(${tilesX}, 1fr);
            gap: 5px;
          }
          .tile-map-cell {
            border: 1px solid #999;
            padding: 10px;
            text-align: center;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        ${pages.map((svg, i) => `
          <div class="page">
            <div class="page-header">
              <strong>${pattern.buildingName}</strong> - Tile ${i + 1} of ${pages.length}
            </div>
            ${svg}
          </div>
        `).join('')}

        ${includeInstructions ? `
        <div class="page instructions-page">
          <h2>Assembly Instructions</h2>

          <div class="tile-map">
            <h3>Tile Layout</h3>
            <div class="tile-map-grid">
              ${Array.from({ length: tilesY }).map((_, y) =>
                Array.from({ length: tilesX }).map((_, x) => {
                  const num = y * tilesX + x + 1;
                  return `<div class="tile-map-cell">${num}</div>`;
                }).join('')
              ).join('')}
            </div>
            <p style="font-size: 9pt; color: #666;">Arrange tiles as shown above. Use alignment marks to join tiles.</p>
          </div>

          <div class="instructions">
            <h3>Building Assembly (${MATERIAL_PROPERTIES[pattern.materialType || 'paper'].label})</h3>
            <ol>
              <li>Print all ${pages.length} tile pages at 100% scale (no scaling)</li>
              <li>Align tiles using the corner alignment marks and tape together</li>
              ${(pattern.assemblySteps || MATERIAL_PROPERTIES[pattern.materialType || 'paper'].assemblySteps).map(step => `<li>${step}</li>`).join('\n              ')}
            </ol>
          </div>

          <div style="margin-top: 20px; font-size: 9pt; color: #666;">
            <strong>Pattern Info:</strong> ${pattern.buildingName}<br>
            Scale: ${pattern.scale}<br>
            Size: ${pattern.width.toFixed(2)}" × ${pattern.height.toFixed(2)}"
          </div>
        </div>
        ` : ''}

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

/**
 * Generate SVG content for pattern panels (without wrapper)
 */
function generatePatternContent(pattern: UnfoldedPattern): string {
  let content = '';

  // Draw glue tabs
  for (const tab of pattern.glueTabs) {
    const points = tab.vertices
      .map(v => `${(v.x + tab.position.x).toFixed(4)},${(v.y + tab.position.y).toFixed(4)}`)
      .join(' ');
    content += `<polygon points="${points}" class="glue-tab" />\n`;
  }

  // Draw panels
  for (const panel of pattern.panels) {
    const points = panel.vertices
      .map(v => `${(v.x + panel.position.x).toFixed(4)},${(v.y + panel.position.y).toFixed(4)}`)
      .join(' ');
    content += `<polygon points="${points}" class="panel" />\n`;

    // Draw edges
    for (const edge of panel.edges) {
      const v1 = panel.vertices[edge.from];
      const v2 = panel.vertices[edge.to];
      const x1 = v1.x + panel.position.x;
      const y1 = v1.y + panel.position.y;
      const x2 = v2.x + panel.position.x;
      const y2 = v2.y + panel.position.y;

      if (edge.type !== 'glue-tab') {
        content += `<line x1="${x1.toFixed(4)}" y1="${y1.toFixed(4)}" x2="${x2.toFixed(4)}" y2="${y2.toFixed(4)}" class="${edge.type}" />\n`;
      }
    }

    // Draw openings
    if (panel.openings) {
      for (const opening of panel.openings) {
        const panelHeight = Math.max(...panel.vertices.map(v => v.y));
        const openingX = panel.position.x + opening.x;
        const openingY = panel.position.y + (panelHeight - opening.y - opening.height);
        const openingClass = opening.type === 'door' ? 'opening-door' : 'opening-window';
        content += `<rect x="${openingX.toFixed(4)}" y="${openingY.toFixed(4)}" width="${opening.width.toFixed(4)}" height="${opening.height.toFixed(4)}" class="${openingClass}" />\n`;
      }
    }

    // Panel label
    const centerX = panel.position.x + panel.vertices.reduce((sum, v) => sum + v.x, 0) / panel.vertices.length;
    const centerY = panel.position.y + panel.vertices.reduce((sum, v) => sum + v.y, 0) / panel.vertices.length;
    content += `<text x="${centerX.toFixed(4)}" y="${centerY.toFixed(4)}" class="label" text-anchor="middle">${panel.name}</text>\n`;
  }

  return content;
}
