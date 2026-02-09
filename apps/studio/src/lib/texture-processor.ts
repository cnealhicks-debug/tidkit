/**
 * TidKit Studio - Texture Processor
 * Main interface for texture processing using Web Workers
 */

import type { ProcessingOptions, ProcessingResult, TextureMetadata } from '@/types/texture';
import type { WorkerMessage, WorkerResponse, ColorAdjustments } from './texture-worker';
import type { SeamlessOptions } from './seamless';

/**
 * TextureProcessor class - manages Web Worker for heavy processing
 */
export class TextureProcessor {
  private worker: Worker | null = null;
  private pendingCallbacks: Map<string, (response: WorkerResponse) => void> = new Map();
  private messageId = 0;

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initWorker(): void {
    if (typeof window === 'undefined') return;

    try {
      // Create worker from the worker file
      this.worker = new Worker(
        new URL('./texture-worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        // For now, broadcast to all pending callbacks
        // In production, we'd want to add request IDs
        this.pendingCallbacks.forEach((callback) => {
          callback(e.data);
        });
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };
    } catch (error) {
      console.warn('Web Worker not available, falling back to main thread');
    }
  }

  /**
   * Process an image with the given options
   */
  async processImage(
    image: HTMLImageElement | ImageBitmap,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = performance.now();

    try {
      // Create canvas and get image data
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply color adjustments if any
      if (options.brightness !== 0 || options.contrast !== 0 || options.saturation !== 0) {
        imageData = await this.adjustColors(imageData, {
          brightness: options.brightness,
          contrast: options.contrast,
          saturation: options.saturation,
        });
      }

      // Make seamless if requested
      if (options.makeSeamless) {
        imageData = await this.makeSeamless(imageData, {
          method: options.seamlessMethod,
          blendWidth: options.blendWidth / 100,
        });
      }

      // Convert back to canvas/blob
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = imageData.width;
      resultCanvas.height = imageData.height;
      const resultCtx = resultCanvas.getContext('2d')!;
      resultCtx.putImageData(imageData, 0, 0);

      // Convert to desired format
      const mimeType = `image/${options.outputFormat}`;
      const quality = options.outputFormat === 'png' ? undefined : options.quality / 100;

      const blob = await new Promise<Blob>((resolve) => {
        resultCanvas.toBlob(
          (b) => resolve(b!),
          mimeType,
          quality
        );
      });

      const url = URL.createObjectURL(blob);

      return {
        success: true,
        texture: {
          id: `processed-${Date.now()}`,
          name: 'Processed Texture',
          file: blob,
          url,
          metadata: {} as TextureMetadata, // Will be filled by caller
        },
        processingTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        processingTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Make image seamless using Web Worker
   */
  async makeSeamless(imageData: ImageData, options: SeamlessOptions): Promise<ImageData> {
    if (this.worker) {
      return this.runInWorker<ImageData>({
        type: 'makeSeamless',
        imageData,
        options,
      });
    }

    // Fallback to main thread
    const { makeSeamless } = await import('./seamless');
    return makeSeamless(imageData, options);
  }

  /**
   * Check if image is seamless
   */
  async checkSeamless(imageData: ImageData, threshold = 10): Promise<boolean> {
    if (this.worker) {
      return this.runInWorker<boolean>({
        type: 'checkSeamless',
        imageData,
        threshold,
      });
    }

    const { checkSeamless } = await import('./seamless');
    return checkSeamless(imageData, threshold);
  }

  /**
   * Adjust image colors
   */
  async adjustColors(imageData: ImageData, adjustments: ColorAdjustments): Promise<ImageData> {
    if (this.worker) {
      return this.runInWorker<ImageData>({
        type: 'adjustColors',
        imageData,
        adjustments,
      });
    }

    // Fallback - process on main thread
    return this.adjustColorsMainThread(imageData, adjustments);
  }

  /**
   * Calculate DPI from pixel and real-world dimensions
   */
  calculateDPI(
    pixelWidth: number,
    pixelHeight: number,
    realWidth: number,
    realHeight: number
  ): { dpiX: number; dpiY: number; avgDPI: number } {
    const dpiX = pixelWidth / realWidth;
    const dpiY = pixelHeight / realHeight;
    return { dpiX, dpiY, avgDPI: (dpiX + dpiY) / 2 };
  }

  /**
   * Run a task in the Web Worker
   */
  private runInWorker<T>(message: WorkerMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `${this.messageId++}`;

      const handler = (response: WorkerResponse) => {
        this.pendingCallbacks.delete(id);

        if (response.type === 'error') {
          reject(new Error(response.message));
        } else if ('result' in response) {
          resolve(response.result as T);
        }
      };

      this.pendingCallbacks.set(id, handler);
      this.worker.postMessage(message);
    });
  }

  /**
   * Main thread fallback for color adjustments
   */
  private adjustColorsMainThread(imageData: ImageData, adjustments: ColorAdjustments): ImageData {
    const { width, height, data } = imageData;
    const result = new Uint8ClampedArray(data);

    const { brightness, contrast, saturation } = adjustments;
    const brightnessFactor = brightness / 100;
    const contrastFactor = (100 + contrast) / 100;
    const saturationFactor = (100 + saturation) / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      r += 255 * brightnessFactor;
      g += 255 * brightnessFactor;
      b += 255 * brightnessFactor;

      r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;

      result[i] = Math.max(0, Math.min(255, Math.round(r)));
      result[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      result[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }

    return new ImageData(result, width, height);
  }

  /**
   * Cleanup worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let processor: TextureProcessor | null = null;

export function getTextureProcessor(): TextureProcessor {
  if (!processor) {
    processor = new TextureProcessor();
  }
  return processor;
}
