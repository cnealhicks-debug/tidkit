'use client';

/**
 * TidKit Builder - WallMaterial Component
 * Conditionally applies procedural, photo, or solid color material per surface.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useBuildingStore, type BuildingSurface } from '@/stores/buildingStore';
import { isProceduralTexture } from '@/types/procedural';
import { useProceduralMaterial } from '@/hooks/useProceduralMaterial';
import type { ProceduralTextureConfig } from '@/types/procedural';

interface WallMaterialProps {
  surface: BuildingSurface;
  fallbackColor: string;
}

/**
 * Renders as a <meshStandardMaterial> or a <primitive> wrapping the procedural material.
 * Must be a child of a <mesh> element.
 */
export function WallMaterial({ surface, fallbackColor }: WallMaterialProps) {
  const textures = useBuildingStore((s) => s.textures);
  const texture = textures[surface];

  if (isProceduralTexture(texture)) {
    return <ProceduralWallMaterial config={texture} />;
  }

  // Default: solid color
  return <meshStandardMaterial color={fallbackColor} />;
}

/** Wraps the procedural CustomShaderMaterial as a R3F primitive */
function ProceduralWallMaterial({ config }: { config: ProceduralTextureConfig }) {
  const material = useProceduralMaterial(config);

  if (!material) {
    return <meshStandardMaterial color="#888888" />;
  }

  return <primitive object={material} attach="material" />;
}
