/**
 * TidKit Shared - Collection Data Service
 * Reads content from localStorage (production) or via postMessage bridge (dev).
 */

import type {
  ProjectCollectionItem,
  TextureCollectionItem,
  AnyCollectionItem,
} from '../types/collection';
import type { PtexFile } from './ptex-format';

// Storage keys (must match apps)
const PROJECTS_KEY = 'tidkit-projects';
const TEXTURES_KEY = 'tidkit-texture-library';
const PTEX_KEY = 'tidkit-ptex-presets';

// Dev bridge URLs
const BUILDER_BRIDGE = 'http://localhost:3001/collection-bridge';
const STUDIO_BRIDGE = 'http://localhost:3002/collection-bridge';

const BRIDGE_TIMEOUT = 3000;

// ---------------------------------------------------------------------------
// Cross-origin postMessage bridge (dev only)
// ---------------------------------------------------------------------------

function isDev(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function fetchCrossOriginData(
  iframeUrl: string,
  dataType: string,
): Promise<unknown> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = iframeUrl;
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, BRIDGE_TIMEOUT);

    function onMessage(event: MessageEvent) {
      if (
        event.data &&
        event.data.type === 'tidkit-collection-response' &&
        event.data.dataType === dataType
      ) {
        cleanup();
        resolve(event.data.payload);
      }
    }

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }

    window.addEventListener('message', onMessage);

    iframe.onload = () => {
      iframe.contentWindow?.postMessage(
        { type: 'tidkit-collection-request', dataType },
        '*',
      );
    };
  });
}

// ---------------------------------------------------------------------------
// Raw data readers
// ---------------------------------------------------------------------------

interface RawSavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  params: {
    dimensions: { width: number; depth: number; height: number };
    roof: { style: string };
    scale: { name: string };
    floors?: unknown[];
  };
  accessories?: unknown[];
}

interface RawLibraryTexture {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  metadata: {
    realWidth: number;
    realHeight: number;
    pixelWidth: number;
    pixelHeight: number;
    isSeamless: boolean;
  };
  createdAt: number;
}

interface RawPtexPreset {
  id: string;
  name: string;
  description: string;
  ptex: PtexFile;
  createdAt: number;
}

function readLocalJSON<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function readData<T>(
  key: string,
  bridgeUrl: string,
): Promise<T[]> {
  if (!isDev()) {
    return readLocalJSON<T>(key);
  }

  // In dev, try postMessage bridge first
  const bridgeData = await fetchCrossOriginData(bridgeUrl, key);
  if (Array.isArray(bridgeData) && bridgeData.length > 0) {
    return bridgeData as T[];
  }

  // Fallback: try reading directly (works if on same port)
  return readLocalJSON<T>(key);
}

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

function projectToCollectionItem(
  project: RawSavedProject,
): ProjectCollectionItem {
  return {
    id: project.id,
    name: project.name,
    category: 'projects',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    source: 'local',
    metadata: {
      dimensions: project.params.dimensions,
      roofStyle: project.params.roof.style,
      scale: project.params.scale.name,
      accessoryCount: project.accessories?.length ?? 0,
      floorCount: project.params.floors?.length ?? 1,
    },
  };
}

function textureToCollectionItem(
  texture: RawLibraryTexture,
): TextureCollectionItem {
  return {
    id: texture.id,
    name: texture.name,
    category: 'textures',
    thumbnailUrl: texture.thumbnailUrl,
    createdAt: texture.createdAt,
    updatedAt: texture.createdAt,
    source: 'local',
    metadata: {
      textureType: 'photo',
      textureCategory: texture.category,
      dimensions: {
        width: texture.metadata.realWidth,
        height: texture.metadata.realHeight,
      },
      pixelDimensions: {
        width: texture.metadata.pixelWidth,
        height: texture.metadata.pixelHeight,
      },
      isSeamless: texture.metadata.isSeamless,
    },
  };
}

function ptexToCollectionItem(
  preset: RawPtexPreset,
): TextureCollectionItem {
  return {
    id: preset.id,
    name: preset.name,
    category: 'textures',
    createdAt: preset.createdAt,
    updatedAt: preset.createdAt,
    source: 'local',
    metadata: {
      textureType: 'procedural',
      textureCategory: preset.ptex.type === 'brick' ? 'Brick' : 'Stone',
      proceduralType: preset.ptex.type,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listProjectItems(): Promise<ProjectCollectionItem[]> {
  const projects = await readData<RawSavedProject>(PROJECTS_KEY, BUILDER_BRIDGE);
  return projects.map(projectToCollectionItem);
}

export async function listTextureItems(): Promise<TextureCollectionItem[]> {
  const [textures, presets] = await Promise.all([
    readData<RawLibraryTexture>(TEXTURES_KEY, STUDIO_BRIDGE),
    readData<RawPtexPreset>(PTEX_KEY, STUDIO_BRIDGE),
  ]);

  return [
    ...textures.map(textureToCollectionItem),
    ...presets.map(ptexToCollectionItem),
  ];
}

export async function listAllItems(): Promise<AnyCollectionItem[]> {
  const [projects, textures] = await Promise.all([
    listProjectItems(),
    listTextureItems(),
  ]);
  return [...projects, ...textures];
}

export function deleteCollectionItem(item: AnyCollectionItem): void {
  if (item.category === 'projects') {
    const projects = readLocalJSON<RawSavedProject>(PROJECTS_KEY);
    const filtered = projects.filter((p) => p.id !== item.id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
  } else if (item.category === 'textures') {
    if (item.metadata.textureType === 'procedural') {
      const presets = readLocalJSON<RawPtexPreset>(PTEX_KEY);
      const filtered = presets.filter((p) => p.id !== item.id);
      localStorage.setItem(PTEX_KEY, JSON.stringify(filtered));
    } else {
      const textures = readLocalJSON<RawLibraryTexture>(TEXTURES_KEY);
      const filtered = textures.filter((t) => t.id !== item.id);
      localStorage.setItem(TEXTURES_KEY, JSON.stringify(filtered));
    }
  }
}

export function exportCollectionItem(item: AnyCollectionItem): void {
  if (item.category === 'projects') {
    const projects = readLocalJSON<RawSavedProject>(PROJECTS_KEY);
    const project = projects.find((p) => p.id === item.id);
    if (!project) return;

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, `${item.name.toLowerCase().replace(/\s+/g, '-')}.tidkit.json`);
  } else if (item.category === 'textures' && item.metadata.textureType === 'procedural') {
    const presets = readLocalJSON<RawPtexPreset>(PTEX_KEY);
    const preset = presets.find((p) => p.id === item.id);
    if (!preset) return;

    const json = JSON.stringify(preset.ptex, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, `${item.name.toLowerCase().replace(/\s+/g, '-')}.ptex.json`);
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Get navigation URL for an item's source app */
export function getAppUrl(
  item: AnyCollectionItem,
): string {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (item.category === 'projects') {
    const base = isLocal ? 'http://localhost:3001' : '/builder';
    return `${base}?project=${item.id}`;
  }
  const base = isLocal ? 'http://localhost:3002' : '/studio';
  return `${base}?texture=${item.id}`;
}
