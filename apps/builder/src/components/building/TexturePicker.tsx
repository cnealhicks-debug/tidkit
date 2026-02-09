'use client';

/**
 * TidKit Builder - Texture Picker Component
 * Browse and select textures from the TidKit library
 */

import { useState, useEffect } from 'react';
import { getTextures, Texture, getTextureImageUrl } from '@/lib/api';
import { useBuildingStore, type BuildingSurface } from '@/stores/buildingStore';

interface TexturePickerProps {
  surface: BuildingSurface;
  onClose: () => void;
}

const SURFACE_LABELS: Record<string, string> = {
  frontWall: 'Front Wall',
  sideWalls: 'Side Walls',
  backWall: 'Back Wall',
  roof: 'Roof',
  foundation: 'Foundation',
  trim: 'Trim',
};

const SUGGESTED_CATEGORIES: Record<string, string[]> = {
  frontWall: ['brick', 'stone', 'stucco', 'siding', 'wood'],
  sideWalls: ['brick', 'stone', 'stucco', 'siding', 'wood'],
  backWall: ['brick', 'stone', 'stucco', 'siding', 'wood'],
  roof: ['roofing', 'metal', 'tile'],
  foundation: ['concrete', 'stone', 'brick'],
  trim: ['wood', 'metal'],
};

export function TexturePicker({ surface, onClose }: TexturePickerProps) {
  const [textures, setTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const { setTexture } = useBuildingStore();

  const suggestedCategories = SUGGESTED_CATEGORIES[surface] || [];

  useEffect(() => {
    loadTextures();
  }, [category, search]);

  async function loadTextures() {
    setLoading(true);
    try {
      const res = await getTextures({
        category: category || undefined,
        search: search || undefined,
        include_scale: true,
        limit: 50,
      });
      setTextures(res.textures);
    } catch (err) {
      console.error('Failed to load textures:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(texture: Texture) {
    setTexture(surface, texture.id.toString());
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Select Texture for {SURFACE_LABELS[surface]}
            </h2>
            <p className="text-sm text-gray-500">
              Choose from the TidKit texture library
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search textures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Suggested Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('')}
              className={`px-3 py-1 rounded-full text-sm ${
                !category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {suggestedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm capitalize ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Texture Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-500">Loading textures...</div>
            </div>
          ) : textures.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-500">No textures found</div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {textures.map((texture) => (
                <button
                  key={texture.id}
                  onClick={() => handleSelect(texture)}
                  disabled={!texture.has_access}
                  className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                    texture.has_access
                      ? 'border-transparent hover:border-blue-500 cursor-pointer'
                      : 'border-transparent opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={texture.thumbnail_url}
                      alt={texture.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-medium truncate">
                        {texture.name}
                      </p>
                      {texture.true_scale && (
                        <p className="text-white/70 text-xs">
                          {texture.true_scale.width_inches}" × {texture.true_scale.height_inches}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lock icon for non-accessible */}
                  {!texture.has_access && (
                    <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Free badge */}
                  {texture.is_free && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                      Free
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          <p>
            🔒 Locked textures require a{' '}
            <a href="http://localhost/texture-app/public/subscribe.php" target="_blank" className="text-blue-600 hover:underline">
              TidKit subscription
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
