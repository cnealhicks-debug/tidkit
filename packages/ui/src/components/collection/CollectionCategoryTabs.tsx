'use client';

import type { CollectionCategory } from '../../types/collection';
import { cn } from '../../utils';

export interface CategoryTab {
  key: CollectionCategory;
  label: string;
  count: number;
}

export interface CollectionCategoryTabsProps {
  tabs: CategoryTab[];
  active: CollectionCategory;
  onChange: (category: CollectionCategory) => void;
}

export function CollectionCategoryTabs({
  tabs,
  active,
  onChange,
}: CollectionCategoryTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            active === tab.key
              ? 'border-tidkit-600 text-tidkit-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          )}
        >
          {tab.label}
          <span
            className={cn(
              'ml-2 px-1.5 py-0.5 text-xs rounded-full',
              active === tab.key
                ? 'bg-tidkit-100 text-tidkit-700'
                : 'bg-gray-100 text-gray-500',
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
