/**
 * TidKit Builder - Cloud Projects API
 * Bridges client save/load requests to the storage package providers
 * (Google Drive, iCloud, Vercel Blob).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorageManager } from '@tidkit/storage';
import type { StorageProviderType } from '@tidkit/storage';

const PROJECTS_FOLDER = 'projects';
const MIME_TYPE = 'application/json';

function getProvider(providerType: string) {
  const manager = getStorageManager();
  const type = providerType.toUpperCase() as StorageProviderType;
  return manager.getProvider(type);
}

/**
 * GET /api/projects?provider=GOOGLE_DRIVE&userId=...
 * List saved projects from cloud storage.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const providerType = searchParams.get('provider') || 'LOCAL';
  const userId = searchParams.get('userId');
  const fileId = searchParams.get('fileId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const provider = getProvider(providerType);

    // If fileId is specified, download that specific project
    if (fileId) {
      const buffer = await provider.download(userId, fileId);
      const json = JSON.parse(buffer.toString('utf-8'));
      return NextResponse.json(json);
    }

    // Otherwise list all projects
    const result = await provider.listFiles(userId, {
      folder: PROJECTS_FOLDER,
    });

    return NextResponse.json({
      projects: result.files.map((f) => ({
        fileId: f.id,
        name: f.name.replace(/\.tidkit\.json$/, ''),
        size: f.size,
        updatedAt: f.updatedAt.toISOString(),
        createdAt: f.createdAt.toISOString(),
      })),
      hasMore: result.hasMore,
      cursor: result.cursor,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list projects' }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * Save a project to cloud storage.
 * Body: { provider, userId, name, data: { params, textures, accessories } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider: providerType = 'LOCAL', userId, name, data } = body;

    if (!userId || !name || !data) {
      return NextResponse.json({ error: 'userId, name, and data required' }, { status: 400 });
    }

    const provider = getProvider(providerType);
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.tidkit.json`;
    const content = JSON.stringify({ name, ...data, savedAt: new Date().toISOString() });
    const buffer = Buffer.from(content, 'utf-8');

    const file = await provider.upload(userId, buffer, {
      folder: PROJECTS_FOLDER,
      filename,
      mimeType: MIME_TYPE,
      metadata: { projectName: name },
    });

    return NextResponse.json({
      fileId: file.id,
      name,
      url: file.url,
      updatedAt: file.updatedAt.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save project' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects?provider=GOOGLE_DRIVE&userId=...&fileId=...
 * Delete a project from cloud storage.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const providerType = searchParams.get('provider') || 'LOCAL';
  const userId = searchParams.get('userId');
  const fileId = searchParams.get('fileId');

  if (!userId || !fileId) {
    return NextResponse.json({ error: 'userId and fileId required' }, { status: 400 });
  }

  try {
    const provider = getProvider(providerType);
    await provider.delete(userId, fileId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete project' }, { status: 500 });
  }
}
