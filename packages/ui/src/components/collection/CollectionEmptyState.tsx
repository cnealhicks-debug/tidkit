'use client';

import type { CollectionCategory } from '../../types/collection';

export interface CollectionEmptyStateProps {
  category: CollectionCategory;
}

const EMPTY_STATES: Record<
  CollectionCategory,
  { icon: string; title: string; description: string; ctaLabel: string; ctaHref: string }
> = {
  projects: {
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    title: 'No projects yet',
    description: 'Create your first building in Builder to see it here.',
    ctaLabel: 'Open Builder',
    ctaHref: '/builder',
  },
  textures: {
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    title: 'No textures yet',
    description: 'Create or import textures in Studio to see them here.',
    ctaLabel: 'Open Studio',
    ctaHref: '/studio',
  },
};

function getDevUrl(href: string): string {
  if (typeof window === 'undefined') return href;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) return href;
  if (href === '/builder') return 'http://localhost:3001';
  if (href === '/studio') return 'http://localhost:3002';
  return href;
}

export function CollectionEmptyState({ category }: CollectionEmptyStateProps) {
  const state = EMPTY_STATES[category];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-16 h-16 text-gray-300 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d={state.icon}
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{state.title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{state.description}</p>
      <a
        href={getDevUrl(state.ctaHref)}
        className="px-5 py-2.5 text-sm font-medium text-white bg-tidkit-600 rounded-lg hover:bg-tidkit-700 transition-colors"
      >
        {state.ctaLabel}
      </a>
    </div>
  );
}
