'use client';

/**
 * TidKit Builder - Templates Modal
 * Browse and select building templates
 */

import { useState } from 'react';
import { useBuildingStore } from '@/stores/buildingStore';
import {
  BUILDING_TEMPLATES,
  BuildingTemplate,
  getCategories,
  getTemplatesByCategory,
  applyTemplate,
} from '@/lib/templates';

interface TemplatesModalProps {
  onClose: () => void;
  onSelectTemplate: (name: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  agricultural: 'Agricultural',
  misc: 'Miscellaneous',
};

const CATEGORY_ICONS: Record<string, string> = {
  residential: '🏠',
  commercial: '🏪',
  industrial: '🏭',
  agricultural: '🌾',
  misc: '📦',
};

export function TemplatesModal({ onClose, onSelectTemplate }: TemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { params, setDimensions, setRoofStyle, setRoofPitch, setRoofOverhang } = useBuildingStore();

  const categories = getCategories();

  const filteredTemplates = selectedCategory === 'all'
    ? BUILDING_TEMPLATES
    : getTemplatesByCategory(selectedCategory);

  function handleSelectTemplate(template: BuildingTemplate) {
    // Apply template dimensions and roof settings (keep current scale)
    setDimensions(template.params.dimensions);
    setRoofStyle(template.params.roof.style);
    setRoofPitch(template.params.roof.pitch);
    setRoofOverhang(template.params.roof.overhang);

    // Update building name
    onSelectTemplate(template.name);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Building Templates</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose a template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category sidebar */}
          <div className="w-48 border-r bg-gray-50 p-4">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 All Templates
                <span className="ml-2 text-xs opacity-70">({BUILDING_TEMPLATES.length})</span>
              </button>

              <div className="border-t my-2" />

              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.name
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {CATEGORY_ICONS[cat.name]} {CATEGORY_LABELS[cat.name]}
                  <span className="ml-2 text-xs opacity-70">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  {/* Template preview (placeholder) */}
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-4xl group-hover:bg-blue-100 transition-colors">
                    {CATEGORY_ICONS[template.category]}
                  </div>

                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Dimensions */}
                  <div className="mt-2 text-xs text-gray-400">
                    {template.params.dimensions.width}' × {template.params.dimensions.depth}' × {template.params.dimensions.height}'
                  </div>
                </button>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No templates in this category
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          <p>
            💡 Templates use HO scale by default. Your current scale setting will be preserved.
          </p>
        </div>
      </div>
    </div>
  );
}
