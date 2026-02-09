'use client';

/**
 * TidKit Builder - Floors Panel
 * Panel for configuring multi-story buildings
 */

import { useEffect } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import { calculateTotalHeight } from '@/types/building';

interface FloorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Control panel width in pixels (w-80 = 20rem = 320px)
const CONTROL_PANEL_WIDTH = 320;
const PANEL_GAP = 8;

export function FloorsPanel({ isOpen, onClose }: FloorsPanelProps) {
  const { params, setFloorCount, updateFloor, setInteriorEnabled, updateInterior } = useBuildingStore();
  const { floors, interior } = params;

  const totalHeight = calculateTotalHeight(floors);
  const storyCount = floors.length;

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed top-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden max-h-[calc(100vh-8rem)]"
      style={{ right: CONTROL_PANEL_WIDTH + PANEL_GAP }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-semibold text-gray-900 dark:text-white">Floors & Stories</h3>
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
        {/* Story Count */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Number of Stories
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFloorCount(storyCount - 1)}
              disabled={storyCount <= 1}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              -
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-gray-900">{storyCount}</span>
              <span className="text-sm text-gray-500 ml-1">
                {storyCount === 1 ? 'story' : 'stories'}
              </span>
            </div>
            <button
              onClick={() => setFloorCount(storyCount + 1)}
              disabled={storyCount >= 10}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              +
            </button>
          </div>
          <div className="mt-2 text-center text-sm text-gray-500">
            Total height: {totalHeight}' ({(totalHeight * 12 / params.scale.ratio).toFixed(2)}" at scale)
          </div>
        </div>

        {/* Quick Presets */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Quick Presets
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => setFloorCount(count)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  storyCount === count
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Floor List */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Floor Configuration
          </label>
          <div className="space-y-2">
            {floors.map((floor, index) => (
              <div
                key={floor.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {floor.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {index === 0 ? 'Ground' : `Level ${index + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Height:</label>
                  <input
                    type="number"
                    value={floor.height}
                    onChange={(e) => updateFloor(floor.id, { height: parseFloat(e.target.value) || 8 })}
                    min={6}
                    max={20}
                    step={0.5}
                    className="flex-1 px-2 py-1 text-sm border rounded"
                  />
                  <span className="text-xs text-gray-500">ft</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interior Options */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Interior Surfaces
          </label>

          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={interior.enabled}
              onChange={(e) => setInteriorEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Generate interior walls</span>
          </label>

          {interior.enabled && (
            <div className="space-y-3 pl-7">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interior.includeFloors}
                  onChange={(e) => updateInterior({ includeFloors: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Include floor panels</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interior.includeCeilings}
                  onChange={(e) => updateInterior({ includeCeilings: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Include ceiling panels</span>
              </label>
            </div>
          )}
        </div>

        {/* Visual Diagram */}
        <div className="p-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Building Preview
          </label>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex flex-col-reverse">
              {/* Roof */}
              <div className="w-full h-4 bg-red-400 rounded-t-lg border-2 border-red-500 -mb-px relative">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">Roof</span>
              </div>
              {/* Floors */}
              {floors.map((floor, index) => {
                const heightPercent = (floor.height / totalHeight) * 100;
                return (
                  <div
                    key={floor.id}
                    className="w-full border-2 border-gray-400 bg-white relative"
                    style={{ height: `${Math.max(24, heightPercent * 1.5)}px` }}
                  >
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                      {floor.name}
                    </span>
                    {/* Floor line */}
                    {index > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600" />
                    )}
                  </div>
                );
              }).reverse()}
              {/* Ground */}
              <div className="w-full h-2 bg-green-600 rounded-b" />
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Multi-story buildings generate separate wall sections for each floor in the unfolded pattern. Windows and doors can be placed on specific floors.
          </p>
        </div>
      </div>
    </div>
  );
}
