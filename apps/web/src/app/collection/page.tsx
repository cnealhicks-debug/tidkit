'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@tidkit/ui/components/Navigation';
import {
  CollectionCategoryTabs,
  CollectionToolbar,
  CollectionGrid,
  CollectionEmptyState,
  ImportDialog,
  type ViewMode,
  type CategoryTab,
} from '@tidkit/ui/components/collection';
import {
  listProjectItems,
  listTextureItems,
  deleteCollectionItem,
  exportCollectionItem,
  getAppUrl,
} from '@tidkit/ui/lib/collection-data';
import type {
  CollectionCategory,
  CollectionFilter,
  AnyCollectionItem,
  ProjectCollectionItem,
  TextureCollectionItem,
} from '@tidkit/ui/types/collection';

export default function CollectionPage() {
  const [activeCategory, setActiveCategory] = useState<CollectionCategory>('projects');
  const [projects, setProjects] = useState<ProjectCollectionItem[]>([]);
  const [textures, setTextures] = useState<TextureCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<CollectionFilter>({
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([listProjectItems(), listTextureItems()]);
      setProjects(p);
      setTextures(t);
    } catch (err) {
      console.error('Failed to load collection data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter & sort
  const currentItems: AnyCollectionItem[] = activeCategory === 'projects' ? projects : textures;

  const filteredItems = currentItems.filter((item) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!item.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const dir = filter.sortOrder === 'asc' ? 1 : -1;
    switch (filter.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name) * dir;
      case 'modified':
        return (a.updatedAt - b.updatedAt) * dir;
      case 'date':
      default:
        return (a.createdAt - b.createdAt) * dir;
    }
  });

  const tabs: CategoryTab[] = [
    { key: 'projects', label: 'Projects', count: projects.length },
    { key: 'textures', label: 'Textures', count: textures.length },
  ];

  // Actions
  const handleOpenProject = (item: ProjectCollectionItem) => {
    window.location.href = getAppUrl(item);
  };

  const handleOpenTexture = (item: TextureCollectionItem) => {
    window.location.href = getAppUrl(item);
  };

  const handleDownload = (item: AnyCollectionItem) => {
    exportCollectionItem(item);
  };

  const handleDelete = (item: AnyCollectionItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    deleteCollectionItem(item);
    loadData();
  };

  const handleImportProject = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      // Generate a new ID to avoid conflicts
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const project = {
        ...parsed,
        id,
        updatedAt: Date.now(),
        createdAt: parsed.createdAt || Date.now(),
      };
      const stored = localStorage.getItem('tidkit-projects');
      const existing = stored ? JSON.parse(stored) : [];
      existing.push(project);
      localStorage.setItem('tidkit-projects', JSON.stringify(existing));
      loadData();
    } catch (err) {
      console.error('Failed to import project:', err);
    }
  };

  const handleImportPtex = (json: string) => {
    try {
      const ptex = JSON.parse(json);
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const preset = {
        id,
        name: ptex.name || 'Imported Preset',
        description: ptex.description || '',
        ptex,
        createdAt: Date.now(),
      };
      const stored = localStorage.getItem('tidkit-ptex-presets');
      const existing = stored ? JSON.parse(stored) : [];
      existing.unshift(preset);
      localStorage.setItem('tidkit-ptex-presets', JSON.stringify(existing));
      loadData();
    } catch (err) {
      console.error('Failed to import ptex preset:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentApp="collection" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Collection</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and manage your projects and textures
          </p>
        </div>

        {/* Category tabs */}
        <CollectionCategoryTabs
          tabs={tabs}
          active={activeCategory}
          onChange={setActiveCategory}
        />

        {/* Toolbar */}
        <CollectionToolbar
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onImport={() => setImportOpen(true)}
        />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : sortedItems.length === 0 && !filter.search ? (
          <CollectionEmptyState category={activeCategory} />
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-500">
              No results for &ldquo;{filter.search}&rdquo;
            </p>
          </div>
        ) : (
          <CollectionGrid
            items={sortedItems}
            viewMode={viewMode}
            onOpenProject={handleOpenProject}
            onOpenTexture={handleOpenTexture}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        )}
      </main>

      {/* Import dialog */}
      <ImportDialog
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImportProject={handleImportProject}
        onImportPtex={handleImportPtex}
      />
    </div>
  );
}
