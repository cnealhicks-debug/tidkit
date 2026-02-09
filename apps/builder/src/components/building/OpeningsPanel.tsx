'use client';

/**
 * TidKit Builder - Openings Panel
 * Panel for adding and managing windows and doors
 */

import { useState, useEffect } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import { Opening, OPENING_PRESETS } from '@/types/building';

type WallSide = 'front' | 'back' | 'left' | 'right';

interface OpeningsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Control panel width in pixels (w-80 = 20rem = 320px)
const CONTROL_PANEL_WIDTH = 320;
const PANEL_GAP = 8;

export function OpeningsPanel({ isOpen, onClose }: OpeningsPanelProps) {
  const { params, addOpening, updateOpening, removeOpening, clearOpenings } = useBuildingStore();
  const { openings, dimensions, floors } = params;

  const [selectedWall, setSelectedWall] = useState<WallSide>('front');
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New opening form state
  const [newOpening, setNewOpening] = useState<Partial<Opening>>({
    type: 'window',
    floor: 0,
    x: 5,
    y: 3,
    width: 3,
    height: 4,
  });

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Get wall dimensions based on selected wall and floor
  const getWallDimensions = (wall: WallSide, floorIndex: number) => {
    const floor = floors[floorIndex];
    const floorHeight = floor?.height || dimensions.height;
    if (wall === 'front' || wall === 'back') {
      return { width: dimensions.width, height: floorHeight };
    }
    return { width: dimensions.depth, height: floorHeight };
  };

  const wallDims = getWallDimensions(selectedWall, selectedFloor);

  // Filter openings for selected wall and floor
  const wallOpenings = openings.filter(o => o.wall === selectedWall && o.floor === selectedFloor);

  // Handle preset selection
  const handlePresetSelect = (preset: typeof OPENING_PRESETS[0]) => {
    setNewOpening({
      type: preset.type,
      x: Math.min(5, wallDims.width - preset.width - 1),
      y: preset.y,
      width: preset.width,
      height: preset.height,
    });
    setShowAddForm(true);
  };

  // Handle add opening
  const handleAddOpening = () => {
    if (!newOpening.type || !newOpening.width || !newOpening.height) return;

    const opening: Opening = {
      id: `opening-${Date.now()}`,
      type: newOpening.type,
      wall: selectedWall,
      floor: selectedFloor,
      x: newOpening.x || 0,
      y: newOpening.y || 0,
      width: newOpening.width,
      height: newOpening.height,
      label: newOpening.label,
    };

    addOpening(opening);
    setShowAddForm(false);
    setNewOpening({
      type: 'window',
      floor: selectedFloor,
      x: 5,
      y: 3,
      width: 3,
      height: 4,
    });
  };

  // Handle update opening
  const handleUpdateOpening = (id: string, updates: Partial<Opening>) => {
    updateOpening(id, updates);
  };

  // Validate opening position
  const validatePosition = (opening: Partial<Opening>): string[] => {
    const errors: string[] = [];
    const x = opening.x || 0;
    const y = opening.y || 0;
    const w = opening.width || 0;
    const h = opening.height || 0;

    if (x < 0) errors.push('X must be positive');
    if (y < 0) errors.push('Y must be positive');
    if (x + w > wallDims.width) errors.push('Opening extends past wall width');
    if (y + h > wallDims.height) errors.push('Opening extends past wall height');

    return errors;
  };

  const validationErrors = validatePosition(newOpening);

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden max-h-[calc(100vh-8rem)]"
      style={{ right: CONTROL_PANEL_WIDTH + PANEL_GAP }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-900 dark:text-white">Windows & Doors</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-14rem)]">
        {/* Wall selector */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Select Wall
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['front', 'back', 'left', 'right'] as WallSide[]).map((wall) => {
              const wallCount = openings.filter(o => o.wall === wall).length;
              return (
                <button
                  key={wall}
                  onClick={() => setSelectedWall(wall)}
                  className={`relative px-2 py-2 text-xs rounded border transition-colors capitalize ${
                    selectedWall === wall
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {wall}
                  {wallCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full text-[10px] flex items-center justify-center">
                      {wallCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Wall size: {wallDims.width}' W × {wallDims.height}' H
          </div>
        </div>

        {/* Quick add presets */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Quick Add
          </label>
          <div className="grid grid-cols-2 gap-2">
            {OPENING_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded text-left"
              >
                <span className="block font-medium text-gray-700">{preset.name}</span>
                <span className="text-gray-500">{preset.width}' × {preset.height}'</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add custom opening form */}
        {showAddForm && (
          <div className="p-4 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                New Opening
              </label>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              {/* Type selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNewOpening({ ...newOpening, type: 'window' })}
                  className={`flex-1 px-3 py-2 text-xs rounded ${
                    newOpening.type === 'window'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  Window
                </button>
                <button
                  onClick={() => setNewOpening({ ...newOpening, type: 'door', y: 0 })}
                  className={`flex-1 px-3 py-2 text-xs rounded ${
                    newOpening.type === 'door'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  Door
                </button>
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">X Position (ft)</label>
                  <input
                    type="number"
                    value={newOpening.x || 0}
                    onChange={(e) => setNewOpening({ ...newOpening, x: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={wallDims.width}
                    step={0.5}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Y Position (ft)</label>
                  <input
                    type="number"
                    value={newOpening.y || 0}
                    onChange={(e) => setNewOpening({ ...newOpening, y: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={wallDims.height}
                    step={0.5}
                    disabled={newOpening.type === 'door'}
                    className="w-full px-2 py-1 text-sm border rounded disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Width (ft)</label>
                  <input
                    type="number"
                    value={newOpening.width || 0}
                    onChange={(e) => setNewOpening({ ...newOpening, width: parseFloat(e.target.value) || 0 })}
                    min={0.5}
                    max={wallDims.width}
                    step={0.5}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height (ft)</label>
                  <input
                    type="number"
                    value={newOpening.height || 0}
                    onChange={(e) => setNewOpening({ ...newOpening, height: parseFloat(e.target.value) || 0 })}
                    min={0.5}
                    max={wallDims.height}
                    step={0.5}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={newOpening.label || ''}
                  onChange={(e) => setNewOpening({ ...newOpening, label: e.target.value })}
                  placeholder="e.g., Main Entry"
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="p-2 bg-red-100 rounded text-xs text-red-700">
                  {validationErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              {/* Add button */}
              <button
                onClick={handleAddOpening}
                disabled={validationErrors.length > 0}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to {selectedWall} wall
              </button>
            </div>
          </div>
        )}

        {/* Add custom button */}
        {!showAddForm && (
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 text-sm rounded-lg hover:border-blue-500 hover:text-blue-600"
            >
              + Add Custom Opening
            </button>
          </div>
        )}

        {/* Existing openings list */}
        <div className="p-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {selectedWall} Wall Openings ({wallOpenings.length})
          </label>

          {wallOpenings.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-4">
              No openings on this wall
            </div>
          ) : (
            <div className="space-y-2">
              {wallOpenings.map((opening) => (
                <div
                  key={opening.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      opening.type === 'door'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {opening.type}
                    </span>
                    <button
                      onClick={() => removeOpening(opening.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      <strong>Position:</strong> {opening.x}', {opening.y}' from bottom-left
                    </div>
                    <div>
                      <strong>Size:</strong> {opening.width}' W × {opening.height}' H
                    </div>
                    {opening.label && (
                      <div>
                        <strong>Label:</strong> {opening.label}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear all button */}
        {openings.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={clearOpenings}
              className="w-full px-4 py-2 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
            >
              Clear All Openings ({openings.length})
            </button>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            <strong>Tip:</strong> Openings appear as cutouts in the unfolded pattern. Position is measured from the bottom-left corner of each wall.
          </p>
        </div>
      </div>
    </div>
  );
}
