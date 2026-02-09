/**
 * TidKit Studio - Scale Detection
 * Detect real-world scale from reference objects in images
 */

import { REFERENCE_CARD, type ScaleDetectionResult } from '@/types/texture';
import { MODEL_SCALES } from '@tidkit/config';

/**
 * Detect scale from an image containing a reference card
 * Uses edge detection to find rectangular reference object
 */
export async function detectScaleFromReference(
  imageData: ImageData
): Promise<ScaleDetectionResult> {
  const { width, height, data } = imageData;

  // Convert to grayscale for edge detection
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grayscale[i / 4] = gray;
  }

  // Simple edge detection using Sobel operator
  const edges = sobelEdgeDetection(grayscale, width, height);

  // Find rectangles in the edge image
  const rectangles = findRectangles(edges, width, height);

  // Look for rectangle matching credit card aspect ratio
  const cardAspect = REFERENCE_CARD.aspectRatio;
  const tolerance = 0.15; // 15% tolerance

  let bestMatch: { rect: Rectangle; confidence: number } | null = null;

  for (const rect of rectangles) {
    const aspect = rect.width / rect.height;
    const aspectDiff = Math.abs(aspect - cardAspect) / cardAspect;

    if (aspectDiff < tolerance) {
      const confidence = 1 - aspectDiff / tolerance;

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { rect, confidence };
      }
    }
  }

  if (!bestMatch) {
    return {
      detected: false,
      confidence: 0,
    };
  }

  // Calculate real-world measurements
  const { rect, confidence } = bestMatch;

  // Pixels per inch based on reference card width
  const pixelsPerInch = rect.width / REFERENCE_CARD.width;

  // Estimate what scale would make this texture work
  // Assuming we want textures at ~300 DPI for printing
  const targetDPI = 300;
  const currentDPI = pixelsPerInch;

  // Find the closest model scale
  const scaleRatio = currentDPI / targetDPI;
  const closestScale = MODEL_SCALES.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev.ratio - scaleRatio * 87); // Relative to HO scale
    const currDiff = Math.abs(curr.ratio - scaleRatio * 87);
    return currDiff < prevDiff ? curr : prev;
  });

  return {
    detected: true,
    scale: closestScale,
    confidence: confidence * 0.8, // Reduce overall confidence slightly
    referenceObject: 'credit card',
    measurements: {
      pixelWidth: rect.width,
      realWidth: REFERENCE_CARD.width,
    },
  };
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Sobel edge detection
 */
function sobelEdgeDetection(
  grayscale: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const edges = new Uint8Array(width * height);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);

          gx += grayscale[idx] * sobelX[kernelIdx];
          gy += grayscale[idx] * sobelY[kernelIdx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = Math.min(255, magnitude);
    }
  }

  return edges;
}

/**
 * Find rectangles in edge image using contour approximation
 * Simplified version - uses connected component analysis
 */
function findRectangles(edges: Uint8Array, width: number, height: number): Rectangle[] {
  const threshold = 100;
  const visited = new Set<number>();
  const rectangles: Rectangle[] = [];

  // Find connected components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      if (edges[idx] > threshold && !visited.has(idx)) {
        // Start flood fill to find component bounds
        const bounds = floodFillBounds(edges, width, height, x, y, threshold, visited);

        // Check if bounds form a reasonable rectangle
        const aspectRatio = bounds.width / bounds.height;
        const minSize = Math.min(width, height) * 0.05; // At least 5% of image
        const maxSize = Math.min(width, height) * 0.8; // At most 80% of image

        if (
          bounds.width > minSize &&
          bounds.height > minSize &&
          bounds.width < maxSize &&
          bounds.height < maxSize &&
          aspectRatio > 0.3 &&
          aspectRatio < 3
        ) {
          rectangles.push(bounds);
        }
      }
    }
  }

  return rectangles;
}

/**
 * Flood fill to find component bounding box
 */
function floodFillBounds(
  edges: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  threshold: number,
  visited: Set<number>
): Rectangle {
  const stack: [number, number][] = [[startX, startY]];

  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited.has(idx)) continue;
    if (edges[idx] <= threshold) continue;

    visited.add(idx);

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // Add neighbors (4-connected)
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Manual scale input - user provides real-world dimensions
 */
export function calculateScaleFromDimensions(
  pixelWidth: number,
  pixelHeight: number,
  realWidthInches: number,
  realHeightInches: number,
  targetDPI = 300
): { dpiX: number; dpiY: number; recommendedScale: typeof MODEL_SCALES[number] } {
  const dpiX = pixelWidth / realWidthInches;
  const dpiY = pixelHeight / realHeightInches;
  const avgDPI = (dpiX + dpiY) / 2;

  // Find scale that would give us closest to target DPI
  const recommendedScale = MODEL_SCALES.reduce((prev, curr) => {
    const prevDiff = Math.abs((avgDPI / prev.ratio) - targetDPI);
    const currDiff = Math.abs((avgDPI / curr.ratio) - targetDPI);
    return currDiff < prevDiff ? curr : prev;
  });

  return { dpiX, dpiY, recommendedScale };
}
