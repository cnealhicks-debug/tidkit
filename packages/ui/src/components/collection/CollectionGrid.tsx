'use client';

import type {
  AnyCollectionItem,
  ProjectCollectionItem,
  TextureCollectionItem,
} from '../../types/collection';
import { ProjectCard } from './ProjectCard';
import { TextureCard } from './TextureCard';
import { cn } from '../../utils';

export type ViewMode = 'grid' | 'list';

export interface CollectionGridProps {
  items: AnyCollectionItem[];
  viewMode: ViewMode;
  onOpenProject: (item: ProjectCollectionItem) => void;
  onOpenTexture: (item: TextureCollectionItem) => void;
  onDownload: (item: AnyCollectionItem) => void;
  onDelete: (item: AnyCollectionItem) => void;
}

export function CollectionGrid({
  items,
  viewMode,
  onOpenProject,
  onOpenTexture,
  onDownload,
  onDelete,
}: CollectionGridProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'flex flex-col gap-2',
      )}
    >
      {items.map((item) => {
        if (item.category === 'projects') {
          return (
            <ProjectCard
              key={item.id}
              item={item as ProjectCollectionItem}
              viewMode={viewMode}
              onOpen={onOpenProject}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          );
        }
        return (
          <TextureCard
            key={item.id}
            item={item as TextureCollectionItem}
            viewMode={viewMode}
            onOpen={onOpenTexture}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
