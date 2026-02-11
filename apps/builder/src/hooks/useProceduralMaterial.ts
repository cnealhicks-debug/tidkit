'use client';

/**
 * TidKit Builder - useProceduralMaterial Hook
 * Creates a CustomShaderMaterial from a ProceduralTextureConfig.
 * Injects GLSL into MeshStandardMaterial (preserves PBR lighting/shadows).
 */

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import type { ProceduralTextureConfig, BrickParams, StoneParams, WeatheringParams } from '@/types/procedural';
import { DEFAULT_BRICK_PARAMS, DEFAULT_STONE_PARAMS, DEFAULT_WEATHERING } from '@/types/procedural';
import { noiseGLSL } from '@/shaders/noise.glsl';
import { commonVertexGLSL, commonFragmentGLSL } from '@/shaders/common.glsl';
import { triplanarGLSL } from '@/shaders/triplanar.glsl';
import { brickFragmentGLSL } from '@/shaders/brick.glsl';
import { stoneFragmentGLSL } from '@/shaders/stone.glsl';
import { weatheringFragmentGLSL } from '@/shaders/weathering.glsl';

/** Convert hex color string to THREE.Color */
function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/** Build the complete vertex shader */
function buildVertexShader(): string {
  // CustomShaderMaterial expects just the custom code — it injects into MeshStandardMaterial
  return /* glsl */ `
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    void main() {
      vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos4.xyz;
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    }
  `;
}

/** Build the complete fragment shader for the given texture type */
function buildFragmentShader(type: 'brick' | 'stone'): string {
  const patternEval = type === 'brick'
    ? /* glsl */ `
      BrickResult brX = evaluateBrick(tri.uvX);
      BrickResult brY = evaluateBrick(tri.uvY);
      BrickResult brZ = evaluateBrick(tri.uvZ);
      vec3 patternColor = triplanarBlend(brX.color, brY.color, brZ.color, tri.weights);
      float patternRoughness = triplanarBlendFloat(brX.roughness, brY.roughness, brZ.roughness, tri.weights);
      float patternMortar = triplanarBlendFloat(brX.mortar, brY.mortar, brZ.mortar, tri.weights);
    `
    : /* glsl */ `
      StoneResult stX = evaluateStone(tri.uvX);
      StoneResult stY = evaluateStone(tri.uvY);
      StoneResult stZ = evaluateStone(tri.uvZ);
      vec3 patternColor = triplanarBlend(stX.color, stY.color, stZ.color, tri.weights);
      float patternRoughness = triplanarBlendFloat(stX.roughness, stY.roughness, stZ.roughness, tri.weights);
      float patternMortar = triplanarBlendFloat(stX.mortar, stY.mortar, stZ.mortar, tri.weights);
    `;

  return /* glsl */ `
    ${commonFragmentGLSL}
    ${noiseGLSL}
    ${triplanarGLSL}
    ${type === 'brick' ? brickFragmentGLSL : stoneFragmentGLSL}
    ${weatheringFragmentGLSL}

    uniform float uWorldScale;

    void main() {
      // Scale from feet to inches for pattern evaluation
      float inchScale = uWorldScale / 12.0;
      TriplanarUVs tri = getTriplanarUVs(vWorldPosition, vWorldNormal, 1.0 / inchScale);

      ${patternEval}

      // Apply weathering
      vec3 finalColor = applyWeathering(patternColor, vWorldPosition, patternMortar, patternRoughness);

      csm_DiffuseColor = vec4(finalColor, 1.0);
      csm_Roughness = patternRoughness;
    }
  `;
}

/** Create uniforms map from ProceduralTextureConfig */
function buildUniforms(config: ProceduralTextureConfig): Record<string, THREE.IUniform> {
  const brick = config.brick || DEFAULT_BRICK_PARAMS;
  const stone = config.stone || DEFAULT_STONE_PARAMS;
  const weathering = config.weathering || DEFAULT_WEATHERING;

  const uniforms: Record<string, THREE.IUniform> = {
    uWorldScale: { value: config.worldScale },
  };

  if (config.type === 'brick') {
    const bondMap: Record<string, number> = { running: 0, stack: 1, stretcher: 2, flemish: 3 };
    Object.assign(uniforms, {
      uBondPattern: { value: bondMap[brick.bondPattern] || 0 },
      uBrickWidth: { value: brick.brickWidth },
      uBrickHeight: { value: brick.brickHeight },
      uMortarWidth: { value: brick.mortarWidth },
      uMortarDepth: { value: brick.mortarDepth },
      uBrickColorA: { value: hexToColor(brick.brickColorA) },
      uBrickColorB: { value: hexToColor(brick.brickColorB) },
      uMortarColor: { value: hexToColor(brick.mortarColor) },
      uColorVariation: { value: brick.colorVariation },
      uBrickRoughness: { value: brick.brickRoughness },
      uMortarRoughness: { value: brick.mortarRoughness },
    });
  } else {
    const layoutMap: Record<string, number> = { coursed: 0, random: 1, cobblestone: 2 };
    Object.assign(uniforms, {
      uStoneLayout: { value: layoutMap[stone.layout] || 0 },
      uStoneSize: { value: stone.stoneSize },
      uSizeVariation: { value: stone.sizeVariation },
      uStoneColorA: { value: hexToColor(stone.stoneColorA) },
      uStoneColorB: { value: hexToColor(stone.stoneColorB) },
      uStoneColorC: { value: hexToColor(stone.stoneColorC) },
      uStoneMortarColor: { value: hexToColor(stone.mortarColor) },
      uStoneMortarWidth: { value: stone.mortarWidth },
      uSurfaceRoughness: { value: stone.surfaceRoughness },
      uGrainIntensity: { value: stone.grainIntensity },
    });
  }

  // Weathering uniforms (always present)
  Object.assign(uniforms, {
    uWeatheringEnabled: { value: weathering.enabled },
    uDirtIntensity: { value: weathering.dirtIntensity },
    uDirtColor: { value: hexToColor(weathering.dirtColor) },
    uWaterStainIntensity: { value: weathering.waterStainIntensity },
    uMossIntensity: { value: weathering.mossIntensity },
    uMossColor: { value: hexToColor(weathering.mossColor) },
    uAgeFactor: { value: weathering.ageFactor },
    uEdgeWearIntensity: { value: weathering.edgeWearIntensity },
  });

  return uniforms;
}

/** Update only changed uniforms on an existing material */
function updateUniforms(material: CustomShaderMaterial, config: ProceduralTextureConfig) {
  const newUniforms = buildUniforms(config);
  for (const [key, uniform] of Object.entries(newUniforms)) {
    if (material.uniforms[key]) {
      const existing = material.uniforms[key].value;
      const incoming = uniform.value;
      // For THREE.Color, use .equals() check
      if (existing instanceof THREE.Color && incoming instanceof THREE.Color) {
        if (!existing.equals(incoming)) {
          existing.copy(incoming);
        }
      } else if (existing !== incoming) {
        material.uniforms[key].value = incoming;
      }
    }
  }
}

export function useProceduralMaterial(config: ProceduralTextureConfig | null): THREE.Material | null {
  const materialRef = useRef<CustomShaderMaterial | null>(null);
  const prevTypeRef = useRef<string | null>(null);

  // Create or rebuild material when texture type changes
  const material = useMemo(() => {
    if (!config) return null;

    const vertexShader = buildVertexShader();
    const fragmentShader = buildFragmentShader(config.type);
    const uniforms = buildUniforms(config);

    const mat = new CustomShaderMaterial({
      baseMaterial: THREE.MeshStandardMaterial,
      vertexShader,
      fragmentShader,
      uniforms,
    });

    materialRef.current = mat;
    prevTypeRef.current = config.type;
    return mat;
  }, [config?.type]); // Only rebuild when type changes

  // Update uniforms when config params change (without rebuilding material)
  useEffect(() => {
    if (materialRef.current && config && prevTypeRef.current === config.type) {
      updateUniforms(materialRef.current, config);
    }
  }, [config]);

  // Cleanup
  useEffect(() => {
    return () => {
      materialRef.current?.dispose();
    };
  }, []);

  return material;
}
