/**
 * TidKit Shared - .ptex.json File Format
 * Save/load/share procedural texture configs as portable .ptex.json files.
 */

import type {
  ProceduralTextureConfig,
  ProceduralTextureType,
  BrickParams,
  StoneParams,
  WeatheringParams,
} from '../types/procedural';
import { isProceduralTexture } from '../types/procedural';

/** The .ptex.json file format */
export interface PtexFile {
  format: 'procedural-texture';
  version: 1;
  name: string;
  description: string;
  type: ProceduralTextureType;
  params: BrickParams | StoneParams;
  weathering: WeatheringParams;
  worldScale: number;
  metadata: {
    author: string;
    createdAt: string;
    tags: string[];
  };
}

/** Convert a ProceduralTextureConfig to a PtexFile JSON object */
export function configToPtex(
  config: ProceduralTextureConfig,
  name: string,
  description: string,
  author = 'TidKit User',
  tags: string[] = [],
): PtexFile {
  const params = config.type === 'brick' ? config.brick! : config.stone!;

  return {
    format: 'procedural-texture',
    version: 1,
    name,
    description,
    type: config.type,
    params,
    weathering: config.weathering,
    worldScale: config.worldScale,
    metadata: {
      author,
      createdAt: new Date().toISOString(),
      tags,
    },
  };
}

/** Convert a PtexFile back to a ProceduralTextureConfig (with validation) */
export function ptexToConfig(ptex: PtexFile): ProceduralTextureConfig {
  if (ptex.format !== 'procedural-texture') {
    throw new Error('Invalid file: not a procedural texture file');
  }
  if (ptex.version !== 1) {
    throw new Error(`Unsupported version: ${ptex.version}. Expected version 1.`);
  }
  if (ptex.type !== 'brick' && ptex.type !== 'stone') {
    throw new Error(`Unknown texture type: ${ptex.type}`);
  }

  const config: ProceduralTextureConfig = {
    type: ptex.type,
    brick: ptex.type === 'brick' ? (ptex.params as BrickParams) : undefined,
    stone: ptex.type === 'stone' ? (ptex.params as StoneParams) : undefined,
    weathering: ptex.weathering,
    worldScale: ptex.worldScale ?? 1.0,
  };

  // Final validation via type guard
  if (!isProceduralTexture(config)) {
    throw new Error('Converted config failed validation');
  }

  return config;
}

/** Export a ProceduralTextureConfig as a .ptex.json file download */
export function exportPtexFile(
  config: ProceduralTextureConfig,
  name: string,
  description = '',
): void {
  const ptex = configToPtex(config, name, description);
  const json = JSON.stringify(ptex, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.ptex.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import a .ptex.json file and return a ProceduralTextureConfig */
export function importPtexFile(file: File): Promise<ProceduralTextureConfig> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.ptex.json')) {
      reject(new Error('File must have a .ptex.json extension'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ptex = JSON.parse(reader.result as string) as PtexFile;
        const config = ptexToConfig(ptex);
        resolve(config);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse .ptex.json file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
