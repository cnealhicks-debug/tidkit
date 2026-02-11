'use client';

import type { CollectionFilter } from '../../types/collection';
import { cn } from '../../utils';

export type ViewMode = 'grid' | 'list';

export interface CollectionToolbarProps {
  filter: CollectionFilter;
  onFilterChange: (filter: CollectionFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onImport: () => void;
}

export function CollectionToolbar({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onImport,
}: CollectionToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
      {/* Search */}
      <div className="relative flex-1 w-full sm:w-auto">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          value={filter.search || ''}
          onChange={(e) =>
            onFilterChange({ ...filter, search: e.target.value })
          }
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-tidkit-500 focus:border-tidkit-500"
        />
      </div>

      {/* Sort */}
      <select
        value={`${filter.sortBy}-${filter.sortOrder}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split('-') as [
            CollectionFilter['sortBy'],
            CollectionFilter['sortOrder'],
          ];
          onFilterChange({ ...filter, sortBy, sortOrder });
        }}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-tidkit-500 focus:border-tidkit-500"
      >
        <option value="date-desc">Newest first</option>
        <option value="date-asc">Oldest first</option>
        <option value="name-asc">Name A–Z</option>
        <option value="name-desc">Name Z–A</option>
        <option value="modified-desc">Recently modified</option>
        <option value="modified-asc">Least recently modified</option>
      </select>

      {/* View mode toggle */}
      <div className="flex border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => onViewModeChange('grid')}
          className={cn(
            'p-2 transition-colors',
            viewMode === 'grid'
              ? 'bg-tidkit-50 text-tidkit-700'
              : 'text-gray-400 hover:text-gray-600',
          )}
          title="Grid view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={cn(
            'p-2 transition-colors border-l border-gray-200',
            viewMode === 'list'
              ? 'bg-tidkit-50 text-tidkit-700'
              : 'text-gray-400 hover:text-gray-600',
          )}
          title="List view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Import button */}
      <button
        onClick={onImport}
        className="px-4 py-2 text-sm font-medium bg-tidkit-600 text-white rounded-lg hover:bg-tidkit-700 transition-colors"
      >
        Import
      </button>
    </div>
  );
}
