'use client';

/**
 * TidKit Builder - Control Panel Component
 * UI controls for building parameters
 */

import { useState } from 'react';
import { useBuildingStore, type BuildingSurface, type LibraryTexture } from '@/stores/buildingStore';
import { MODEL_SCALES, RoofStyle, ROOF_STYLE_INFO } from '@/types/building';
import { TexturePicker } from './TexturePicker';

export function ControlPanel() {
  const {
    params,
    textures,
    showWireframe,
    showDimensions,
    setWidth,
    setDepth,
    setHeight,
    setRoofStyle,
    setRoofPitch,
    setRoofOverhang,
    setScaleByName,
    toggleWireframe,
    toggleDimensions,
    resetToDefaults,
    getModelDimensions,
  } = useBuildingStore();

  const [texturePicker, setTexturePicker] = useState<BuildingSurface | null>(null);
  const modelDims = getModelDimensions();

  // Get roof styles from the info object
  const roofStyles = (Object.keys(ROOF_STYLE_INFO) as RoofStyle[]).map(style => ({
    value: style,
    label: ROOF_STYLE_INFO[style].label,
    icon: ROOF_STYLE_INFO[style].icon,
    description: ROOF_STYLE_INFO[style].description,
  }));

  // Group scales by category
  const scalesByCategory = {
    railroad: MODEL_SCALES.filter((s) => s.category === 'railroad'),
    wargaming: MODEL_SCALES.filter((s) => s.category === 'wargaming'),
    dollhouse: MODEL_SCALES.filter((s) => s.category === 'dollhouse'),
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Building Parameters</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your building</p>
      </div>

      {/* Dimensions Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Dimensions (feet)
        </h3>

        <div className="space-y-3">
          <div>
            <label className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Width (front)</span>
              <span className="font-mono">{params.dimensions.width} ft</span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={params.dimensions.width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Depth (side)</span>
              <span className="font-mono">{params.dimensions.depth} ft</span>
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={params.dimensions.depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Wall Height</span>
              <span className="font-mono">{params.dimensions.height} ft</span>
            </label>
            <input
              type="range"
              min="8"
              max="40"
              step="1"
              value={params.dimensions.height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Roof Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Roof</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Style</label>
            <div className="grid grid-cols-4 gap-1">
              {roofStyles.slice(0, 4).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setRoofStyle(value)}
                  title={ROOF_STYLE_INFO[value].description}
                  className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center ${
                    params.roof.style === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {roofStyles.slice(4).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setRoofStyle(value)}
                  title={ROOF_STYLE_INFO[value].description}
                  className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center ${
                    params.roof.style === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-sm">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {params.roof.style !== 'flat' && (
            <div>
              <label className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Pitch</span>
                <span className="font-mono">{params.roof.pitch}°</span>
              </label>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={params.roof.pitch}
                onChange={(e) => setRoofPitch(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          <div>
            <label className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overhang</span>
              <span className="font-mono">{params.roof.overhang} ft</span>
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.5"
              value={params.roof.overhang}
              onChange={(e) => setRoofOverhang(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Scale Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Model Scale</h3>

        <select
          value={params.scale.name}
          onChange={(e) => setScaleByName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <optgroup label="Model Railroad">
            {scalesByCategory.railroad.map((scale) => (
              <option key={scale.name} value={scale.name}>
                {scale.name} (1:{scale.ratio})
              </option>
            ))}
          </optgroup>
          <optgroup label="Wargaming">
            {scalesByCategory.wargaming.map((scale) => (
              <option key={scale.name} value={scale.name}>
                {scale.name} (1:{scale.ratio})
              </option>
            ))}
          </optgroup>
          <optgroup label="Dollhouse">
            {scalesByCategory.dollhouse.map((scale) => (
              <option key={scale.name} value={scale.name}>
                {scale.name}
              </option>
            ))}
          </optgroup>
        </select>

        {/* Model dimensions output */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium mb-1">
            Physical Model Size
          </p>
          <p className="text-sm text-blue-900 font-mono">
            {modelDims.widthInches.toFixed(2)}" × {modelDims.depthInches.toFixed(2)}" × {modelDims.heightInches.toFixed(2)}"
          </p>
          <p className="text-xs text-blue-600 mt-1">
            ({(modelDims.widthInches * 25.4).toFixed(1)} × {(modelDims.depthInches * 25.4).toFixed(1)} × {(modelDims.heightInches * 25.4).toFixed(1)} mm)
          </p>
        </div>
      </div>

      {/* Textures Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Textures</h3>

        <div className="space-y-2">
          {(['frontWall', 'sideWalls', 'backWall', 'roof', 'foundation', 'trim'] as BuildingSurface[]).map((surface) => {
            const texture = textures[surface];
            const isLibraryTexture = texture && typeof texture === 'object';
            const displayName = isLibraryTexture
              ? (texture as LibraryTexture).name
              : texture
                ? `Texture #${texture}`
                : null;

            return (
              <div key={surface} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {surface.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <button
                  onClick={() => setTexturePicker(surface)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    texture
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {displayName ? (
                    <span className="truncate max-w-[100px] inline-block">{displayName}</span>
                  ) : (
                    'Select...'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Click to choose textures from your TidKit library
        </p>
      </div>

      {/* View Options */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">View Options</h3>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={toggleWireframe}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show wireframe</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={toggleDimensions}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show dimensions</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={resetToDefaults}
          className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Reset to Defaults
        </button>

        <button className="w-full px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          Export Pattern →
        </button>
      </div>

      {/* Texture Picker Modal */}
      {texturePicker && (
        <TexturePicker
          surface={texturePicker}
          onClose={() => setTexturePicker(null)}
        />
      )}
    </div>
  );
}
