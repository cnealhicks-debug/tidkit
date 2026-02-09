/**
 * TidKit Studio - Seamless Texture Generator
 * Algorithms for creating tileable textures
 */

export type SeamlessMethod = 'blend' | 'mirror' | 'smart';

export interface SeamlessOptions {
  method: SeamlessMethod;
  blendWidth: number;  // 0-0.5 (percentage of image)
}

/**
 * Make an image seamlessly tileable
 * Works with ImageData from canvas context
 */
export function makeSeamless(
  imageData: ImageData,
  options: SeamlessOptions
): ImageData {
  const { method, blendWidth } = options;

  switch (method) {
    case 'blend':
      return blendSeamless(imageData, blendWidth);
    case 'mirror':
      return mirrorSeamless(imageData);
    case 'smart':
      return smartSeamless(imageData, blendWidth);
    default:
      return imageData;
  }
}

/**
 * Blend edges together using gradient blending
 * Creates smooth transitions at tile boundaries
 */
function blendSeamless(imageData: ImageData, blendWidth: number): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const blendPixelsX = Math.floor(width * blendWidth);
  const blendPixelsY = Math.floor(height * blendWidth);

  // Horizontal blending (left-right edges)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < blendPixelsX; x++) {
      const alpha = x / blendPixelsX;
      const leftIdx = (y * width + x) * 4;
      const rightIdx = (y * width + (width - blendPixelsX + x)) * 4;

      // Blend left edge with right edge
      for (let c = 0; c < 4; c++) {
        const leftValue = data[leftIdx + c];
        const rightValue = data[rightIdx + c];
        const blended = Math.round(leftValue * alpha + rightValue * (1 - alpha));

        result[leftIdx + c] = blended;
        result[rightIdx + c] = Math.round(rightValue * alpha + leftValue * (1 - alpha));
      }
    }
  }

  // Vertical blending (top-bottom edges)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < blendPixelsY; y++) {
      const alpha = y / blendPixelsY;
      const topIdx = (y * width + x) * 4;
      const bottomIdx = ((height - blendPixelsY + y) * width + x) * 4;

      for (let c = 0; c < 4; c++) {
        const topValue = result[topIdx + c];
        const bottomValue = result[bottomIdx + c];
        const blended = Math.round(topValue * alpha + bottomValue * (1 - alpha));

        result[topIdx + c] = blended;
        result[bottomIdx + c] = Math.round(bottomValue * alpha + topValue * (1 - alpha));
      }
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Mirror-based seamless (creates symmetrical pattern)
 * Good for geometric textures
 */
function mirrorSeamless(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;

  // Create double-sized canvas for mirroring
  const newWidth = width * 2;
  const newHeight = height * 2;
  const result = new Uint8ClampedArray(newWidth * newHeight * 4);

  // Copy original to top-left
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        result[dstIdx + c] = data[srcIdx + c];
      }
    }
  }

  // Mirror horizontally to top-right
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + (width - 1 - x)) * 4;
      const dstIdx = (y * newWidth + (width + x)) * 4;
      for (let c = 0; c < 4; c++) {
        result[dstIdx + c] = data[srcIdx + c];
      }
    }
  }

  // Mirror vertically to bottom half
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcIdx = ((height - 1 - y) * newWidth + x) * 4;
      const dstIdx = ((height + y) * newWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        result[dstIdx + c] = result[srcIdx + c];
      }
    }
  }

  return new ImageData(result, newWidth, newHeight);
}

/**
 * Smart seamless using frequency analysis
 * Better for organic textures like wood, stone
 */
function smartSeamless(imageData: ImageData, blendWidth: number): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data);

  const blendPixelsX = Math.floor(width * blendWidth);
  const blendPixelsY = Math.floor(height * blendWidth);

  // Calculate average colors along edges for better matching
  const leftEdgeAvg = getEdgeAverage(data, width, height, 'left', blendPixelsX);
  const rightEdgeAvg = getEdgeAverage(data, width, height, 'right', blendPixelsX);
  const topEdgeAvg = getEdgeAverage(data, width, height, 'top', blendPixelsY);
  const bottomEdgeAvg = getEdgeAverage(data, width, height, 'bottom', blendPixelsY);

  // Apply color correction to minimize edge differences
  const hDiff = [
    rightEdgeAvg[0] - leftEdgeAvg[0],
    rightEdgeAvg[1] - leftEdgeAvg[1],
    rightEdgeAvg[2] - leftEdgeAvg[2],
  ];

  const vDiff = [
    bottomEdgeAvg[0] - topEdgeAvg[0],
    bottomEdgeAvg[1] - topEdgeAvg[1],
    bottomEdgeAvg[2] - topEdgeAvg[2],
  ];

  // Apply gradient color correction across the image
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const xFactor = x / width;
      const yFactor = y / height;

      for (let c = 0; c < 3; c++) {
        let value = data[idx + c];

        // Apply horizontal gradient correction
        value -= hDiff[c] * (xFactor - 0.5);

        // Apply vertical gradient correction
        value -= vDiff[c] * (yFactor - 0.5);

        result[idx + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }

  // Now apply standard blending on the corrected image
  return blendSeamless(new ImageData(result, width, height), blendWidth);
}

/**
 * Get average color of an edge region
 */
function getEdgeAverage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edge: 'left' | 'right' | 'top' | 'bottom',
  size: number
): [number, number, number] {
  let r = 0, g = 0, b = 0, count = 0;

  if (edge === 'left') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  } else if (edge === 'right') {
    for (let y = 0; y < height; y++) {
      for (let x = width - size; x < width; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  } else if (edge === 'top') {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  } else {
    for (let y = height - size; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        count++;
      }
    }
  }

  return [r / count, g / count, b / count];
}

/**
 * Check if an image is already seamless by comparing edges
 */
export function checkSeamless(imageData: ImageData, threshold = 10): boolean {
  const { width, height, data } = imageData;

  // Check horizontal seam (left vs right edge)
  let hDiff = 0;
  for (let y = 0; y < height; y++) {
    const leftIdx = (y * width) * 4;
    const rightIdx = (y * width + width - 1) * 4;
    for (let c = 0; c < 3; c++) {
      hDiff += Math.abs(data[leftIdx + c] - data[rightIdx + c]);
    }
  }
  hDiff /= (height * 3);

  // Check vertical seam (top vs bottom edge)
  let vDiff = 0;
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const bottomIdx = ((height - 1) * width + x) * 4;
    for (let c = 0; c < 3; c++) {
      vDiff += Math.abs(data[topIdx + c] - data[bottomIdx + c]);
    }
  }
  vDiff /= (width * 3);

  return hDiff < threshold && vDiff < threshold;
}
