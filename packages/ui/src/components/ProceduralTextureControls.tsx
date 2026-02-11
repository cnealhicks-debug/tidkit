'use client';

/**
 * TidKit Shared - Procedural Texture Controls
 * Pure React parameter UI (sliders, color pickers, preset grid) with NO Three.js dependency.
 * Takes config and onChange props — headless pattern for both Builder and Studio.
 */

import { useState } from 'react';
import type {
  ProceduralTextureConfig,
  BrickBondPattern,
  StoneLayout,
  BrickParams,
  StoneParams,
  WeatheringParams,
} from '../types/procedural';
import { ALL_PRESETS, BRICK_PRESETS, STONE_PRESETS, createDefaultConfig } from '../lib/procedural-textures';

export interface ProceduralTextureControlsProps {
  config: ProceduralTextureConfig;
  onChange: (config: ProceduralTextureConfig) => void;
}

/** Deep-set a value at a dot-notation path on a config object */
function setAtPath(config: ProceduralTextureConfig, path: string, value: any): ProceduralTextureConfig {
  const updated = JSON.parse(JSON.stringify(config)) as ProceduralTextureConfig;
  const parts = path.split('.');
  let target: any = updated;
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
    if (!target) return config;
  }
  target[parts[parts.length - 1]] = value;
  return updated;
}

export function ProceduralTextureControls({ config, onChange }: ProceduralTextureControlsProps) {
  const [typeFilter, setTypeFilter] = useState<'brick' | 'stone'>(config.type);
  const [showWeathering, setShowWeathering] = useState(config.weathering.enabled);

  const filteredPresets = typeFilter === 'brick' ? BRICK_PRESETS : STONE_PRESETS;

  const handleApplyPreset = (presetConfig: ProceduralTextureConfig) => {
    onChange(JSON.parse(JSON.stringify(presetConfig)));
  };

  const handleSetType = (type: 'brick' | 'stone') => {
    setTypeFilter(type);
    if (config.type !== type) {
      onChange(createDefaultConfig(type));
    }
  };

  const updateParam = (path: string, value: any) => {
    onChange(setAtPath(config, path, value));
  };

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Texture Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSetType('brick')}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              typeFilter === 'brick'
                ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-300'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            Brick
          </button>
          <button
            onClick={() => handleSetType('stone')}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              typeFilter === 'stone'
                ? 'bg-gray-100 dark:bg-gray-600 border-gray-500 text-gray-700 dark:text-gray-200'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            Stone
          </button>
        </div>
      </div>

      {/* Preset grid */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Presets
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.config)}
              className={`px-2 py-2 text-xs rounded-lg border text-left transition-colors ${
                JSON.stringify(config) === JSON.stringify(preset.config)
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="block font-medium truncate">{preset.name}</span>
              <span className="block text-gray-400 dark:text-gray-500 truncate text-[10px]">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pattern parameters */}
      {config.type === 'brick' && config.brick && (
        <BrickControls brick={config.brick} updateParam={updateParam} />
      )}
      {config.type === 'stone' && config.stone && (
        <StoneControls stone={config.stone} updateParam={updateParam} />
      )}

      {/* Weathering section */}
      <div>
        <button
          onClick={() => setShowWeathering(!showWeathering)}
          className="flex items-center justify-between w-full text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide py-1"
        >
          <span>Weathering</span>
          <span className="text-gray-400">{showWeathering ? '\u2212' : '+'}</span>
        </button>
        {showWeathering && (
          <WeatheringControls weathering={config.weathering} updateParam={updateParam} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Brick Controls
// =============================================================================

function BrickControls({ brick, updateParam }: { brick: BrickParams; updateParam: (path: string, value: any) => void }) {
  const bondPatterns: { value: BrickBondPattern; label: string }[] = [
    { value: 'running', label: 'Running' },
    { value: 'stack', label: 'Stack' },
    { value: 'stretcher', label: 'Stretcher' },
    { value: 'flemish', label: 'Flemish' },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Brick Pattern
      </label>

      {/* Bond pattern */}
      <div>
        <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1">Bond Pattern</label>
        <div className="grid grid-cols-4 gap-1">
          {bondPatterns.map((bp) => (
            <button
              key={bp.value}
              onClick={() => updateParam('brick.bondPattern', bp.value)}
              className={`px-1 py-1 text-[10px] rounded border ${
                brick.bondPattern === bp.value
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              {bp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <SliderControl label="Brick Width" value={brick.brickWidth} min={4} max={16} step={0.25} unit='"'
        onChange={(v) => updateParam('brick.brickWidth', v)} />
      <SliderControl label="Brick Height" value={brick.brickHeight} min={1} max={6} step={0.25} unit='"'
        onChange={(v) => updateParam('brick.brickHeight', v)} />
      <SliderControl label="Mortar Width" value={brick.mortarWidth} min={0.1} max={1} step={0.025} unit='"'
        onChange={(v) => updateParam('brick.mortarWidth', v)} />
      <SliderControl label="Mortar Depth" value={brick.mortarDepth} min={0} max={1} step={0.05}
        onChange={(v) => updateParam('brick.mortarDepth', v)} />

      {/* Colors */}
      <div className="grid grid-cols-3 gap-2">
        <ColorControl label="Brick A" value={brick.brickColorA}
          onChange={(v) => updateParam('brick.brickColorA', v)} />
        <ColorControl label="Brick B" value={brick.brickColorB}
          onChange={(v) => updateParam('brick.brickColorB', v)} />
        <ColorControl label="Mortar" value={brick.mortarColor}
          onChange={(v) => updateParam('brick.mortarColor', v)} />
      </div>

      {/* Surface properties */}
      <SliderControl label="Color Variation" value={brick.colorVariation} min={0} max={1} step={0.05}
        onChange={(v) => updateParam('brick.colorVariation', v)} />
      <SliderControl label="Brick Roughness" value={brick.brickRoughness} min={0} max={1} step={0.05}
        onChange={(v) => updateParam('brick.brickRoughness', v)} />
    </div>
  );
}

// =============================================================================
// Stone Controls
// =============================================================================

function StoneControls({ stone, updateParam }: { stone: StoneParams; updateParam: (path: string, value: any) => void }) {
  const layouts: { value: StoneLayout; label: string }[] = [
    { value: 'coursed', label: 'Coursed' },
    { value: 'random', label: 'Random' },
    { value: 'cobblestone', label: 'Cobble' },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Stone Pattern
      </label>

      {/* Layout */}
      <div>
        <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1">Layout</label>
        <div className="grid grid-cols-3 gap-1">
          {layouts.map((l) => (
            <button
              key={l.value}
              onClick={() => updateParam('stone.layout', l.value)}
              className={`px-2 py-1 text-[10px] rounded border ${
                stone.layout === l.value
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <SliderControl label="Stone Size" value={stone.stoneSize} min={4} max={24} step={1} unit='"'
        onChange={(v) => updateParam('stone.stoneSize', v)} />
      <SliderControl label="Size Variation" value={stone.sizeVariation} min={0} max={1} step={0.05}
        onChange={(v) => updateParam('stone.sizeVariation', v)} />
      <SliderControl label="Mortar Width" value={stone.mortarWidth} min={0.1} max={1.5} step={0.05} unit='"'
        onChange={(v) => updateParam('stone.mortarWidth', v)} />

      {/* Colors */}
      <div className="grid grid-cols-2 gap-2">
        <ColorControl label="Stone A" value={stone.stoneColorA}
          onChange={(v) => updateParam('stone.stoneColorA', v)} />
        <ColorControl label="Stone B" value={stone.stoneColorB}
          onChange={(v) => updateParam('stone.stoneColorB', v)} />
        <ColorControl label="Stone C" value={stone.stoneColorC}
          onChange={(v) => updateParam('stone.stoneColorC', v)} />
        <ColorControl label="Mortar" value={stone.mortarColor}
          onChange={(v) => updateParam('stone.mortarColor', v)} />
      </div>

      {/* Surface properties */}
      <SliderControl label="Roughness" value={stone.surfaceRoughness} min={0} max={1} step={0.05}
        onChange={(v) => updateParam('stone.surfaceRoughness', v)} />
      <SliderControl label="Grain" value={stone.grainIntensity} min={0} max={1} step={0.05}
        onChange={(v) => updateParam('stone.grainIntensity', v)} />
    </div>
  );
}

// =============================================================================
// Weathering Controls
// =============================================================================

function WeatheringControls({ weathering, updateParam }: { weathering: WeatheringParams; updateParam: (path: string, value: any) => void }) {
  return (
    <div className="space-y-3 mt-2">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={weathering.enabled}
          onChange={(e) => updateParam('weathering.enabled', e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
        />
        <span className="text-xs text-gray-600 dark:text-gray-300">Enable Weathering</span>
      </label>

      {weathering.enabled && (
        <>
          <div className="flex items-center gap-2">
            <SliderControl label="Dirt" value={weathering.dirtIntensity} min={0} max={1} step={0.05}
              onChange={(v) => updateParam('weathering.dirtIntensity', v)} />
            <ColorControl label="" value={weathering.dirtColor} small
              onChange={(v) => updateParam('weathering.dirtColor', v)} />
          </div>
          <SliderControl label="Water Stains" value={weathering.waterStainIntensity} min={0} max={1} step={0.05}
            onChange={(v) => updateParam('weathering.waterStainIntensity', v)} />
          <div className="flex items-center gap-2">
            <SliderControl label="Moss" value={weathering.mossIntensity} min={0} max={1} step={0.05}
              onChange={(v) => updateParam('weathering.mossIntensity', v)} />
            <ColorControl label="" value={weathering.mossColor} small
              onChange={(v) => updateParam('weathering.mossColor', v)} />
          </div>
          <SliderControl label="Aging" value={weathering.ageFactor} min={0} max={1} step={0.05}
            onChange={(v) => updateParam('weathering.ageFactor', v)} />
          <SliderControl label="Edge Wear" value={weathering.edgeWearIntensity} min={0} max={1} step={0.05}
            onChange={(v) => updateParam('weathering.edgeWearIntensity', v)} />
        </>
      )}
    </div>
  );
}

// =============================================================================
// Shared Controls
// =============================================================================

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] text-gray-400 dark:text-gray-500">{label}</label>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}{unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  small,
  onChange,
}: {
  label: string;
  value: string;
  small?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={small ? 'flex-shrink-0' : ''}>
      {label && <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">{label}</label>}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${small ? 'w-6 h-6' : 'w-full h-7'} rounded border border-gray-200 dark:border-gray-600 cursor-pointer`}
      />
    </div>
  );
}
