'use client';

import type { ProjectCollectionItem } from '../../types/collection';
import { Card } from '../Card';

export interface ProjectCardProps {
  item: ProjectCollectionItem;
  onOpen: (item: ProjectCollectionItem) => void;
  onDownload: (item: ProjectCollectionItem) => void;
  onDelete: (item: ProjectCollectionItem) => void;
  viewMode?: 'grid' | 'list';
}

const ROOF_ICONS: Record<string, string> = {
  flat: 'M4 20h16v-2H4v2z',
  gable: 'M12 4L2 14h20L12 4z',
  hip: 'M12 4L2 14h20L12 4zM6 14l6-7 6 7',
  shed: 'M4 16L20 8v8H4z',
  gambrel: 'M12 4l-4 5-6 5h20l-6-5-4-5z',
  mansard: 'M4 14l2-6h12l2 6H4zM2 14h20v6H2v-6z',
  saltbox: 'M8 4l-6 10h20L14 6 8 4z',
};

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function RoofIcon({ style }: { style: string }) {
  const d = ROOF_ICONS[style] || ROOF_ICONS.gable;
  return (
    <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

const PLACEHOLDER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-orange-400 to-orange-600',
  'from-purple-400 to-purple-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
];

function getColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export function ProjectCard({
  item,
  onOpen,
  onDownload,
  onDelete,
  viewMode = 'grid',
}: ProjectCardProps) {
  const { dimensions, roofStyle, scale, accessoryCount, floorCount } = item.metadata;

  if (viewMode === 'list') {
    return (
      <Card padding="sm" hover className="flex items-center gap-4">
        {/* Color swatch */}
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getColor(item.id)} flex items-center justify-center flex-shrink-0`}
        >
          <RoofIcon style={roofStyle} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-xs text-gray-500">
            {dimensions.width}&times;{dimensions.depth}&times;{dimensions.height} &middot; {roofStyle} &middot; {scale}
          </p>
        </div>

        {/* Date */}
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatRelativeDate(item.updatedAt)}
        </span>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onOpen(item)}
            className="px-3 py-1.5 text-xs font-medium text-tidkit-700 bg-tidkit-50 rounded-lg hover:bg-tidkit-100 transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => onDownload(item)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Download"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" hover className="group overflow-hidden">
      {/* Colored placeholder with roof icon */}
      <div
        className={`aspect-[4/3] bg-gradient-to-br ${getColor(item.id)} flex items-center justify-center relative`}
      >
        <RoofIcon style={roofStyle} />
        <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] bg-white/20 text-white rounded backdrop-blur-sm">
          {scale}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {dimensions.width}&times;{dimensions.depth}&times;{dimensions.height} &middot;{' '}
          {roofStyle}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">
            {formatRelativeDate(item.updatedAt)}
          </span>
          <div className="flex gap-1 text-xs text-gray-400">
            {floorCount > 1 && <span>{floorCount} floors</span>}
            {accessoryCount > 0 && <span>{accessoryCount} acc.</span>}
          </div>
        </div>
      </div>

      {/* Action overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white via-white/95 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-2">
          <button
            onClick={() => onOpen(item)}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-tidkit-600 rounded-lg hover:bg-tidkit-700 transition-colors"
          >
            Open in Builder
          </button>
          <button
            onClick={() => onDownload(item)}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title="Download"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}
