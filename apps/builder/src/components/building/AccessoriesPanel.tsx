'use client';

/**
 * TidKit Builder - Accessories Panel
 * Panel for adding architectural items, decorations, and signage
 */

import { useState, useEffect } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import {
  Accessory,
  AccessoryType,
  AccessoryCategory,
  AccessoryPosition,
  AccessoryPreset,
  ACCESSORY_PRESETS,
  AccessoryRenderMode,
} from '@/types/building';

interface AccessoriesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Control panel width in pixels (w-80 = 20rem = 320px)
const CONTROL_PANEL_WIDTH = 320;
const PANEL_GAP = 8;

const CATEGORY_INFO: Record<AccessoryCategory, { label: string; icon: string }> = {
  exterior: { label: 'Exterior', icon: '🏡' },
  structural: { label: 'Structural', icon: '🏗️' },
  decorative: { label: 'Decorative', icon: '✨' },
  signage: { label: 'Signage', icon: '🪧' },
};

const POSITION_OPTIONS: { value: AccessoryPosition; label: string }[] = [
  { value: 'wall-front', label: 'Front Wall' },
  { value: 'wall-back', label: 'Back Wall' },
  { value: 'wall-left', label: 'Left Wall' },
  { value: 'wall-right', label: 'Right Wall' },
  { value: 'roof', label: 'Roof' },
  { value: 'ground', label: 'Ground' },
  { value: 'corner', label: 'Corner' },
];

const WALL_POSITION_OPTIONS = POSITION_OPTIONS.filter(o =>
  o.value.startsWith('wall-')
);

const COLOR_SWATCHES = [
  '#DAA520', '#8B0000', '#2E5930', '#1E3A5F',
  '#333333', '#8B4513', '#555555', '#FFFFFF',
];

// Types that accept a text/label property
const TEXT_TYPES: AccessoryType[] = ['sign-flat', 'sticker-banner', 'sticker-poster'];
// house-number uses "number" property instead
const HAS_COLOR: AccessoryType[] = [
  'sign-flat', 'shutters', 'flower-box', 'sticker-banner',
  'sticker-motif', 'sticker-poster', 'sticker-vent-grill',
];

export function AccessoriesPanel({ isOpen, onClose }: AccessoriesPanelProps) {
  const { accessories, addAccessory, updateAccessory, removeAccessory, clearAccessories, params } = useBuildingStore();

  const [renderModeFilter, setRenderModeFilter] = useState<AccessoryRenderMode>('2d');
  const [selectedCategory, setSelectedCategory] = useState<AccessoryCategory | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<AccessoryPreset | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New accessory form state
  const [newAccessory, setNewAccessory] = useState<Partial<Accessory>>({
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    scale: 1,
    attachedTo: 'wall-front',
  });

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showAddForm) {
          setShowAddForm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, showAddForm, onClose]);

  const is2DMode = renderModeFilter === '2d';

  // Filter presets by mode and category
  const modePresets = ACCESSORY_PRESETS.filter(p => p.renderMode === renderModeFilter);
  const filteredPresets = selectedCategory === 'all'
    ? modePresets
    : modePresets.filter(p => p.category === selectedCategory);

  // Handle preset selection
  const handlePresetSelect = (preset: AccessoryPreset) => {
    setSelectedPreset(preset);
    setNewAccessory({
      type: preset.type,
      category: preset.category,
      name: preset.name,
      position: { x: params.dimensions.width / 2, y: 0, z: 0 },
      rotation: 0,
      scale: 1,
      attachedTo: preset.category === 'structural' ? 'roof' : 'wall-front',
      properties: { ...preset.defaultProperties },
    });
    setShowAddForm(true);
  };

  // Handle add accessory
  const handleAddAccessory = () => {
    if (!selectedPreset || !newAccessory.type) return;

    const accessory: Accessory = {
      id: `accessory-${Date.now()}`,
      type: newAccessory.type!,
      category: newAccessory.category || selectedPreset.category,
      name: newAccessory.name || selectedPreset.name,
      position: newAccessory.position || { x: 0, y: 0, z: 0 },
      rotation: newAccessory.rotation || 0,
      scale: newAccessory.scale || 1,
      attachedTo: newAccessory.attachedTo,
      properties: newAccessory.properties,
      renderMode: selectedPreset.renderMode,
    };

    addAccessory(accessory);
    setShowAddForm(false);
    setSelectedPreset(null);
    setNewAccessory({
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      scale: 1,
      attachedTo: 'wall-front',
    });
  };

  // Get building dimensions for position validation
  const { width, depth, height } = params.dimensions;

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden max-h-[calc(100vh-8rem)]"
      style={{ right: CONTROL_PANEL_WIDTH + PANEL_GAP }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-900 dark:text-white">Accessories</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-14rem)]">
        {/* Mode Toggle */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => { setRenderModeFilter('2d'); setSelectedCategory('all'); }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                renderModeFilter === '2d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Stickers
            </button>
            <button
              onClick={() => { setRenderModeFilter('3d'); setSelectedCategory('all'); }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                renderModeFilter === '3d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              3D Parts
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
            {is2DMode
              ? 'Flat graphics printed directly on walls'
              : 'Separate pieces to cut and assemble'}
          </p>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-50 dark:bg-blue-900/40 border border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {(Object.keys(CATEGORY_INFO) as AccessoryCategory[]).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  selectedCategory === category
                    ? 'bg-blue-50 dark:bg-blue-900/40 border border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{CATEGORY_INFO[category].icon}</span>
                {CATEGORY_INFO[category].label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Grid */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Add Accessory
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {filteredPresets.map((preset) => (
              <button
                key={preset.type}
                onClick={() => handlePresetSelect(preset)}
                className="p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-left transition-colors"
              >
                <div className="text-lg mb-1">{preset.icon}</div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{preset.name}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && selectedPreset && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide flex items-center gap-2">
                <span>{selectedPreset.icon}</span>
                {selectedPreset.name}
              </label>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedPreset(null);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              {/* Attached To */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Attached To</label>
                <select
                  value={newAccessory.attachedTo || 'wall-front'}
                  onChange={(e) => setNewAccessory({ ...newAccessory, attachedTo: e.target.value as AccessoryPosition })}
                  className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {(is2DMode ? WALL_POSITION_OPTIONS : POSITION_OPTIONS).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Position coordinates — 2D stickers: X/Y only; 3D parts: X/Y/Z */}
              <div className={`grid gap-2 ${is2DMode ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">X (ft)</label>
                  <input
                    type="number"
                    value={newAccessory.position?.x || 0}
                    onChange={(e) => setNewAccessory({
                      ...newAccessory,
                      position: { ...newAccessory.position!, x: parseFloat(e.target.value) || 0 }
                    })}
                    min={0}
                    max={width}
                    step={0.5}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Y (ft)</label>
                  <input
                    type="number"
                    value={newAccessory.position?.y || 0}
                    onChange={(e) => setNewAccessory({
                      ...newAccessory,
                      position: { ...newAccessory.position!, y: parseFloat(e.target.value) || 0 }
                    })}
                    min={0}
                    max={height}
                    step={0.5}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>
                {!is2DMode && (
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Z (ft)</label>
                    <input
                      type="number"
                      value={newAccessory.position?.z || 0}
                      onChange={(e) => setNewAccessory({
                        ...newAccessory,
                        position: { ...newAccessory.position!, z: parseFloat(e.target.value) || 0 }
                      })}
                      min={0}
                      max={depth}
                      step={0.5}
                      className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                )}
              </div>

              {/* Rotation (3D only) & Scale */}
              <div className={`grid gap-2 ${is2DMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!is2DMode && (
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rotation</label>
                    <select
                      value={newAccessory.rotation || 0}
                      onChange={(e) => setNewAccessory({ ...newAccessory, rotation: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    >
                      <option value={0}>0°</option>
                      <option value={90}>90°</option>
                      <option value={180}>180°</option>
                      <option value={270}>270°</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Scale</label>
                  <select
                    value={newAccessory.scale || 1}
                    onChange={(e) => setNewAccessory({ ...newAccessory, scale: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value={0.5}>50%</option>
                    <option value={0.75}>75%</option>
                    <option value={1}>100%</option>
                    <option value={1.25}>125%</option>
                    <option value={1.5}>150%</option>
                  </select>
                </div>
              </div>

              {/* Sticker-specific: Text input for sign/banner/poster types */}
              {is2DMode && TEXT_TYPES.includes(selectedPreset.type) && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Text</label>
                  <input
                    type="text"
                    value={newAccessory.properties?.text || ''}
                    onChange={(e) => setNewAccessory({
                      ...newAccessory,
                      properties: { ...newAccessory.properties, text: e.target.value }
                    })}
                    placeholder={selectedPreset.type === 'sticker-poster' ? 'WANTED' : 'SHOP'}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>
              )}

              {/* Sticker-specific: Number input for house-number */}
              {is2DMode && selectedPreset.type === 'house-number' && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Number</label>
                  <input
                    type="text"
                    value={newAccessory.properties?.number || ''}
                    onChange={(e) => setNewAccessory({
                      ...newAccessory,
                      properties: { ...newAccessory.properties, number: e.target.value }
                    })}
                    placeholder="123"
                    maxLength={6}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>
              )}

              {/* Sticker-specific: Style selector for house-number */}
              {is2DMode && selectedPreset.type === 'house-number' && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Style</label>
                  <select
                    value={newAccessory.properties?.style || 'modern'}
                    onChange={(e) => setNewAccessory({
                      ...newAccessory,
                      properties: { ...newAccessory.properties, style: e.target.value }
                    })}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                  </select>
                </div>
              )}

              {/* Sticker-specific: Shape selector for motif */}
              {is2DMode && selectedPreset.type === 'sticker-motif' && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Shape</label>
                  <select
                    value={newAccessory.properties?.shape || 'diamond'}
                    onChange={(e) => setNewAccessory({
                      ...newAccessory,
                      properties: { ...newAccessory.properties, shape: e.target.value }
                    })}
                    className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  >
                    <option value="diamond">Diamond</option>
                    <option value="star">Star</option>
                    <option value="cross">Cross</option>
                  </select>
                </div>
              )}

              {/* Sticker-specific: Color picker */}
              {is2DMode && HAS_COLOR.includes(selectedPreset.type) && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_SWATCHES.map((color) => {
                      const propKey = ['sign-flat', 'sticker-banner', 'sticker-poster'].includes(selectedPreset.type)
                        ? 'bgColor' : 'color';
                      const currentColor = newAccessory.properties?.[propKey];
                      const isSelected = currentColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => setNewAccessory({
                            ...newAccessory,
                            properties: { ...newAccessory.properties, [propKey]: color }
                          })}
                          className={`w-6 h-6 rounded border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 scale-110'
                              : 'border-gray-300 dark:border-gray-500 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom name */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={newAccessory.name || selectedPreset.name}
                  onChange={(e) => setNewAccessory({ ...newAccessory, name: e.target.value })}
                  placeholder={selectedPreset.name}
                  className="w-full px-2 py-1 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
              </div>

              {/* Add button */}
              <button
                onClick={handleAddAccessory}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Add {selectedPreset.name}
              </button>
            </div>
          </div>
        )}

        {/* Current Accessories List */}
        <div className="p-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Added Accessories ({accessories.length})
          </label>

          {accessories.length === 0 ? (
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
              <div className="text-3xl mb-2">🏠</div>
              No accessories added yet
            </div>
          ) : (
            <div className="space-y-2">
              {accessories.map((accessory) => {
                const preset = ACCESSORY_PRESETS.find(p => p.type === accessory.type);
                return (
                  <div
                    key={accessory.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span>{preset?.icon || '📦'}</span>
                        {accessory.name}
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                          accessory.renderMode === '2d'
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300'
                            : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300'
                        }`}>
                          {accessory.renderMode === '2d' ? '2D' : '3D'}
                        </span>
                      </span>
                      <button
                        onClick={() => removeAccessory(accessory.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <div>Position: ({accessory.position.x}', {accessory.position.y}', {accessory.position.z}')</div>
                      <div>Attached to: {accessory.attachedTo?.replace('-', ' ')}</div>
                      {accessory.scale !== 1 && <div>Scale: {(accessory.scale * 100).toFixed(0)}%</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear all button */}
        {accessories.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={clearAccessories}
              className="w-full px-4 py-2 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Clear All Accessories ({accessories.length})
            </button>
          </div>
        )}

        {/* Tip */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Tip:</strong>{' '}
              {is2DMode
                ? 'Stickers print directly on wall panels — no cutting or assembly required.'
                : 'Accessories appear in the 3D preview and are included in exported patterns as separate pieces to cut and assemble.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
