'use client';

/**
 * TidKit Studio - Main Page
 * Editor-first workflow with import/library as entry points
 */

import { useState, useCallback, useEffect } from 'react';
import { Navigation, LoginModal, TextureLibrary, saveTextureToLibrary, getTexturesFromLibrary, type LibraryTexture } from '@tidkit/ui';
import { useTextureStore } from '@/stores/textureStore';
import { TextureUploader } from '@/components/TextureUploader';
import { TextureEditor } from '@/components/TextureEditor';
import type { TextureFile } from '@/types/texture';
import {
  useAuthStore,
  configureAuth,
  initiateOAuthPopup,
  type AuthProvider,
} from '@tidkit/auth/client';

// Configure auth on module load
if (typeof window !== 'undefined') {
  configureAuth({
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    appleClientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  });
}

type ViewMode = 'library' | 'editor';

export default function StudioPage() {
  const {
    currentTexture,
    processedTexture,
    setCurrentTexture,
    setProcessedTexture,
  } = useTextureStore();

  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user, setUser, logout } = useAuthStore();

  // Handle OAuth login
  const handleLogin = async (authProvider: AuthProvider) => {
    const newUser = await initiateOAuthPopup(authProvider);
    setUser(newUser);
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  // When a texture is loaded, switch to editor view
  useEffect(() => {
    if (currentTexture) {
      setViewMode('editor');
    }
  }, [currentTexture]);

  /**
   * Handle file upload - creates a new texture
   */
  const handleUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);

      const img = new Image();
      img.onload = () => {
        const texture: TextureFile = {
          id: `upload-${Date.now()}`,
          name: file.name,
          file,
          url,
          metadata: {
            scale: useTextureStore.getState().selectedScale,
            realWidth: useTextureStore.getState().realWidth,
            realHeight: useTextureStore.getState().realHeight,
            pixelWidth: img.width,
            pixelHeight: img.height,
            dpi: Math.round(img.width / useTextureStore.getState().realWidth),
            category: useTextureStore.getState().selectedCategory,
            tags: [],
            isSeamless: false,
          },
        };
        setCurrentTexture(texture);
        setShowImportModal(false);
        setError(null);
      };
      img.onerror = () => {
        setError('Failed to load image');
      };
      img.src = url;
    },
    [setCurrentTexture]
  );

  /**
   * Handle selecting texture from library - opens in editor
   */
  const handleSelectFromLibrary = (libraryTexture: LibraryTexture) => {
    const texture: TextureFile = {
      id: libraryTexture.id,
      name: libraryTexture.name,
      file: new Blob(),
      url: libraryTexture.fullUrl || libraryTexture.thumbnailUrl,
      metadata: {
        scale: useTextureStore.getState().selectedScale,
        realWidth: libraryTexture.metadata.realWidth,
        realHeight: libraryTexture.metadata.realHeight,
        pixelWidth: libraryTexture.metadata.pixelWidth,
        pixelHeight: libraryTexture.metadata.pixelHeight,
        dpi: Math.round(libraryTexture.metadata.pixelWidth / libraryTexture.metadata.realWidth),
        category: useTextureStore.getState().selectedCategory,
        tags: [],
        isSeamless: libraryTexture.metadata.isSeamless,
      },
    };

    useTextureStore.getState().setRealDimensions(
      libraryTexture.metadata.realWidth,
      libraryTexture.metadata.realHeight
    );

    setCurrentTexture(texture);
  };

  /**
   * Handle save from editor
   */
  const handleEditorSave = (editedTexture: TextureFile) => {
    setCurrentTexture(editedTexture);
    setProcessedTexture(null);

    // Generate thumbnail and save to library
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      if (ctx) {
        ctx.drawImage(img, 0, 0, 200, 200);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

        saveTextureToLibrary({
          name: editedTexture.name.replace(/\.[^.]+$/, ''),
          category: editedTexture.metadata.category?.name || 'Other',
          thumbnailUrl,
          fullUrl: editedTexture.url,
          metadata: {
            realWidth: editedTexture.metadata.realWidth,
            realHeight: editedTexture.metadata.realHeight,
            pixelWidth: editedTexture.metadata.pixelWidth,
            pixelHeight: editedTexture.metadata.pixelHeight,
            isSeamless: editedTexture.metadata.isSeamless,
          },
        });

        setSuccessMessage('Texture saved to library!');
      }
    };
    img.src = editedTexture.url;
  };

  /**
   * Close editor and go back to library
   */
  const handleCloseEditor = () => {
    setCurrentTexture(null);
    setProcessedTexture(null);
    setViewMode('library');
  };

  /**
   * Create new texture
   */
  const handleNewTexture = () => {
    setShowImportModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Shared Navigation */}
      <Navigation
        currentApp="studio"
        user={user ? { name: user.name, email: user.email, image: user.avatar } : null}
        onSignIn={() => setShowLogin(true)}
        onSignOut={logout}
      />

      {/* Success/Error Messages */}
      {(successMessage || error) && (
        <div className={`${error ? 'bg-red-500' : 'bg-green-500'} text-white px-4 py-2 text-center text-sm`}>
          {error || successMessage}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {viewMode === 'library' && !currentTexture ? (
          /* Library View - Default landing */
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Texture Studio</h1>
                  <p className="text-sm text-gray-500">Select a texture from your library to edit or create a new one</p>
                </div>
                <button
                  onClick={handleNewTexture}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Texture
                </button>
              </div>
            </div>

            {/* Library Content */}
            <div className="flex-1 p-6">
              <div className="max-w-6xl mx-auto">
                <TextureLibrary
                  mode="panel"
                  onSelect={handleSelectFromLibrary}
                  showSamples={true}
                />
              </div>
            </div>
          </div>
        ) : currentTexture ? (
          /* Editor View - Full screen editor */
          <TextureEditor
            texture={currentTexture}
            onSave={handleEditorSave}
            onCancel={handleCloseEditor}
            isFullPage={true}
          />
        ) : null}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Import Texture</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Upload Area */}
            <div className="p-6">
              <TextureUploader onUpload={handleUpload} />

              {/* Tips */}
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for best results:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use high-resolution photos for detailed textures</li>
                  <li>• Photograph textures straight-on to minimize distortion</li>
                  <li>• Include a ruler or known object for accurate scaling</li>
                  <li>• Consistent lighting produces better seamless tiles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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
