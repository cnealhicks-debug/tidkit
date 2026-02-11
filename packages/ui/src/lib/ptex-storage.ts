/**
 * TidKit Shared - Ptex Preset LocalStorage Persistence
 * Browse and manage saved .ptex.json procedural texture presets
 */

import type { PtexFile } from './ptex-format';

const STORAGE_KEY = 'tidkit-ptex-presets';

export interface StoredPtexPreset {
  id: string;
  name: string;
  description: string;
  ptex: PtexFile;
  createdAt: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function savePtexPreset(
  name: string,
  description: string,
  ptex: PtexFile,
): StoredPtexPreset {
  const preset: StoredPtexPreset = {
    id: generateId(),
    name,
    description,
    ptex,
    createdAt: Date.now(),
  };

  const existing = listPtexPresets();
  existing.unshift(preset);

  // Keep latest 50 presets
  const trimmed = existing.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

  return preset;
}

export function listPtexPresets(): StoredPtexPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deletePtexPreset(id: string): void {
  const presets = listPtexPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
