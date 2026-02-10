'use client';

import { useState, useRef, useEffect } from 'react';
import {
  listProjects,
  deleteProject,
  downloadProject,
  importProjectFromJSON,
  saveProject,
  listCloudProjects,
  loadCloudProject,
  deleteCloudProject,
  type SavedProject,
  type CloudProject,
} from '@/lib/projects';
import { useBuildingStore } from '@/stores/buildingStore';
import { useAuthStore } from '@tidkit/auth/client';

type StorageTab = 'local' | 'cloud';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (name: string) => void;
}

export function ProjectsModal({ isOpen, onClose, onLoad }: ProjectsModalProps) {
  const [localProjects, setLocalProjects] = useState<SavedProject[]>(() => listProjects());
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [tab, setTab] = useState<StorageTab>('local');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadProject = useBuildingStore((s) => s.loadProject);
  const { user, isAuthenticated, provider } = useAuthStore();

  // Map auth cloud provider to storage provider type
  const storageProvider = provider === 'google-drive' ? 'GOOGLE_DRIVE' : provider === 'icloud' ? 'ICLOUD' : null;

  // Fetch cloud projects when switching to cloud tab
  useEffect(() => {
    if (!isOpen || tab !== 'cloud' || !storageProvider || !user) return;
    setCloudLoading(true);
    setCloudError(null);
    listCloudProjects(storageProvider, user.id)
      .then(setCloudProjects)
      .catch((err) => setCloudError(err.message))
      .finally(() => setCloudLoading(false));
  }, [isOpen, tab, storageProvider, user]);

  if (!isOpen) return null;

  const refreshLocal = () => setLocalProjects(listProjects());

  const handleLoadLocal = (project: SavedProject) => {
    loadProject(project.params, project.textures, project.accessories);
    onLoad(project.name);
    onClose();
  };

  const handleLoadCloud = async (cp: CloudProject) => {
    if (!storageProvider || !user) return;
    try {
      const project = await loadCloudProject(storageProvider, user.id, cp.fileId);
      loadProject(project.params, project.textures, project.accessories);
      onLoad(project.name);
      onClose();
    } catch {
      alert('Failed to load cloud project.');
    }
  };

  const handleDeleteLocal = (id: string) => {
    if (!confirm('Delete this project?')) return;
    deleteProject(id);
    refreshLocal();
  };

  const handleDeleteCloud = async (fileId: string) => {
    if (!storageProvider || !user) return;
    if (!confirm('Delete this cloud project?')) return;
    try {
      await deleteCloudProject(storageProvider, user.id, fileId);
      setCloudProjects((prev) => prev.filter((p) => p.fileId !== fileId));
    } catch {
      alert('Failed to delete cloud project.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const project = importProjectFromJSON(text);
      saveProject(project.name, project.params, project.textures, project.accessories);
      refreshLocal();
      setTab('local');
    } catch {
      alert('Failed to import project file.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sortedLocal = [...localProjects].sort((a, b) => b.updatedAt - a.updatedAt);
  const sortedCloud = [...cloudProjects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const providerLabel = storageProvider === 'GOOGLE_DRIVE' ? 'Google Drive' : storageProvider === 'ICLOUD' ? 'iCloud' : 'Cloud';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Saved Projects</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
          >
            &times;
          </button>
        </div>

        {/* Storage tabs */}
        <div className="flex border-b px-4">
          <button
            onClick={() => setTab('local')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'local'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            This Device
          </button>
          {isAuthenticated && storageProvider && (
            <button
              onClick={() => setTab('cloud')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === 'cloud'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {providerLabel}
            </button>
          )}
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'local' && (
            <>
              {sortedLocal.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-sm">No saved projects yet.</p>
                  <p className="text-xs mt-1">Use the Save button to save your current building.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedLocal.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{project.name}</div>
                        <div className="text-xs text-gray-400">
                          {project.params.dimensions.width}&apos; &times; {project.params.dimensions.depth}&apos; &times; {project.params.dimensions.height}&apos;
                          {' · '}
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleLoadLocal(project)}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => downloadProject(project)}
                          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                          title="Download .tidkit file"
                        >
                          &darr;
                        </button>
                        <button
                          onClick={() => handleDeleteLocal(project.id)}
                          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-red-100 hover:text-red-600"
                          title="Delete project"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'cloud' && (
            <>
              {cloudLoading ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-sm">Loading from {providerLabel}...</p>
                </div>
              ) : cloudError ? (
                <div className="text-center text-red-400 py-8">
                  <p className="text-sm">{cloudError}</p>
                  <p className="text-xs mt-1">Check that your {providerLabel} connection is active.</p>
                </div>
              ) : sortedCloud.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p className="text-sm">No projects in {providerLabel}.</p>
                  <p className="text-xs mt-1">Save a project with cloud sync enabled to see it here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedCloud.map((cp) => (
                    <div
                      key={cp.fileId}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{cp.name}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(cp.updatedAt).toLocaleDateString()}
                          {cp.size > 0 && ` · ${(cp.size / 1024).toFixed(1)} KB`}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleLoadCloud(cp)}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteCloud(cp.fileId)}
                          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-red-100 hover:text-red-600"
                          title="Delete"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Import from File
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
