'use client';

import { useState } from 'react';
import { useTextureStore } from '@/stores/textureStore';
import type { TextureFile } from '@/types/texture';

interface TexturePreviewProps {
  original: TextureFile;
  processed: TextureFile | null;
}

export function TexturePreview({ original, processed }: TexturePreviewProps) {
  const { previewTiled, toggleTiled } = useTextureStore();
  const [showProcessed, setShowProcessed] = useState(true);

  const displayTexture = showProcessed && processed ? processed : original;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-gray-900">Preview</h2>

          {/* Toggle original/processed */}
          {processed && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowProcessed(false)}
                className={`px-3 py-1 text-sm ${
                  !showProcessed
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setShowProcessed(true)}
                className={`px-3 py-1 text-sm ${
                  showProcessed
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Processed
              </button>
            </div>
          )}
        </div>

        {/* Tiled preview toggle */}
        <button
          onClick={toggleTiled}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            previewTiled
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {previewTiled ? '2×2 Tiled' : 'Single'}
        </button>
      </div>

      {/* Preview area */}
      <div className="checkerboard p-4">
        <div
          className={`
            relative mx-auto overflow-hidden rounded-lg shadow-lg
            ${previewTiled ? 'max-w-[600px]' : 'max-w-[400px]'}
          `}
        >
          {previewTiled ? (
            // 2x2 tiled preview
            <div className="grid grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={displayTexture.url}
                  alt={`Tile ${i + 1}`}
                  className="w-full h-auto"
                />
              ))}
            </div>
          ) : (
            // Single preview
            <img
              src={displayTexture.url}
              alt={displayTexture.name}
              className="w-full h-auto"
            />
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
        <span>{displayTexture.name}</span>
        <span>
          {displayTexture.metadata.pixelWidth} × {displayTexture.metadata.pixelHeight}px
          {displayTexture.metadata.dpi > 0 && ` • ${displayTexture.metadata.dpi} DPI`}
        </span>
      </div>
    </div>
  );
}
