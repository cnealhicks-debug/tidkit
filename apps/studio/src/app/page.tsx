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
import { ScaleDetectionResult } from '@/components/ScaleDetectionResult';
import { ProceduralEditor } from '@/components/ProceduralEditor';
import { detectScaleFromReference } from '@/lib/scale-detection';
import type { TextureFile, ScaleDetectionResult as DetectionResultType } from '@/types/texture';
import type { ModelScale } from '@tidkit/config';
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

type ViewMode = 'library' | 'editor' | 'procedural';

export default function StudioPage() {
  const {
    currentTexture,
    processedTexture,
    setCurrentTexture,
    setProcessedTexture,
  } = useTextureStore();

  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewTextureMenu, setShowNewTextureMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scale detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResultType | null>(null);
  const [pendingTexture, setPendingTexture] = useState<TextureFile | null>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showNewTextureMenu) return;
    const handleClickOutside = () => setShowNewTextureMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showNewTextureMenu]);

  /**
   * Handle file upload - creates a new texture and runs scale detection
   */
  const handleUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);

      const img = new Image();
      img.onload = async () => {
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
        setError(null);

        // Run scale detection on the uploaded image
        setIsDetecting(true);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const result = await detectScaleFromReference(imageData);

            if (result.detected && result.confidence > 0.5) {
              // Card detected — show results for user to confirm
              setPendingTexture(texture);
              setDetectionResult(result);
              setIsDetecting(false);
              return;
            }
          }
        } catch {
          // Detection failed silently — proceed to editor
        }

        // No card detected — go straight to editor
        setIsDetecting(false);
        setCurrentTexture(texture);
        setShowImportModal(false);
      };
      img.onerror = () => {
        setError('Failed to load image');
      };
      img.src = url;
    },
    [setCurrentTexture]
  );

  /**
   * Handle confirming detected scale settings
   */
  const handleDetectionConfirm = useCallback(
    (scale: ModelScale, dpi: number) => {
      if (!pendingTexture) return;
      const realWidth = pendingTexture.metadata.pixelWidth / dpi;
      const realHeight = pendingTexture.metadata.pixelHeight / dpi;
      const texture: TextureFile = {
        ...pendingTexture,
        metadata: {
          ...pendingTexture.metadata,
          scale,
          dpi,
          realWidth,
          realHeight,
        },
      };
      useTextureStore.getState().setRealDimensions(realWidth, realHeight);
      setCurrentTexture(texture);
      setShowImportModal(false);
      setDetectionResult(null);
      setPendingTexture(null);
    },
    [pendingTexture, setCurrentTexture]
  );

  /**
   * Handle skipping detection and adjusting manually
   */
  const handleDetectionSkip = useCallback(() => {
    if (pendingTexture) {
      setCurrentTexture(pendingTexture);
    }
    setShowImportModal(false);
    setDetectionResult(null);
    setPendingTexture(null);
  }, [pendingTexture, setCurrentTexture]);

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
   * Open upload photo modal
   */
  const handleUploadPhoto = () => {
    setShowNewTextureMenu(false);
    setShowImportModal(true);
  };

  /**
   * Open procedural editor
   */
  const handleCreateProcedural = () => {
    setShowNewTextureMenu(false);
    setCurrentTexture(null);
    setViewMode('procedural');
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
        {viewMode === 'procedural' && !currentTexture ? (
          /* Procedural Editor View */
          <ProceduralEditor onClose={handleCloseEditor} />
        ) : viewMode === 'library' && !currentTexture ? (
          /* Library View - Default landing */
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Texture Studio</h1>
                  <p className="text-sm text-gray-500">Select a texture from your library to edit or create a new one</p>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewTextureMenu(!showNewTextureMenu);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Texture
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {showNewTextureMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                      <button
                        onClick={handleUploadPhoto}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="block text-sm font-medium text-gray-900">Upload Photo</span>
                          <span className="block text-xs text-gray-500">Import from camera or file</span>
                        </div>
                      </button>
                      <button
                        onClick={handleCreateProcedural}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <div>
                          <span className="block text-sm font-medium text-gray-900">Create Procedural</span>
                          <span className="block text-xs text-gray-500">Brick, stone & more via shaders</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {detectionResult ? 'Scale Detected' : 'Import Texture'}
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setDetectionResult(null);
                  setPendingTexture(null);
                  setIsDetecting(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Detection Results */}
            {detectionResult ? (
              <ScaleDetectionResult
                result={detectionResult}
                onConfirm={handleDetectionConfirm}
                onAdjustManually={handleDetectionSkip}
              />
            ) : isDetecting ? (
              /* Detecting spinner */
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-900">Analyzing image...</p>
                <p className="text-xs text-gray-500 mt-1">Looking for reference card</p>
              </div>
            ) : (
              /* Upload Area + Reference Card Instructions */
              <div className="p-6 space-y-4">
                <TextureUploader onUpload={handleUpload} />

                {/* Reference Card Section */}
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                  <h4 className="text-sm font-semibold text-teal-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    For True-to-Scale Results
                  </h4>

                  {/* 3-step guide */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <p className="text-xs text-teal-800">
                        <span className="font-medium">Print</span> the TidKit reference card at 100% scale (no fit-to-page)
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <p className="text-xs text-teal-800">
                        <span className="font-medium">Place</span> the card flat against the surface you want to capture
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <p className="text-xs text-teal-800">
                        <span className="font-medium">Photograph</span> the surface with the card visible, then upload here
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <a
                      href="/tidkit-reference-card.svg"
                      download="tidkit-reference-card.svg"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Reference Card
                    </a>
                    <span className="text-xs text-teal-600">Works with any camera</span>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for best results:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>- Use high-resolution photos for detailed textures</li>
                    <li>- Photograph textures straight-on to minimize distortion</li>
                    <li>- Keep the reference card fully visible and unobstructed</li>
                    <li>- Consistent lighting produces better seamless tiles</li>
                  </ul>
                </div>
              </div>
            )}
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
