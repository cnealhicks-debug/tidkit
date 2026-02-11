'use client';

import type { TextureCollectionItem } from '../../types/collection';
import { Card } from '../Card';
import { cn } from '../../utils';

export interface TextureCardProps {
  item: TextureCollectionItem;
  onOpen: (item: TextureCollectionItem) => void;
  onDownload: (item: TextureCollectionItem) => void;
  onDelete: (item: TextureCollectionItem) => void;
  viewMode?: 'grid' | 'list';
}

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

const PROCEDURAL_COLORS: Record<string, string> = {
  brick: 'from-amber-600 to-red-700',
  stone: 'from-gray-400 to-gray-600',
};

export function TextureCard({
  item,
  onOpen,
  onDownload,
  onDelete,
  viewMode = 'grid',
}: TextureCardProps) {
  const { textureType, textureCategory, dimensions, pixelDimensions, isSeamless, proceduralType } =
    item.metadata;
  const isProcedural = textureType === 'procedural';

  if (viewMode === 'list') {
    return (
      <Card padding="sm" hover className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className={cn(
                'w-full h-full bg-gradient-to-br flex items-center justify-center',
                PROCEDURAL_COLORS[proceduralType || ''] || 'from-gray-400 to-gray-600',
              )}
            >
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-xs text-gray-500">
            {textureCategory}
            {dimensions && ` \u00B7 ${dimensions.width}\u00D7${dimensions.height}in`}
            {pixelDimensions && ` \u00B7 ${pixelDimensions.width}\u00D7${pixelDimensions.height}px`}
          </p>
        </div>

        {/* Badges */}
        <div className="flex gap-1 flex-shrink-0">
          {isSeamless && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
              Seamless
            </span>
          )}
          {isProcedural && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
              Procedural
            </span>
          )}
        </div>

        {/* Date */}
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatRelativeDate(item.createdAt)}
        </span>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onOpen(item)}
            className="px-3 py-1.5 text-xs font-medium text-tidkit-700 bg-tidkit-50 rounded-lg hover:bg-tidkit-100 transition-colors"
          >
            Open
          </button>
          {isProcedural && (
            <button
              onClick={() => onDownload(item)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
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
    <Card padding="none" hover className="group overflow-hidden relative">
      {/* Thumbnail area */}
      <div className="aspect-square bg-gray-100 relative">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={cn(
              'w-full h-full bg-gradient-to-br flex items-center justify-center',
              PROCEDURAL_COLORS[proceduralType || ''] || 'from-gray-400 to-gray-600',
            )}
          >
            <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isSeamless && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
              Seamless
            </span>
          )}
          {isProcedural && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded">
              Procedural
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {textureCategory}
          {dimensions && ` \u00B7 ${dimensions.width}\u00D7${dimensions.height}in`}
        </p>
        <span className="text-xs text-gray-400 mt-1 block">
          {formatRelativeDate(item.createdAt)}
        </span>
      </div>

      {/* Action overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-white via-white/95 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-2">
          <button
            onClick={() => onOpen(item)}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-tidkit-600 rounded-lg hover:bg-tidkit-700 transition-colors"
          >
            Open in Studio
          </button>
          {isProcedural && (
            <button
              onClick={() => onDownload(item)}
              className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Download .ptex.json"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
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
