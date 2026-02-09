'use client';

import { useTextureStore } from '@/stores/textureStore';
import { MODEL_SCALES, TEXTURE_CATEGORIES } from '@tidkit/config';

export function ScaleControls() {
  const {
    selectedScale,
    realWidth,
    realHeight,
    selectedCategory,
    setScale,
    setRealDimensions,
    setCategory,
    getCalculatedDPI,
  } = useTextureStore();

  const dpi = getCalculatedDPI();

  // Group scales by category
  const scalesByCategory = MODEL_SCALES.reduce(
    (acc, scale) => {
      if (!acc[scale.category]) acc[scale.category] = [];
      acc[scale.category].push(scale);
      return acc;
    },
    {} as Record<string, typeof MODEL_SCALES>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Scale & Dimensions</h2>

      <div className="space-y-6">
        {/* Model scale selection */}
        <div>
          <label className="text-sm font-medium text-gray-700">Model Scale</label>
          <select
            value={selectedScale.name}
            onChange={(e) => {
              const scale = MODEL_SCALES.find((s) => s.name === e.target.value);
              if (scale) setScale(scale);
            }}
            className="mt-1 block w-full rounded-lg border-gray-300 text-sm"
          >
            {Object.entries(scalesByCategory).map(([category, scales]) => (
              <optgroup
                key={category}
                label={category.charAt(0).toUpperCase() + category.slice(1)}
              >
                {scales.map((scale) => (
                  <option key={scale.name} value={scale.name}>
                    {scale.name} ({scale.label})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Real-world dimensions */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Real-World Size (inches)
          </label>
          <p className="text-xs text-gray-500 mt-0.5">
            Measure the actual size of the texture area
          </p>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Width</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={realWidth}
                onChange={(e) =>
                  setRealDimensions(parseFloat(e.target.value) || 1, realHeight)
                }
                className="mt-1 block w-full rounded-lg border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Height</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={realHeight}
                onChange={(e) =>
                  setRealDimensions(realWidth, parseFloat(e.target.value) || 1)
                }
                className="mt-1 block w-full rounded-lg border-gray-300 text-sm"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { label: '1 ft', w: 12, h: 12 },
              { label: '2 ft', w: 24, h: 24 },
              { label: '4 ft', w: 48, h: 48 },
              { label: '8"×8"', w: 8, h: 8 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setRealDimensions(preset.w, preset.h)}
                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculated DPI */}
        {dpi > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900">
              Calculated DPI: {Math.round(dpi)}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {dpi >= 300
                ? '✓ Good for printing'
                : dpi >= 150
                  ? '⚠ Acceptable for small prints'
                  : '✗ May appear pixelated'}
            </p>
          </div>
        )}

        {/* Texture category */}
        <div className="border-t pt-6">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={selectedCategory.id}
            onChange={(e) => {
              const cat = TEXTURE_CATEGORIES.find((c) => c.id === e.target.value);
              if (cat) setCategory(cat);
            }}
            className="mt-1 block w-full rounded-lg border-gray-300 text-sm"
          >
            {TEXTURE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
