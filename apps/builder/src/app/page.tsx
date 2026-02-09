'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Navigation, LoginModal, UserMenu } from '@tidkit/ui';
import { ControlPanel } from '@/components/building/ControlPanel';
import { UnfoldedView } from '@/components/building/UnfoldedView';
import { TemplatesModal } from '@/components/building/TemplatesModal';
import { TexturePanel } from '@/components/building/TexturePanel';
import { OpeningsPanel } from '@/components/building/OpeningsPanel';
import { FloorsPanel } from '@/components/building/FloorsPanel';
import { ExportPanel } from '@/components/building/ExportPanel';
import { AccessoriesPanel } from '@/components/building/AccessoriesPanel';
import { useBuildingStore } from '@/stores/buildingStore';
import {
  useAuthStore,
  configureAuth,
  initiateOAuthPopup,
  type AuthProvider,
} from '@tidkit/auth/client';

// Panel types for managing active panel state
type PanelType = 'textures' | 'openings' | 'floors' | 'export' | 'accessories' | null;

// Dynamic import for the 3D scene (no SSR for Three.js)
const Scene = dynamic(() => import('@/components/3d/Scene').then((mod) => mod.Scene), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading 3D scene...</div>
    </div>
  ),
});

type ViewMode = '3d' | 'unfolded';

// Configure auth on module load
if (typeof window !== 'undefined') {
  configureAuth({
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    appleClientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  });
}

// Inner component that uses useSearchParams
function BuilderContent() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [buildingName, setBuildingName] = useState('My Building');
  const [showTemplates, setShowTemplates] = useState(false);
  // Use single active panel state to prevent overlap
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [showLogin, setShowLogin] = useState(false);

  const { textures, params, accessories } = useBuildingStore();
  const { user, isAuthenticated, isEnabled, provider, lastSyncAt, isSyncing, setUser, logout } = useAuthStore();

  // Toggle panel - closes others and opens the selected one
  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel(current => current === panel ? null : panel);
  }, []);

  // Check if coming from Studio with openTextures param
  useEffect(() => {
    if (searchParams.get('openTextures') === 'true') {
      setActivePanel('textures');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  // Handle OAuth login
  const handleLogin = async (authProvider: AuthProvider) => {
    const newUser = await initiateOAuthPopup(authProvider);
    setUser(newUser);
  };

  // Count applied textures
  const textureCount = Object.values(textures).filter(Boolean).length;

  // Count openings
  const openingsCount = params.openings?.length || 0;

  // Count floors
  const floorCount = params.floors?.length || 1;

  // Count accessories
  const accessoryCount = accessories?.length || 0;

  return (
    <div className="h-screen flex flex-col">
      {/* Shared Navigation */}
      <Navigation
        currentApp="builder"
        user={user ? { name: user.name, email: user.email, image: user.avatar } : null}
        onSignIn={() => setShowLogin(true)}
        onSignOut={logout}
      />

      {/* Builder-specific toolbar */}
      <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-lg w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Building name"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Floors button */}
          <button
            onClick={() => togglePanel('floors')}
            className={`relative px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activePanel === 'floors'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Floors
            {floorCount > 1 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activePanel === 'floors' ? 'bg-white/20' : 'bg-purple-100 text-purple-700'}`}>
                {floorCount}
              </span>
            )}
          </button>

          {/* Openings button */}
          <button
            onClick={() => togglePanel('openings')}
            className={`relative px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activePanel === 'openings'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            Windows & Doors
            {openingsCount > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activePanel === 'openings' ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>
                {openingsCount}
              </span>
            )}
          </button>

          {/* Textures button */}
          <button
            onClick={() => togglePanel('textures')}
            className={`relative px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activePanel === 'textures'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Textures
            {textureCount > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activePanel === 'textures' ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>
                {textureCount}
              </span>
            )}
          </button>

          {/* Accessories button */}
          <button
            onClick={() => togglePanel('accessories')}
            className={`relative px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activePanel === 'accessories'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
            Accessories
            {accessoryCount > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activePanel === 'accessories' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'}`}>
                {accessoryCount}
              </span>
            )}
          </button>

          {/* Templates button */}
          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Templates
          </button>

          {/* Export button */}
          <button
            onClick={() => togglePanel('export')}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activePanel === 'export'
                ? 'bg-green-600 text-white'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Viewport */}
        <div className="flex-1 relative">
          {viewMode === '3d' ? (
            <Scene />
          ) : (
            <UnfoldedView buildingName={buildingName} />
          )}

          {/* Viewport toolbar */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 text-xs rounded shadow transition-colors ${
                viewMode === '3d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/90 backdrop-blur text-gray-600 hover:bg-white'
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => setViewMode('unfolded')}
              className={`px-3 py-1.5 text-xs rounded shadow transition-colors ${
                viewMode === 'unfolded'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/90 backdrop-blur text-gray-600 hover:bg-white'
              }`}
            >
              Unfolded Pattern
            </button>
          </div>

          {/* Help text */}
          {viewMode === '3d' && (
            <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/80 backdrop-blur px-2 py-1 rounded">
              Drag to rotate • Scroll to zoom • Shift+drag to pan
            </div>
          )}
        </div>

        {/* Control Panel */}
        <ControlPanel />
      </div>

      {/* Texture Panel */}
      <TexturePanel
        isOpen={activePanel === 'textures'}
        onClose={() => setActivePanel(null)}
      />

      {/* Openings Panel */}
      <OpeningsPanel
        isOpen={activePanel === 'openings'}
        onClose={() => setActivePanel(null)}
      />

      {/* Floors Panel */}
      <FloorsPanel
        isOpen={activePanel === 'floors'}
        onClose={() => setActivePanel(null)}
      />

      {/* Export Panel */}
      <ExportPanel
        isOpen={activePanel === 'export'}
        onClose={() => setActivePanel(null)}
        buildingName={buildingName}
      />

      {/* Accessories Panel */}
      <AccessoriesPanel
        isOpen={activePanel === 'accessories'}
        onClose={() => setActivePanel(null)}
      />

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={(name) => setBuildingName(name)}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginWithApple={() => handleLogin('apple')}
        onLoginWithGoogle={() => handleLogin('google')}
      />
    </div>
  );
}

// Main page component with Suspense boundary
export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}
