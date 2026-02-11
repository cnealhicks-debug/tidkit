'use client';

/**
 * TidKit Builder - Texture Baker
 * Bakes procedural textures to raster PNGs for print export.
 * Uses offscreen WebGLRenderTarget with orthographic camera.
 */

import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import type { ProceduralTextureConfig } from '@/types/procedural';
import { DEFAULT_BRICK_PARAMS, DEFAULT_STONE_PARAMS, DEFAULT_WEATHERING } from '@/types/procedural';
import { noiseGLSL } from '@/shaders/noise.glsl';
import { commonFragmentGLSL } from '@/shaders/common.glsl';
import { triplanarGLSL } from '@/shaders/triplanar.glsl';
import { brickFragmentGLSL } from '@/shaders/brick.glsl';
import { stoneFragmentGLSL } from '@/shaders/stone.glsl';
import { weatheringFragmentGLSL } from '@/shaders/weathering.glsl';

/** Maximum bake texture dimension (prevents GPU memory issues) */
const MAX_TEXTURE_SIZE = 4096;

/** Minimum bake texture dimension */
const MIN_TEXTURE_SIZE = 256;

export interface BakeOptions {
  /** Width of the surface in inches (model scale) */
  widthInches: number;
  /** Height of the surface in inches (model scale) */
  heightInches: number;
  /** Export DPI */
  dpi: number;
  /** Wall normal direction for triplanar (0=Z front/back, 1=X sides, 2=Y floor/roof) */
  normalAxis: 0 | 1 | 2;
  /** World-space Y offset of the surface bottom (for weathering) */
  worldYOffset?: number;
}

export interface BakeResult {
  /** PNG data URL */
  dataUrl: string;
  /** Actual pixel width */
  pixelWidth: number;
  /** Actual pixel height */
  pixelHeight: number;
}

/**
 * Bake a procedural texture to a PNG data URL.
 * Uses an offscreen Three.js scene with orthographic camera.
 */
export function bakeProceduralTexture(
  renderer: THREE.WebGLRenderer,
  config: ProceduralTextureConfig,
  options: BakeOptions,
): BakeResult {
  // Calculate pixel dimensions from model inches and DPI
  let pxW = Math.round(options.widthInches * options.dpi);
  let pxH = Math.round(options.heightInches * options.dpi);

  // Clamp to max size while maintaining aspect ratio
  if (pxW > MAX_TEXTURE_SIZE || pxH > MAX_TEXTURE_SIZE) {
    const scale = MAX_TEXTURE_SIZE / Math.max(pxW, pxH);
    pxW = Math.round(pxW * scale);
    pxH = Math.round(pxH * scale);
  }
  pxW = Math.max(MIN_TEXTURE_SIZE, pxW);
  pxH = Math.max(MIN_TEXTURE_SIZE, pxH);

  // Create render target
  const renderTarget = new THREE.WebGLRenderTarget(pxW, pxH, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });

  // Offscreen scene
  const scene = new THREE.Scene();

  // Orthographic camera looking at a plane
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  // Add basic lighting for PBR material
  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(0, 0, 5);
  scene.add(light);
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  // Create baking plane
  const planeGeo = new THREE.PlaneGeometry(1, 1);

  // Build a baking-specific shader material (simpler than the live one)
  const material = createBakeMaterial(config, options);
  const plane = new THREE.Mesh(planeGeo, material);
  scene.add(plane);

  // Render
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prevTarget);

  // Read pixels
  const pixels = new Uint8Array(pxW * pxH * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, pxW, pxH, pixels);

  // Convert to canvas → PNG data URL
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(pxW, pxH);

  // WebGL pixels are bottom-to-top; flip vertically
  for (let y = 0; y < pxH; y++) {
    const srcRow = (pxH - 1 - y) * pxW * 4;
    const dstRow = y * pxW * 4;
    for (let x = 0; x < pxW * 4; x++) {
      imageData.data[dstRow + x] = pixels[srcRow + x];
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');

  // Cleanup
  renderTarget.dispose();
  planeGeo.dispose();
  material.dispose();

  return { dataUrl, pixelWidth: pxW, pixelHeight: pxH };
}

/** Create a baking material: uses UV-based coordinates instead of triplanar world pos */
function createBakeMaterial(
  config: ProceduralTextureConfig,
  options: BakeOptions,
): THREE.ShaderMaterial {
  const brick = config.brick || DEFAULT_BRICK_PARAMS;
  const stone = config.stone || DEFAULT_STONE_PARAMS;
  const weathering = config.weathering || DEFAULT_WEATHERING;

  // For baking, we simulate world position from UV coordinates
  // UV (0,0)-(1,1) maps to surface dimensions in inches
  const vertexShader = /* glsl */ `
    varying vec2 vUV;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    uniform float uSurfaceWidth;
    uniform float uSurfaceHeight;
    uniform float uWorldYOffset;

    void main() {
      vUV = uv;
      // Simulate world position from UV (for weathering and pattern evaluation)
      vWorldPosition = vec3(uv.x * uSurfaceWidth / 12.0, uWorldYOffset + uv.y * uSurfaceHeight / 12.0, 0.0);
      vWorldNormal = vec3(0.0, 0.0, 1.0); // Flat plane facing camera
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const patternCode = config.type === 'brick' ? brickFragmentGLSL : stoneFragmentGLSL;
  const evalCode = config.type === 'brick'
    ? `BrickResult br = evaluateBrick(surfaceUV); vec3 patternColor = br.color; float patternRoughness = br.roughness; float patternMortar = br.mortar;`
    : `StoneResult st = evaluateStone(surfaceUV); vec3 patternColor = st.color; float patternRoughness = st.roughness; float patternMortar = st.mortar;`;

  const fragmentShader = /* glsl */ `
    ${commonFragmentGLSL}
    ${noiseGLSL}
    ${patternCode}
    ${weatheringFragmentGLSL}

    varying vec2 vUV;
    uniform float uSurfaceWidth;   // inches
    uniform float uSurfaceHeight;  // inches
    uniform float uWorldYOffset;

    void main() {
      // Map UV to surface inches
      vec2 surfaceUV = vUV * vec2(uSurfaceWidth, uSurfaceHeight);

      ${evalCode}

      // Simulate world position for weathering
      vec3 fakeWorldPos = vec3(surfaceUV.x / 12.0, uWorldYOffset + surfaceUV.y / 12.0, 0.0);
      vec3 finalColor = applyWeathering(patternColor, fakeWorldPos, patternMortar, patternRoughness);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Build uniforms
  const uniforms: Record<string, THREE.IUniform> = {
    uSurfaceWidth: { value: options.widthInches },
    uSurfaceHeight: { value: options.heightInches },
    uWorldYOffset: { value: options.worldYOffset || 0 },
  };

  if (config.type === 'brick') {
    const bondMap: Record<string, number> = { running: 0, stack: 1, stretcher: 2, flemish: 3 };
    Object.assign(uniforms, {
      uBondPattern: { value: bondMap[brick.bondPattern] || 0 },
      uBrickWidth: { value: brick.brickWidth },
      uBrickHeight: { value: brick.brickHeight },
      uMortarWidth: { value: brick.mortarWidth },
      uMortarDepth: { value: brick.mortarDepth },
      uBrickColorA: { value: new THREE.Color(brick.brickColorA) },
      uBrickColorB: { value: new THREE.Color(brick.brickColorB) },
      uMortarColor: { value: new THREE.Color(brick.mortarColor) },
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
      uStoneColorA: { value: new THREE.Color(stone.stoneColorA) },
      uStoneColorB: { value: new THREE.Color(stone.stoneColorB) },
      uStoneColorC: { value: new THREE.Color(stone.stoneColorC) },
      uStoneMortarColor: { value: new THREE.Color(stone.mortarColor) },
      uStoneMortarWidth: { value: stone.mortarWidth },
      uSurfaceRoughness: { value: stone.surfaceRoughness },
      uGrainIntensity: { value: stone.grainIntensity },
    });
  }

  // Weathering
  Object.assign(uniforms, {
    uWeatheringEnabled: { value: weathering.enabled },
    uDirtIntensity: { value: weathering.dirtIntensity },
    uDirtColor: { value: new THREE.Color(weathering.dirtColor) },
    uWaterStainIntensity: { value: weathering.waterStainIntensity },
    uMossIntensity: { value: weathering.mossIntensity },
    uMossColor: { value: new THREE.Color(weathering.mossColor) },
    uAgeFactor: { value: weathering.ageFactor },
    uEdgeWearIntensity: { value: weathering.edgeWearIntensity },
  });

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
}

/**
 * Bake all procedural surfaces for a building.
 * Returns a map of surface → BakeResult for surfaces that have procedural textures.
 */
export function bakeAllProceduralTextures(
  renderer: THREE.WebGLRenderer,
  textures: Record<string, any>,
  modelDimensions: { widthInches: number; depthInches: number; heightInches: number },
  dpi: number,
): Map<string, BakeResult> {
  const { isProceduralTexture } = require('@/types/procedural');
  const results = new Map<string, BakeResult>();

  const surfaceDimensions: Record<string, { w: number; h: number; axis: 0 | 1 | 2 }> = {
    frontWall: { w: modelDimensions.widthInches, h: modelDimensions.heightInches, axis: 0 },
    backWall: { w: modelDimensions.widthInches, h: modelDimensions.heightInches, axis: 0 },
    sideWalls: { w: modelDimensions.depthInches, h: modelDimensions.heightInches, axis: 1 },
    roof: { w: modelDimensions.widthInches, h: modelDimensions.depthInches, axis: 2 },
    foundation: { w: modelDimensions.widthInches, h: modelDimensions.depthInches, axis: 2 },
  };

  for (const [surface, texture] of Object.entries(textures)) {
    if (!isProceduralTexture(texture)) continue;
    const dims = surfaceDimensions[surface];
    if (!dims) continue;

    const result = bakeProceduralTexture(renderer, texture, {
      widthInches: dims.w,
      heightInches: dims.h,
      dpi,
      normalAxis: dims.axis,
    });
    results.set(surface, result);
  }

  return results;
}
