/**
 * TidKit Studio - Texture Processing Web Worker
 * Runs heavy image processing off the main thread
 */

import { makeSeamless, checkSeamless, type SeamlessOptions } from './seamless';

export type WorkerMessage =
  | { type: 'makeSeamless'; imageData: ImageData; options: SeamlessOptions }
  | { type: 'checkSeamless'; imageData: ImageData; threshold?: number }
  | { type: 'adjustColors'; imageData: ImageData; adjustments: ColorAdjustments }
  | { type: 'resize'; imageData: ImageData; width: number; height: number; method: ResizeMethod }
  | { type: 'calculateDPI'; pixelWidth: number; pixelHeight: number; realWidth: number; realHeight: number };

export type WorkerResponse =
  | { type: 'makeSeamless'; result: ImageData }
  | { type: 'checkSeamless'; result: boolean }
  | { type: 'adjustColors'; result: ImageData }
  | { type: 'resize'; result: ImageData }
  | { type: 'calculateDPI'; result: { dpiX: number; dpiY: number; avgDPI: number } }
  | { type: 'error'; message: string };

export interface ColorAdjustments {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
}

export type ResizeMethod = 'nearest' | 'bilinear' | 'bicubic';

// Worker message handler
self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { data } = e;

  try {
    switch (data.type) {
      case 'makeSeamless': {
        const result = makeSeamless(data.imageData, data.options);
        self.postMessage({ type: 'makeSeamless', result } as WorkerResponse);
        break;
      }

      case 'checkSeamless': {
        const result = checkSeamless(data.imageData, data.threshold);
        self.postMessage({ type: 'checkSeamless', result } as WorkerResponse);
        break;
      }

      case 'adjustColors': {
        const result = adjustColors(data.imageData, data.adjustments);
        self.postMessage({ type: 'adjustColors', result } as WorkerResponse);
        break;
      }

      case 'resize': {
        const result = resizeImage(data.imageData, data.width, data.height, data.method);
        self.postMessage({ type: 'resize', result } as WorkerResponse);
        break;
      }

      case 'calculateDPI': {
        const dpiX = data.pixelWidth / data.realWidth;
        const dpiY = data.pixelHeight / data.realHeight;
        const avgDPI = (dpiX + dpiY) / 2;
        self.postMessage({ type: 'calculateDPI', result: { dpiX, dpiY, avgDPI } } as WorkerResponse);
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
};

/**
 * Adjust image colors (brightness, contrast, saturation)
 */
function adjustColors(imageData: ImageData, adjustments: ColorAdjustments): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const { brightness, contrast, saturation } = adjustments;

  // Pre-calculate factors
  const brightnessFactor = brightness / 100;
  const contrastFactor = (100 + contrast) / 100;
  const saturationFactor = (100 + saturation) / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply brightness
    r += 255 * brightnessFactor;
    g += 255 * brightnessFactor;
    b += 255 * brightnessFactor;

    // Apply contrast
    r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

    // Apply saturation
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = gray + (r - gray) * saturationFactor;
    g = gray + (g - gray) * saturationFactor;
    b = gray + (b - gray) * saturationFactor;

    // Clamp values
    result[i] = Math.max(0, Math.min(255, Math.round(r)));
    result[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    result[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  return new ImageData(result, width, height);
}

/**
 * Resize image using specified method
 */
function resizeImage(
  imageData: ImageData,
  newWidth: number,
  newHeight: number,
  method: ResizeMethod
): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(newWidth * newHeight * 4);

  const xRatio = width / newWidth;
  const yRatio = height / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const dstIdx = (y * newWidth + x) * 4;

      if (method === 'nearest') {
        // Nearest neighbor
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        const srcIdx = (srcY * width + srcX) * 4;

        for (let c = 0; c < 4; c++) {
          result[dstIdx + c] = data[srcIdx + c];
        }
      } else if (method === 'bilinear') {
        // Bilinear interpolation
        const srcX = x * xRatio;
        const srcY = y * yRatio;

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);

        const xWeight = srcX - x0;
        const yWeight = srcY - y0;

        for (let c = 0; c < 4; c++) {
          const topLeft = data[(y0 * width + x0) * 4 + c];
          const topRight = data[(y0 * width + x1) * 4 + c];
          const bottomLeft = data[(y1 * width + x0) * 4 + c];
          const bottomRight = data[(y1 * width + x1) * 4 + c];

          const top = topLeft + (topRight - topLeft) * xWeight;
          const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight;
          const value = top + (bottom - top) * yWeight;

          result[dstIdx + c] = Math.round(value);
        }
      } else {
        // Bicubic interpolation
        const srcX = x * xRatio;
        const srcY = y * yRatio;

        for (let c = 0; c < 4; c++) {
          result[dstIdx + c] = bicubicInterpolate(data, width, height, srcX, srcY, c);
        }
      }
    }
  }

  return new ImageData(result, newWidth, newHeight);
}

/**
 * Bicubic interpolation for a single channel
 */
function bicubicInterpolate(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number
): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);

  const dx = x - xi;
  const dy = y - yi;

  // Get 4x4 neighborhood
  const samples: number[][] = [];
  for (let j = -1; j <= 2; j++) {
    const row: number[] = [];
    for (let i = -1; i <= 2; i++) {
      const px = Math.max(0, Math.min(width - 1, xi + i));
      const py = Math.max(0, Math.min(height - 1, yi + j));
      row.push(data[(py * width + px) * 4 + channel]);
    }
    samples.push(row);
  }

  // Cubic interpolation
  const interpolateRow = (row: number[], t: number) => {
    const a = row[1];
    const b = row[2];
    const c = 0.5 * (-row[0] + row[2]);
    const d = 0.5 * (2 * row[0] - 5 * row[1] + 4 * row[2] - row[3]);
    const e = 0.5 * (-row[0] + 3 * row[1] - 3 * row[2] + row[3]);

    return a + c * t + d * t * t + e * t * t * t;
  };

  const colValues = samples.map(row => interpolateRow(row, dx));
  const result = interpolateRow(colValues, dy);

  return Math.max(0, Math.min(255, Math.round(result)));
}
