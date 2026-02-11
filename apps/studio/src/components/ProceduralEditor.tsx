'use client';

/**
 * TidKit Studio - Procedural Texture Editor
 * Full editor view with parameter controls, baked preview, and export.
 * Uses offscreen Three.js rendering (no R3F needed).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProceduralTextureConfig } from '@tidkit/ui/types/procedural';
import { createDefaultConfig } from '@tidkit/ui/lib/procedural-textures';
import { exportPtexFile, importPtexFile } from '@tidkit/ui/lib/ptex-format';
import { ProceduralTextureControls } from '@tidkit/ui/components/ProceduralTextureControls';
import { bakePreview, bakeExport, disposeRenderer } from '@/lib/procedural-baker';
import { saveTextureToLibrary } from '@tidkit/ui';
import type { TextureFile } from '@/types/texture';
import { useTextureStore } from '@/stores/textureStore';

interface ProceduralEditorProps {
  onClose: () => void;
  onOpenInEditor?: (texture: TextureFile) => void;
}

export function ProceduralEditor({ onClose, onOpenInEditor }: ProceduralEditorProps) {
  const [config, setConfig] = useState<ProceduralTextureConfig>(() => createDefaultConfig('brick'));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tiled, setTiled] = useState(false);
  const [exportSize, setExportSize] = useState(1024);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced preview update
  const updatePreview = useCallback((cfg: ProceduralTextureConfig) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const url = bakePreview(cfg, 512, 512);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Preview bake failed:', err);
      }
    }, 100);
  }, []);

  // Update preview when config changes
  useEffect(() => {
    updatePreview(config);
  }, [config, updatePreview]);

  // Cleanup renderer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleConfigChange = (newConfig: ProceduralTextureConfig) => {
    setConfig(newConfig);
  };

  const handleSavePtex = () => {
    const name = `${config.type}-texture`;
    exportPtexFile(config, name);
    showStatus('Saved .ptex.json');
  };

  const handleLoadPtex = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importPtexFile(file);
      setConfig(imported);
      showStatus('Loaded .ptex.json');
    } catch (err) {
      showStatus('Failed to load file');
      console.error('Import error:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportImage = () => {
    setIsExporting(true);
    try {
      const dataUrl = bakeExport(config, exportSize, exportSize);

      // Trigger download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `procedural-${config.type}-${exportSize}px.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showStatus(`Exported ${exportSize}x${exportSize} PNG`);
    } catch (err) {
      showStatus('Export failed');
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToLibrary = () => {
    if (!previewUrl) return;
    try {
      saveTextureToLibrary({
        name: `Procedural ${config.type}`,
        category: config.type === 'brick' ? 'Brick' : 'Stone',
        thumbnailUrl: previewUrl,
        fullUrl: previewUrl,
        metadata: {
          realWidth: 24,
          realHeight: 24,
          pixelWidth: 512,
          pixelHeight: 512,
          isSeamless: true,
        },
      });
      showStatus('Saved to library');
    } catch (err) {
      showStatus('Failed to save');
    }
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Procedural Texture Editor</h1>
            <p className="text-xs text-gray-500">Create shader-based textures for tabletop terrain</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="text-xs text-green-600 font-medium">{statusMessage}</span>
          )}
          <button
            onClick={handleSavePtex}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Save .ptex.json
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L16 8m4-4v12" />
            </svg>
            Load .ptex.json
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ptex.json"
            onChange={handleLoadPtex}
            className="hidden"
          />
        </div>
      </div>

      {/* Main content: sidebar + preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: controls */}
        <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto p-4">
          <ProceduralTextureControls config={config} onChange={handleConfigChange} />

          {/* World Scale */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">World Scale</label>
              <span className="text-[10px] text-gray-500 tabular-nums">{config.worldScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.0}
              step={0.1}
              value={config.worldScale}
              onChange={(e) => setConfig({ ...config, worldScale: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Right: preview pane */}
        <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center p-8">
          {/* Preview controls */}
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tiled}
                onChange={(e) => setTiled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-600">Tiled Preview (2x2)</span>
            </label>
          </div>

          {/* Preview image */}
          <div
            className={`bg-white shadow-lg rounded-lg overflow-hidden ${
              tiled ? 'w-[512px] h-[512px]' : 'w-[512px] h-[512px]'
            }`}
          >
            {previewUrl ? (
              tiled ? (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: '50% 50%',
                    backgroundRepeat: 'repeat',
                  }}
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Procedural texture preview"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm">Generating preview...</p>
                </div>
              </div>
            )}
          </div>

          {/* Export controls */}
          <div className="mt-6 flex items-center gap-3">
            <select
              value={exportSize}
              onChange={(e) => setExportSize(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value={512}>512 x 512</option>
              <option value={1024}>1024 x 1024</option>
              <option value={2048}>2048 x 2048</option>
              <option value={4096}>4096 x 4096</option>
            </select>

            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export as Image'}
            </button>

            <button
              onClick={handleSaveToLibrary}
              disabled={!previewUrl}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
