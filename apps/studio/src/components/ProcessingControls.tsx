'use client';

import { useTextureStore } from '@/stores/textureStore';

export function ProcessingControls() {
  const { options, updateOptions } = useTextureStore();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Processing Options</h2>

      <div className="space-y-6">
        {/* Seamless generation */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.makeSeamless}
              onChange={(e) => updateOptions({ makeSeamless: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700">Make Seamless</span>
          </label>

          {options.makeSeamless && (
            <div className="mt-3 ml-7 space-y-3">
              {/* Method selection */}
              <div>
                <label className="text-sm text-gray-600">Method</label>
                <select
                  value={options.seamlessMethod}
                  onChange={(e) =>
                    updateOptions({
                      seamlessMethod: e.target.value as 'blend' | 'mirror' | 'smart',
                    })
                  }
                  className="mt-1 block w-full rounded-lg border-gray-300 text-sm"
                >
                  <option value="smart">Smart (Recommended)</option>
                  <option value="blend">Edge Blending</option>
                  <option value="mirror">Mirror</option>
                </select>
              </div>

              {/* Blend width */}
              {options.seamlessMethod !== 'mirror' && (
                <div>
                  <label className="text-sm text-gray-600">
                    Blend Width: {options.blendWidth}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={options.blendWidth}
                    onChange={(e) =>
                      updateOptions({ blendWidth: parseInt(e.target.value) })
                    }
                    className="mt-1 w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Color adjustments */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Color Adjustments
          </h3>

          {/* Brightness */}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">
                Brightness: {options.brightness > 0 ? '+' : ''}
                {options.brightness}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={options.brightness}
                onChange={(e) =>
                  updateOptions({ brightness: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div>
              <label className="text-sm text-gray-600">
                Contrast: {options.contrast > 0 ? '+' : ''}
                {options.contrast}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={options.contrast}
                onChange={(e) =>
                  updateOptions({ contrast: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div>
              <label className="text-sm text-gray-600">
                Saturation: {options.saturation > 0 ? '+' : ''}
                {options.saturation}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={options.saturation}
                onChange={(e) =>
                  updateOptions({ saturation: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Reset button */}
            {(options.brightness !== 0 ||
              options.contrast !== 0 ||
              options.saturation !== 0) && (
              <button
                onClick={() =>
                  updateOptions({ brightness: 0, contrast: 0, saturation: 0 })
                }
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Reset adjustments
              </button>
            )}
          </div>
        </div>

        {/* Output format */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Output</h3>

          <div className="grid grid-cols-3 gap-2">
            {(['png', 'jpeg', 'webp'] as const).map((format) => (
              <button
                key={format}
                onClick={() => updateOptions({ outputFormat: format })}
                className={`px-3 py-2 text-sm rounded-lg border ${
                  options.outputFormat === format
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Quality slider for lossy formats */}
          {options.outputFormat !== 'png' && (
            <div className="mt-3">
              <label className="text-sm text-gray-600">
                Quality: {options.quality}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={options.quality}
                onChange={(e) =>
                  updateOptions({ quality: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
