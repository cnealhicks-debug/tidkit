'use client';

/**
 * TidKit Builder - Texture Panel
 * Panel for selecting and applying textures to building faces
 */

import { useState, useEffect } from 'react';
import { TextureLibrary, type LibraryTexture } from '@tidkit/ui';
import { useBuildingStore, type BuildingSurface, type LibraryTexture as StoreLibraryTexture } from '@/stores/buildingStore';
import { isProceduralTexture } from '@/types/procedural';
import { ProceduralTexturePanel } from './ProceduralTexturePanel';

// UI face selector types (maps to store's BuildingSurface)
type UIFace = 'walls' | 'frontWall' | 'backWall' | 'sideWalls' | 'roof';

const FACES: { key: UIFace; label: string; icon: string; surfaces: BuildingSurface[] }[] = [
  { key: 'walls', label: 'All Walls', icon: '▢', surfaces: ['frontWall', 'sideWalls', 'backWall'] },
  { key: 'frontWall', label: 'Front', icon: '⬜', surfaces: ['frontWall'] },
  { key: 'backWall', label: 'Back', icon: '⬜', surfaces: ['backWall'] },
  { key: 'sideWalls', label: 'Sides', icon: '⬜', surfaces: ['sideWalls'] },
  { key: 'roof', label: 'Roof', icon: '△', surfaces: ['roof'] },
];

// Control panel width in pixels (w-80 = 20rem = 320px)
const CONTROL_PANEL_WIDTH = 320;
const PANEL_GAP = 8;

interface TexturePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TexturePanel({ isOpen, onClose }: TexturePanelProps) {
  const { textures, setTexture, clearTextures } = useBuildingStore();
  const [selectedFace, setSelectedFace] = useState<UIFace>('walls');
  const [showLibrary, setShowLibrary] = useState(false);
  const [textureSource, setTextureSource] = useState<'library' | 'procedural'>('library');

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showLibrary) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, showLibrary, onClose]);

  // Get the surfaces for the selected face
  const selectedSurfaces = FACES.find(f => f.key === selectedFace)?.surfaces || [];

  // Handle selecting a texture from the library
  const handleSelectTexture = (texture: LibraryTexture) => {
    // Apply to all surfaces for this face
    for (const surface of selectedSurfaces) {
      setTexture(surface, texture as unknown as StoreLibraryTexture);
    }
    setShowLibrary(false);
  };

  // Get current texture for selected face (returns first matching surface texture)
  const getCurrentTexture = (): StoreLibraryTexture | null => {
    for (const surface of selectedSurfaces) {
      const tex = textures[surface];
      if (tex && typeof tex === 'object') {
        return tex as StoreLibraryTexture;
      }
    }
    return null;
  };

  // Clear texture for selected face
  const handleClearTexture = () => {
    for (const surface of selectedSurfaces) {
      setTexture(surface, null);
    }
  };

  if (!isOpen) return null;

  const currentTexture = getCurrentTexture();

  return (
    <>
      {/* Panel */}
      <div
        className="fixed top-16 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden"
        style={{ right: CONTROL_PANEL_WIDTH + PANEL_GAP }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-gray-900 dark:text-white">Apply Textures</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Face selector */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Select Face
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FACES.map((face) => {
              // Check if any of the surfaces for this face have a texture
              const hasTexture = face.surfaces.some(surface => textures[surface]);

              return (
                <button
                  key={face.key}
                  onClick={() => setSelectedFace(face.key)}
                  className={`relative px-2 py-2 text-xs rounded border transition-colors ${
                    selectedFace === face.key
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg block mb-0.5">{face.icon}</span>
                  <span className="block truncate">{face.label}</span>
                  {hasTexture && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Texture source toggle */}
        <div className="px-4 pt-3 pb-2">
          <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setTextureSource('library')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                textureSource === 'library'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => setTextureSource('procedural')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                textureSource === 'procedural'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              Procedural
            </button>
          </div>
        </div>

        {textureSource === 'procedural' ? (
          /* Procedural texture panel */
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <ProceduralTexturePanel
              surface={selectedSurfaces[0] || 'frontWall'}
              onClose={() => {
                handleClearTexture();
                setTextureSource('library');
              }}
            />
          </div>
        ) : (
          <>
            {/* Current texture preview */}
            <div className="p-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {FACES.find(f => f.key === selectedFace)?.label} Texture
              </label>

              {currentTexture ? (
                <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={currentTexture.thumbnailUrl}
                    alt={currentTexture.name}
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-medium truncate">{currentTexture.name}</p>
                  </div>
                  <button
                    onClick={handleClearTexture}
                    className="absolute top-2 right-2 p-1 bg-white/90 rounded-full hover:bg-white"
                    title="Remove texture"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-24 flex items-center justify-center">
                  {(() => {
                    const tex = textures[selectedSurfaces[0]];
                    if (tex && isProceduralTexture(tex)) {
                      return <p className="text-gray-500 dark:text-gray-400 text-sm">Procedural: {tex.type}</p>;
                    }
                    return <p className="text-gray-400 dark:text-gray-500 text-sm">No texture</p>;
                  })()}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => setShowLibrary(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Choose from Library
                </button>

                {currentTexture && (
                  <button
                    onClick={handleClearTexture}
                    className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    Remove Texture
                  </button>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-4 pb-4">
              <button
                onClick={clearTextures}
                className="w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear All Textures
              </button>
            </div>

            {/* Tip */}
            <div className="px-4 pb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Create custom textures in{' '}
                  <a href="http://localhost:3002" className="underline hover:text-blue-900 dark:hover:text-blue-200">
                    Studio
                  </a>{' '}
                  with true-to-scale dimensions.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Texture Library Modal */}
      {showLibrary && (
        <TextureLibrary
          mode="modal"
          onSelect={handleSelectTexture}
          onClose={() => setShowLibrary(false)}
          showSamples={true}
          selectedCategory={selectedFace === 'roof' ? 'Roof' : 'All'}
        />
      )}
    </>
  );
}
