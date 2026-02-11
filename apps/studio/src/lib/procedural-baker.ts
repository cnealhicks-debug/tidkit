/**
 * TidKit Studio - Procedural Texture Baker
 * Generates preview and export PNGs from ProceduralTextureConfig using offscreen Three.js.
 * Reuses the exact same GLSL shaders as Builder via @tidkit/ui.
 */

import * as THREE from 'three';
import type { ProceduralTextureConfig } from '@tidkit/ui/types/procedural';
import { DEFAULT_BRICK_PARAMS, DEFAULT_STONE_PARAMS, DEFAULT_WEATHERING } from '@tidkit/ui/types/procedural';
import { noiseGLSL } from '@tidkit/ui/shaders/noise.glsl';
import { commonFragmentGLSL } from '@tidkit/ui/shaders/common.glsl';
import { brickFragmentGLSL } from '@tidkit/ui/shaders/brick.glsl';
import { stoneFragmentGLSL } from '@tidkit/ui/shaders/stone.glsl';
import { weatheringFragmentGLSL } from '@tidkit/ui/shaders/weathering.glsl';

/** Singleton renderer — lazy initialized */
let _renderer: THREE.WebGLRenderer | null = null;

function getRenderer(): THREE.WebGLRenderer {
  if (!_renderer) {
    const canvas = document.createElement('canvas');
    _renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    _renderer.setPixelRatio(1);
  }
  return _renderer;
}

/** Maximum bake texture dimension */
const MAX_SIZE = 4096;
const MIN_SIZE = 256;

/**
 * Bake a procedural texture preview at the given resolution.
 * Returns a PNG data URL.
 */
export function bakePreview(
  config: ProceduralTextureConfig,
  width = 512,
  height = 512,
): string {
  return bakeTexture(config, width, height);
}

/**
 * Bake a high-resolution procedural texture for export.
 * Width/height in pixels, dpi used for metadata only.
 */
export function bakeExport(
  config: ProceduralTextureConfig,
  width: number,
  height: number,
): string {
  const w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, width));
  const h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, height));
  return bakeTexture(config, w, h);
}

/** Core baking function: renders config to a data URL */
function bakeTexture(
  config: ProceduralTextureConfig,
  pxW: number,
  pxH: number,
): string {
  const renderer = getRenderer();
  renderer.setSize(pxW, pxH, false);

  const renderTarget = new THREE.WebGLRenderTarget(pxW, pxH, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  // Basic lighting for visibility
  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(0, 0, 5);
  scene.add(light);
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const material = createBakeMaterial(config, pxW, pxH);
  const plane = new THREE.Mesh(planeGeo, material);
  scene.add(plane);

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prevTarget);

  // Read pixels
  const pixels = new Uint8Array(pxW * pxH * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, pxW, pxH, pixels);

  // Convert to canvas PNG (flip Y)
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(pxW, pxH);

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

  return dataUrl;
}

/** Create a baking ShaderMaterial: UV-based coordinates (no triplanar) */
function createBakeMaterial(
  config: ProceduralTextureConfig,
  pxW: number,
  pxH: number,
): THREE.ShaderMaterial {
  const brick = config.brick || DEFAULT_BRICK_PARAMS;
  const stone = config.stone || DEFAULT_STONE_PARAMS;
  const weathering = config.weathering || DEFAULT_WEATHERING;

  // Surface dimensions: assume 24" x 24" tile at worldScale
  const surfaceWidth = 24.0 * config.worldScale;
  const surfaceHeight = 24.0 * (pxH / pxW) * config.worldScale;

  const vertexShader = /* glsl */ `
    varying vec2 vUV;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    uniform float uSurfaceWidth;
    uniform float uSurfaceHeight;

    void main() {
      vUV = uv;
      vWorldPosition = vec3(uv.x * uSurfaceWidth / 12.0, uv.y * uSurfaceHeight / 12.0, 0.0);
      vWorldNormal = vec3(0.0, 0.0, 1.0);
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
    uniform float uSurfaceWidth;
    uniform float uSurfaceHeight;

    void main() {
      vec2 surfaceUV = vUV * vec2(uSurfaceWidth, uSurfaceHeight);

      ${evalCode}

      vec3 fakeWorldPos = vec3(surfaceUV.x / 12.0, surfaceUV.y / 12.0, 0.0);
      vec3 finalColor = applyWeathering(patternColor, fakeWorldPos, patternMortar, patternRoughness);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Build uniforms
  const uniforms: Record<string, THREE.IUniform> = {
    uSurfaceWidth: { value: surfaceWidth },
    uSurfaceHeight: { value: surfaceHeight },
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

/** Dispose the singleton renderer (call on unmount if desired) */
export function disposeRenderer(): void {
  if (_renderer) {
    _renderer.dispose();
    _renderer = null;
  }
}
