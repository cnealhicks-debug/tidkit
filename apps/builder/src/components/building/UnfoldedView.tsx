'use client';

/**
 * TidKit Builder - Unfolded Pattern View
 * Displays the 2D unfolded pattern for the building
 */

import { useMemo, useRef, useState } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import { unfoldBuilding, patternToSVG, UnfoldedPattern } from '@/lib/unfold';
import { generateAssemblyGuide } from '@/lib/assembly-guide';
import { MATERIAL_PROPERTIES, DEFAULT_MATERIAL } from '@/types/building';

interface UnfoldedViewProps {
  buildingName?: string;
}

export function UnfoldedView({ buildingName = 'Building' }: UnfoldedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { params, accessories } = useBuildingStore();
  const [zoom, setZoom] = useState(100);
  const [showGuide, setShowGuide] = useState(false);

  // Generate unfolded pattern (including accessory panels)
  const pattern = useMemo(() => {
    return unfoldBuilding(params, buildingName, accessories);
  }, [params, buildingName, accessories]);

  const hasDetails = (pattern.accessoryPanels?.length || 0) + (pattern.detailPanels?.length || 0) > 0;

  // Generate SVG
  const svgContent = useMemo(() => {
    return patternToSVG(pattern, 96); // 96 DPI for screen display
  }, [pattern]);

  // Generate assembly guide SVG
  const guideSvg = useMemo(() => {
    if (!showGuide || !hasDetails) return '';
    return generateAssemblyGuide(pattern);
  }, [pattern, showGuide, hasDetails]);

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
          {hasDetails && (
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`px-3 py-1.5 text-sm rounded ${
                showGuide
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showGuide ? 'Pattern' : 'Assembly Guide'}
            </button>
          )}
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

      {/* Pattern or Assembly Guide preview */}
      <div className="border border-gray-300 bg-white rounded-lg overflow-auto max-h-[60vh]">
        <div
          className="inline-block"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
          dangerouslySetInnerHTML={{ __html: showGuide && guideSvg ? guideSvg : svgContent }}
        />
      </div>

      {/* Panel count info */}
      <div className="mt-4 text-sm text-gray-600">
        <strong>{pattern.panels.length}</strong> structural panels
        {pattern.glueTabs.length > 0 && <> • <strong>{pattern.glueTabs.length}</strong> glue tabs</>}
        {pattern.facadePanels && pattern.facadePanels.length > 0 && (
          <> • <strong>{pattern.facadePanels.length}</strong> facade sheets</>
        )}
        {pattern.accessoryPanels && pattern.accessoryPanels.length > 0 && (
          <> • <strong>{pattern.accessoryPanels.length}</strong> accessory pieces</>
        )}
        {pattern.detailPanels && pattern.detailPanels.length > 0 && (
          <> • <strong>{pattern.detailPanels.length}</strong> detail pieces</>
        )}
        <span className="ml-2 text-gray-400">|</span>
        <span className="ml-2">
          {MATERIAL_PROPERTIES[pattern.materialType || 'paper'].icon}{' '}
          {MATERIAL_PROPERTIES[pattern.materialType || 'paper'].label}
        </span>
      </div>

      {/* Edge Legend */}
      <EdgeLegend materialType={pattern.materialType || 'paper'} />

      {/* Assembly instructions (dynamic from material) */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Assembly Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          {(pattern.assemblySteps || MATERIAL_PROPERTIES.paper.assemblySteps).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Scale & Material reference */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Build Details</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Scale:</strong> {params.scale.name} (1:{params.scale.ratio})</p>
          <p><strong>Real-world size:</strong> {params.dimensions.width}' W × {params.dimensions.depth}' D × {params.dimensions.height}' H</p>
          <p><strong>Model size:</strong> {(params.dimensions.width * 12 / params.scale.ratio).toFixed(2)}" × {(params.dimensions.depth * 12 / params.scale.ratio).toFixed(2)}" × {(params.dimensions.height * 12 / params.scale.ratio).toFixed(2)}"</p>
          <p>
            <strong>Material:</strong> {MATERIAL_PROPERTIES[pattern.materialType || 'paper'].label}
            {params.material && params.material.type !== 'paper' && (
              <>
                {' '}({MATERIAL_PROPERTIES[params.material.type].thicknessOptions.find(
                  o => Math.abs(o.value - params.material!.thickness) < 0.001
                )?.label || `${params.material.thickness}"`})
              </>
            )}
          </p>
          {params.material && params.material.type !== 'paper' && (
            <p>
              <strong>Joint:</strong> {
                params.material.jointMethod === 'butt' ? 'Butt joint' :
                params.material.jointMethod === 'slot-tab' ? 'Slot & tab' :
                params.material.jointMethod === 'miter' ? 'Mitered (45°)' :
                'Glue tab'
              }
            </p>
          )}
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
 * Edge Legend — shows edge type colors and meanings, adapts to material
 */
function EdgeLegend({ materialType }: { materialType: string }) {
  const isPaper = materialType === 'paper';
  const isChipboard = materialType === 'chipboard';
  const isSeparatePanel = !isPaper && !isChipboard;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
      <span className="font-semibold text-gray-700">Edge Legend:</span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 h-0 border-t-2 border-black" />
        Cut
      </span>
      {isPaper && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0 border-t-2 border-dashed border-red-500" />
            Mountain fold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0 border-t-2 border-dashed border-blue-500" />
            Valley fold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-3 bg-gray-200 border border-gray-400 rounded-sm" style={{ fontSize: 0 }} />
            Glue tab
          </span>
        </>
      )}
      {isChipboard && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0 border-t-2 border-dotted border-orange-500" />
          Score line
        </span>
      )}
      {isSeparatePanel && (
        <span className="text-gray-400 italic">All edges are cut lines (separate panels)</span>
      )}
    </div>
  );
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
