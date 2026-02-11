/**
 * TidKit Builder - Project Save/Load
 * Dual-layer persistence:
 *  - localStorage for fast offline access
 *  - Cloud providers (Google Drive, iCloud) via /api/projects route
 */

import type { BuildingParams, Accessory, AccessoryType } from '@/types/building';
import { DEFAULT_2D_TYPES } from '@/types/building';
import type { ExtendedTextureAssignment } from '@/stores/buildingStore';

const STORAGE_KEY = 'tidkit-projects';

/** Migrate accessories from older saves that lack renderMode */
function migrateAccessory(accessory: Accessory): Accessory {
  if (accessory.renderMode) return accessory;
  return {
    ...accessory,
    renderMode: DEFAULT_2D_TYPES.includes(accessory.type) ? '2d' : '3d',
  };
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  params: BuildingParams;
  textures: ExtendedTextureAssignment;
  accessories: Accessory[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function listProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const projects = JSON.parse(raw) as SavedProject[];
    // Migrate accessories from older saves
    for (const p of projects) {
      p.accessories = p.accessories.map(migrateAccessory);
    }
    return projects;
  } catch {
    return [];
  }
}

export function saveProject(
  name: string,
  params: BuildingParams,
  textures: ExtendedTextureAssignment,
  accessories: Accessory[],
  existingId?: string,
): SavedProject {
  const projects = listProjects();
  const now = Date.now();

  if (existingId) {
    const idx = projects.findIndex((p) => p.id === existingId);
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], name, params, textures, accessories, updatedAt: now };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return projects[idx];
    }
  }

  const project: SavedProject = {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    params,
    textures,
    accessories,
  };
  projects.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return project;
}

export function deleteProject(id: string): void {
  const projects = listProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function importProjectFromJSON(json: string): SavedProject {
  const parsed = JSON.parse(json);
  if (!parsed.params || !parsed.name) {
    throw new Error('Invalid project file');
  }
  return {
    id: generateId(),
    name: parsed.name,
    createdAt: parsed.createdAt || Date.now(),
    updatedAt: Date.now(),
    params: parsed.params,
    textures: parsed.textures || {},
    accessories: parsed.accessories || [],
  };
}

export function downloadProject(project: SavedProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.tidkit.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Cloud storage helpers (Google Drive / iCloud via /api/projects)
// =============================================================================

export interface CloudProject {
  fileId: string;
  name: string;
  size: number;
  updatedAt: string;
  createdAt: string;
}

export async function listCloudProjects(
  provider: string,
  userId: string,
): Promise<CloudProject[]> {
  const res = await fetch(
    `/api/projects?provider=${encodeURIComponent(provider)}&userId=${encodeURIComponent(userId)}`,
  );
  if (!res.ok) throw new Error('Failed to list cloud projects');
  const data = await res.json();
  return data.projects || [];
}

export async function saveCloudProject(
  provider: string,
  userId: string,
  name: string,
  params: BuildingParams,
  textures: ExtendedTextureAssignment,
  accessories: Accessory[],
): Promise<{ fileId: string }> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      userId,
      name,
      data: { params, textures, accessories },
    }),
  });
  if (!res.ok) throw new Error('Failed to save to cloud');
  return res.json();
}

export async function loadCloudProject(
  provider: string,
  userId: string,
  fileId: string,
): Promise<SavedProject> {
  const res = await fetch(
    `/api/projects?provider=${encodeURIComponent(provider)}&userId=${encodeURIComponent(userId)}&fileId=${encodeURIComponent(fileId)}`,
  );
  if (!res.ok) throw new Error('Failed to load cloud project');
  const data = await res.json();
  return {
    id: fileId,
    name: data.name || 'Untitled',
    createdAt: Date.parse(data.createdAt || data.savedAt) || Date.now(),
    updatedAt: Date.parse(data.savedAt) || Date.now(),
    params: data.params,
    textures: data.textures || {},
    accessories: data.accessories || [],
  };
}

export async function deleteCloudProject(
  provider: string,
  userId: string,
  fileId: string,
): Promise<void> {
  const res = await fetch(
    `/api/projects?provider=${encodeURIComponent(provider)}&userId=${encodeURIComponent(userId)}&fileId=${encodeURIComponent(fileId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete cloud project');
}
