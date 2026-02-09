/**
 * TidKit Builder - Texture Loader Hook
 * Loads and manages Three.js textures from the TidKit API or local library
 */

import { useState, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { getTextureImageUrl, getTexture, Texture } from '@/lib/api';
import { useBuildingStore, type LibraryTexture } from '@/stores/buildingStore';

interface LoadedTexture {
  texture: THREE.Texture;
  metadata: Texture | LibraryTexture;
  isLibraryTexture: boolean;
}

/**
 * Hook to load a texture from the TidKit API (by ID) or from a library texture object
 */
export function useTextureLoader(textureSource: string | LibraryTexture | undefined) {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable key for the effect dependency
  const sourceKey = textureSource
    ? typeof textureSource === 'string'
      ? `api:${textureSource}`
      : `lib:${textureSource.id}`
    : null;

  useEffect(() => {
    if (!textureSource) {
      setLoaded(null);
      return;
    }

    let cancelled = false;

    async function loadTexture() {
      if (!textureSource) return;

      setLoading(true);
      setError(null);

      try {
        const isLibraryTexture = typeof textureSource === 'object';
        let imageUrl: string;
        let metadata: Texture | LibraryTexture;

        if (isLibraryTexture) {
          // Load from library texture object
          imageUrl = textureSource.fullUrl;
          metadata = textureSource;
        } else {
          // Load from API by ID
          const textureId = parseInt(textureSource, 10);
          metadata = await getTexture(textureId);
          imageUrl = getTextureImageUrl(textureId, 'full');
        }

        if (cancelled) return;

        // Load the texture
        const loader = new THREE.TextureLoader();
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            imageUrl,
            (tex) => resolve(tex),
            undefined,
            (err) => reject(err)
          );
        });

        if (cancelled) {
          texture.dispose();
          return;
        }

        // Configure texture for tiling
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        setLoaded({ texture, metadata, isLibraryTexture });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load texture');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTexture();

    return () => {
      cancelled = true;
      // Note: We don't dispose the texture here because React might
      // still be using it during re-renders. The texture will be
      // garbage collected when no longer referenced.
    };
  }, [sourceKey]);

  return { loaded, loading, error };
}

/**
 * Hook to get all loaded textures for building surfaces
 */
export function useBuildingTextures() {
  const { textures, params } = useBuildingStore();
  const { scale } = params;

  // Load each assigned texture (works with both API IDs and library textures)
  const frontWall = useTextureLoader(textures.frontWall);
  const sideWalls = useTextureLoader(textures.sideWalls);
  const backWall = useTextureLoader(textures.backWall);
  const roof = useTextureLoader(textures.roof);
  const foundation = useTextureLoader(textures.foundation);
  const trim = useTextureLoader(textures.trim);

  return {
    frontWall: frontWall.loaded,
    sideWalls: sideWalls.loaded,
    backWall: backWall.loaded,
    roof: roof.loaded,
    foundation: foundation.loaded,
    trim: trim.loaded,
    loading: frontWall.loading || sideWalls.loading || backWall.loading ||
             roof.loading || foundation.loading || trim.loading,
  };
}

/**
 * Calculate texture repeat based on surface dimensions and texture scale
 * Works with both API textures and library textures
 */
export function calculateTextureRepeat(
  surfaceWidthFeet: number,
  surfaceHeightFeet: number,
  textureMetadata: Texture | LibraryTexture | undefined,
  scaleRatio: number
): [number, number] {
  // Default: assume 2x2 foot texture at real scale
  const defaultSizeFeet = 2;

  if (!textureMetadata) {
    return [
      surfaceWidthFeet / defaultSizeFeet,
      surfaceHeightFeet / defaultSizeFeet,
    ];
  }

  // Check if it's a library texture (has metadata.realWidth) or API texture (has true_scale)
  const isLibraryTexture = 'metadata' in textureMetadata && 'realWidth' in (textureMetadata as LibraryTexture).metadata;

  if (isLibraryTexture) {
    const libTexture = textureMetadata as LibraryTexture;
    // Library textures store dimensions in inches
    const textureWidthFeet = libTexture.metadata.realWidth / 12;
    const textureHeightFeet = libTexture.metadata.realHeight / 12;

    if (textureWidthFeet > 0 && textureHeightFeet > 0) {
      return [
        surfaceWidthFeet / textureWidthFeet,
        surfaceHeightFeet / textureHeightFeet,
      ];
    }
  } else {
    const apiTexture = textureMetadata as Texture;
    if (apiTexture.true_scale) {
      // Convert texture real-world inches to feet
      const textureWidthFeet = apiTexture.true_scale.width_inches / 12;
      const textureHeightFeet = apiTexture.true_scale.height_inches / 12;

      return [
        surfaceWidthFeet / textureWidthFeet,
        surfaceHeightFeet / textureHeightFeet,
      ];
    }
  }

  // Fallback to default
  return [
    surfaceWidthFeet / defaultSizeFeet,
    surfaceHeightFeet / defaultSizeFeet,
  ];
}
