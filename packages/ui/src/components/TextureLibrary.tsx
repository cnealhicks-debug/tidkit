'use client';

/**
 * TidKit Shared Texture Library Component
 * Displays saved textures with categories, search, and actions
 * Used by both Studio and Builder apps
 */

import { useState, useEffect } from 'react';

export interface LibraryTexture {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  fullUrl: string;
  metadata: {
    realWidth: number;
    realHeight: number;
    pixelWidth: number;
    pixelHeight: number;
    isSeamless: boolean;
  };
  createdAt: number;
  isSample?: boolean;
}

export interface TextureLibraryProps {
  onSelect: (texture: LibraryTexture) => void;
  onClose?: () => void;
  mode?: 'modal' | 'panel';
  showSamples?: boolean;
  selectedCategory?: string;
}

// Sample textures for first-time users
const SAMPLE_TEXTURES: LibraryTexture[] = [
  {
    id: 'sample-brick-red',
    name: 'Red Brick',
    category: 'Brick',
    thumbnailUrl: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect fill="#8B4513" width="100" height="100"/>
        <rect fill="#A0522D" x="2" y="2" width="45" height="20" rx="1"/>
        <rect fill="#A0522D" x="52" y="2" width="45" height="20" rx="1"/>
        <rect fill="#A0522D" x="2" y="27" width="20" height="20" rx="1"/>
        <rect fill="#A0522D" x="27" y="27" width="45" height="20" rx="1"/>
        <rect fill="#A0522D" x="77" y="27" width="20" height="20" rx="1"/>
        <rect fill="#A0522D" x="2" y="52" width="45" height="20" rx="1"/>
        <rect fill="#A0522D" x="52" y="52" width="45" height="20" rx="1"/>
        <rect fill="#A0522D" x="2" y="77" width="20" height="20" rx="1"/>
        <rect fill="#A0522D" x="27" y="77" width="45" height="20" rx="1"/>
        <rect fill="#A0522D" x="77" y="77" width="20" height="20" rx="1"/>
      </svg>
    `),
    fullUrl: '',
    metadata: { realWidth: 24, realHeight: 24, pixelWidth: 512, pixelHeight: 512, isSeamless: true },
    createdAt: Date.now(),
    isSample: true,
  },
  {
    id: 'sample-wood-planks',
    name: 'Wood Planks',
    category: 'Wood',
    thumbnailUrl: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect fill="#DEB887" width="100" height="100"/>
        <rect fill="#D2B48C" x="0" y="0" width="100" height="12"/>
        <rect fill="#C4A67C" x="0" y="14" width="100" height="12"/>
        <rect fill="#DEB887" x="0" y="28" width="100" height="12"/>
        <rect fill="#D2B48C" x="0" y="42" width="100" height="12"/>
        <rect fill="#C4A67C" x="0" y="56" width="100" height="12"/>
        <rect fill="#DEB887" x="0" y="70" width="100" height="12"/>
        <rect fill="#D2B48C" x="0" y="84" width="100" height="12"/>
        <line x1="30" y1="0" x2="30" y2="12" stroke="#8B7355" stroke-width="0.5"/>
        <line x1="70" y1="14" x2="70" y2="26" stroke="#8B7355" stroke-width="0.5"/>
        <line x1="45" y1="28" x2="45" y2="40" stroke="#8B7355" stroke-width="0.5"/>
      </svg>
    `),
    fullUrl: '',
    metadata: { realWidth: 12, realHeight: 12, pixelWidth: 512, pixelHeight: 512, isSeamless: true },
    createdAt: Date.now(),
    isSample: true,
  },
  {
    id: 'sample-roof-shingles',
    name: 'Roof Shingles',
    category: 'Roof',
    thumbnailUrl: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect fill="#4A4A4A" width="100" height="100"/>
        <g fill="#5A5A5A">
          <rect x="0" y="0" width="18" height="12" rx="0 0 2 2"/>
          <rect x="20" y="0" width="18" height="12"/>
          <rect x="40" y="0" width="18" height="12"/>
          <rect x="60" y="0" width="18" height="12"/>
          <rect x="80" y="0" width="18" height="12"/>
        </g>
        <g fill="#555">
          <rect x="10" y="14" width="18" height="12"/>
          <rect x="30" y="14" width="18" height="12"/>
          <rect x="50" y="14" width="18" height="12"/>
          <rect x="70" y="14" width="18" height="12"/>
          <rect x="90" y="14" width="8" height="12"/>
        </g>
        <g fill="#5A5A5A">
          <rect x="0" y="28" width="18" height="12"/>
          <rect x="20" y="28" width="18" height="12"/>
          <rect x="40" y="28" width="18" height="12"/>
          <rect x="60" y="28" width="18" height="12"/>
          <rect x="80" y="28" width="18" height="12"/>
        </g>
        <g fill="#555">
          <rect x="10" y="42" width="18" height="12"/>
          <rect x="30" y="42" width="18" height="12"/>
          <rect x="50" y="42" width="18" height="12"/>
          <rect x="70" y="42" width="18" height="12"/>
        </g>
        <g fill="#5A5A5A">
          <rect x="0" y="56" width="18" height="12"/>
          <rect x="20" y="56" width="18" height="12"/>
          <rect x="40" y="56" width="18" height="12"/>
          <rect x="60" y="56" width="18" height="12"/>
          <rect x="80" y="56" width="18" height="12"/>
        </g>
        <g fill="#555">
          <rect x="10" y="70" width="18" height="12"/>
          <rect x="30" y="70" width="18" height="12"/>
          <rect x="50" y="70" width="18" height="12"/>
          <rect x="70" y="70" width="18" height="12"/>
        </g>
        <g fill="#5A5A5A">
          <rect x="0" y="84" width="18" height="12"/>
          <rect x="20" y="84" width="18" height="12"/>
          <rect x="40" y="84" width="18" height="12"/>
          <rect x="60" y="84" width="18" height="12"/>
          <rect x="80" y="84" width="18" height="12"/>
        </g>
      </svg>
    `),
    fullUrl: '',
    metadata: { realWidth: 36, realHeight: 36, pixelWidth: 512, pixelHeight: 512, isSeamless: true },
    createdAt: Date.now(),
    isSample: true,
  },
  {
    id: 'sample-stone-wall',
    name: 'Stone Wall',
    category: 'Stone',
    thumbnailUrl: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect fill="#808080" width="100" height="100"/>
        <rect fill="#909090" x="2" y="2" width="30" height="25" rx="3"/>
        <rect fill="#858585" x="35" y="2" width="25" height="18" rx="2"/>
        <rect fill="#9A9A9A" x="63" y="2" width="35" height="22" rx="3"/>
        <rect fill="#8A8A8A" x="2" y="30" width="20" height="20" rx="2"/>
        <rect fill="#959595" x="25" y="23" width="35" height="30" rx="3"/>
        <rect fill="#878787" x="63" y="27" width="35" height="25" rx="3"/>
        <rect fill="#929292" x="2" y="53" width="28" height="22" rx="2"/>
        <rect fill="#888888" x="33" y="56" width="30" height="18" rx="2"/>
        <rect fill="#9A9A9A" x="66" y="55" width="32" height="20" rx="3"/>
        <rect fill="#858585" x="2" y="78" width="35" height="20" rx="2"/>
        <rect fill="#909090" x="40" y="77" width="25" height="21" rx="2"/>
        <rect fill="#8A8A8A" x="68" y="78" width="30" height="20" rx="3"/>
      </svg>
    `),
    fullUrl: '',
    metadata: { realWidth: 48, realHeight: 48, pixelWidth: 512, pixelHeight: 512, isSeamless: true },
    createdAt: Date.now(),
    isSample: true,
  },
];

const CATEGORIES = ['All', 'Recent', 'Brick', 'Wood', 'Roof', 'Stone', 'Siding', 'Metal', 'Other'];

// Storage key for textures
const STORAGE_KEY = 'tidkit-texture-library';

export function TextureLibrary({
  onSelect,
  onClose,
  mode = 'modal',
  showSamples = true,
  selectedCategory: initialCategory = 'All'
}: TextureLibraryProps) {
  const [textures, setTextures] = useState<LibraryTexture[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load textures from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const userTextures: LibraryTexture[] = stored ? JSON.parse(stored) : [];

      // Combine user textures with samples if enabled
      const allTextures = showSamples
        ? [...userTextures, ...SAMPLE_TEXTURES]
        : userTextures;

      setTextures(allTextures);
    } catch (err) {
      console.error('Failed to load texture library:', err);
      setTextures(showSamples ? SAMPLE_TEXTURES : []);
    }
    setIsLoading(false);
  }, [showSamples]);

  // Filter textures
  const filteredTextures = textures.filter((texture) => {
    // Category filter
    if (category === 'Recent') {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (texture.createdAt < oneWeekAgo) return false;
    } else if (category !== 'All' && texture.category !== category) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        texture.name.toLowerCase().includes(query) ||
        texture.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Sort by date (newest first), samples at the end
  const sortedTextures = [...filteredTextures].sort((a, b) => {
    if (a.isSample && !b.isSample) return 1;
    if (!a.isSample && b.isSample) return -1;
    return b.createdAt - a.createdAt;
  });

  const handleDelete = (id: string) => {
    if (!confirm('Delete this texture from your library?')) return;

    const updated = textures.filter((t) => t.id !== id && !t.isSample);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.filter(t => !t.isSample)));
    setTextures(showSamples ? [...updated, ...SAMPLE_TEXTURES] : updated);
  };

  const content = (
    <div className={`flex flex-col ${mode === 'modal' ? 'h-[80vh]' : 'h-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Texture Library</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="p-4 space-y-3 border-b border-gray-100">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search textures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Texture grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : sortedTextures.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No textures found</p>
            <p className="text-xs text-gray-400 mt-1">Create textures in Studio to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sortedTextures.map((texture) => (
              <div
                key={texture.id}
                className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelect(texture)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100">
                  <img
                    src={texture.thumbnailUrl}
                    alt={texture.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{texture.name}</p>
                  <p className="text-xs text-gray-500">{texture.category}</p>
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {texture.isSample && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
                      Sample
                    </span>
                  )}
                  {texture.metadata.isSeamless && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
                      Seamless
                    </span>
                  )}
                </div>

                {/* Delete button (not for samples) */}
                {!texture.isSample && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(texture.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {sortedTextures.length} texture{sortedTextures.length !== 1 ? 's' : ''} •
          Create more in <a href="http://localhost:3002" className="text-blue-600 hover:underline">Studio</a>
        </p>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return <div className="h-full bg-white">{content}</div>;
}

// Utility function to save a texture to the library
export function saveTextureToLibrary(texture: Omit<LibraryTexture, 'id' | 'createdAt'>): LibraryTexture {
  const newTexture: LibraryTexture = {
    ...texture,
    id: `texture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const existing: LibraryTexture[] = stored ? JSON.parse(stored) : [];
    existing.unshift(newTexture);

    // Keep only the latest 100 textures
    const trimmed = existing.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save texture to library:', err);
  }

  return newTexture;
}

// Utility to get all textures from library
export function getTexturesFromLibrary(): LibraryTexture[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
