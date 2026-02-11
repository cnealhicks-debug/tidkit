'use client';

/**
 * TidKit Builder - Procedural Texture Panel
 * Full parameter UI: presets, sliders, color pickers, weathering controls.
 * Wraps shared ProceduralTextureControls with store bindings.
 * Adds .ptex.json save/load buttons.
 */

import { useRef } from 'react';
import { useBuildingStore, type BuildingSurface } from '@/stores/buildingStore';
import { isProceduralTexture } from '@/types/procedural';
import type { ProceduralTextureConfig } from '@/types/procedural';
import { createDefaultConfig } from '@/lib/procedural-textures';
import { ProceduralTextureControls } from '@tidkit/ui/components/ProceduralTextureControls';
import { exportPtexFile, importPtexFile } from '@tidkit/ui/lib/ptex-format';

interface ProceduralTexturePanelProps {
  surface: BuildingSurface;
  onClose: () => void;
}

export function ProceduralTexturePanel({ surface, onClose }: ProceduralTexturePanelProps) {
  const { textures, setProceduralTexture } = useBuildingStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTexture = textures[surface];
  const config = isProceduralTexture(currentTexture) ? currentTexture : null;

  // Initialize with default if no procedural texture is set
  if (!config) {
    const defaultConfig = createDefaultConfig('brick');
    setProceduralTexture(surface, defaultConfig);
  }

  const handleConfigChange = (newConfig: ProceduralTextureConfig) => {
    setProceduralTexture(surface, newConfig);
  };

  const handleExport = () => {
    if (!config) return;
    const name = `${surface}-${config.type}`;
    exportPtexFile(config, name);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importPtexFile(file);
      setProceduralTexture(surface, imported);
    } catch (err) {
      console.error('Failed to import .ptex.json:', err);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!config) return null;

  return (
    <div className="space-y-4">
      {/* Save/Load buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Save .ptex.json
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1.5"
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
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Shared controls */}
      <ProceduralTextureControls config={config} onChange={handleConfigChange} />

      {/* Remove procedural texture */}
      <button
        onClick={onClose}
        className="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Remove Procedural Texture
      </button>
    </div>
  );
}
