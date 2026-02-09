'use client';

/**
 * TidKit Builder - Unfolded Pattern View
 * Displays the 2D unfolded pattern for the building
 */

import { useMemo, useRef, useState } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import { unfoldBuilding, patternToSVG, UnfoldedPattern } from '@/lib/unfold';

interface UnfoldedViewProps {
  buildingName?: string;
}

export function UnfoldedView({ buildingName = 'Building' }: UnfoldedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { params } = useBuildingStore();
  const [zoom, setZoom] = useState(100);

  // Generate unfolded pattern
  const pattern = useMemo(() => {
    return unfoldBuilding(params, buildingName);
  }, [params, buildingName]);

  // Generate SVG
  const svgContent = useMemo(() => {
    return patternToSVG(pattern, 96); // 96 DPI for screen display
  }, [pattern]);

  return (
    <div ref={containerRef} className="w-full h-full bg-white overflow-auto p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b z-10">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Pattern: {pattern.width.toFixed(2)}" × {pattern.height.toFixed(2)}"
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(25, zoom - 25))}
              className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
            >
              −
            </button>
            <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
            >
              +
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadSVG(pattern)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download SVG
          </button>
          <button
            onClick={() => downloadPDF(pattern)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Pattern preview - scalable */}
      <div className="border border-gray-300 bg-white rounded-lg overflow-auto max-h-[60vh]">
        <div
          className="inline-block"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {/* Panel count info */}
      <div className="mt-4 text-sm text-gray-600">
        <strong>{pattern.panels.length}</strong> panels • <strong>{pattern.glueTabs.length}</strong> glue tabs
      </div>

      {/* Assembly instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Assembly Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Print the pattern at 100% scale (no scaling)</li>
          <li>Cut along solid black lines</li>
          <li>Score and fold along dashed lines (red = mountain, blue = valley)</li>
          <li>Apply glue to gray tabs and assemble walls into a box</li>
          <li>Attach roof panels, folding at the ridge</li>
          <li>Glue gable ends (if applicable) to close the roof</li>
        </ol>
      </div>

      {/* Scale reference */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Scale Information</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Scale:</strong> {params.scale.name} (1:{params.scale.ratio})</p>
          <p><strong>Real-world size:</strong> {params.dimensions.width}' W × {params.dimensions.depth}' D × {params.dimensions.height}' H</p>
          <p><strong>Model size:</strong> {(params.dimensions.width * 12 / params.scale.ratio).toFixed(2)}" × {(params.dimensions.depth * 12 / params.scale.ratio).toFixed(2)}" × {(params.dimensions.height * 12 / params.scale.ratio).toFixed(2)}"</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Download pattern as SVG file
 */
function downloadSVG(pattern: UnfoldedPattern) {
  const svgContent = patternToSVG(pattern, 300);
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
 * Download pattern as PDF (using browser print)
 */
function downloadPDF(pattern: UnfoldedPattern) {
  // Create a new window with just the SVG for printing
  const svgContent = patternToSVG(pattern, 300);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pattern.buildingName} - Pattern</title>
        <style>
          @page {
            size: auto;
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
          .print-info {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="print-info">
          <strong>TidKit Builder</strong> - Print at 100% scale (no scaling)
        </div>
        ${svgContent}
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
