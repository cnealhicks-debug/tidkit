/**
 * TidKit - Model Scale Presets
 * Shared across Studio and Builder
 */

export interface ModelScale {
  name: string;
  ratio: number;
  category: 'railroad' | 'wargaming' | 'dollhouse' | 'other';
  label: string;
}

export const MODEL_SCALES: ModelScale[] = [
  // Model Railroad
  { name: 'Z', ratio: 220, category: 'railroad', label: '1:220' },
  { name: 'N', ratio: 160, category: 'railroad', label: '1:160' },
  { name: 'TT', ratio: 120, category: 'railroad', label: '1:120' },
  { name: 'HO', ratio: 87, category: 'railroad', label: '1:87' },
  { name: 'S', ratio: 64, category: 'railroad', label: '1:64' },
  { name: 'O', ratio: 48, category: 'railroad', label: '1:48' },
  { name: 'G', ratio: 22.5, category: 'railroad', label: '1:22.5' },

  // Wargaming
  { name: '6mm', ratio: 285, category: 'wargaming', label: '1:285' },
  { name: '10mm', ratio: 180, category: 'wargaming', label: '1:180' },
  { name: '15mm', ratio: 100, category: 'wargaming', label: '1:100' },
  { name: '20mm', ratio: 76, category: 'wargaming', label: '1:76' },
  { name: '28mm', ratio: 56, category: 'wargaming', label: '1:56' },
  { name: '32mm', ratio: 48, category: 'wargaming', label: '1:48' },

  // Dollhouse
  { name: '1:48 (Quarter)', ratio: 48, category: 'dollhouse', label: '1:48' },
  { name: '1:24 (Half)', ratio: 24, category: 'dollhouse', label: '1:24' },
  { name: '1:12 (Standard)', ratio: 12, category: 'dollhouse', label: '1:12' },
  { name: '1:6 (Playscale)', ratio: 6, category: 'dollhouse', label: '1:6' },
];

export function getScaleByName(name: string): ModelScale | undefined {
  return MODEL_SCALES.find((s) => s.name === name);
}

export function getScalesByCategory(category: ModelScale['category']): ModelScale[] {
  return MODEL_SCALES.filter((s) => s.category === category);
}

/**
 * Calculate print size in inches for a real-world dimension at a given scale
 */
export function calculatePrintSize(
  realWorldInches: number,
  scaleRatio: number
): number {
  return realWorldInches / scaleRatio;
}

/**
 * Calculate real-world size in inches from a print dimension at a given scale
 */
export function calculateRealWorldSize(
  printInches: number,
  scaleRatio: number
): number {
  return printInches * scaleRatio;
}
