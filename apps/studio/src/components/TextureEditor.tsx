'use client';

/**
 * TidKit Studio - Texture Editor Component
 * Canvas-based editor with true-to-scale preview and print-ready export
 *
 * Features:
 * - True-to-scale mode with model railroad, wargaming, and dollhouse presets
 * - Color adjustments (hue, saturation, brightness)
 * - Tile preview modes (1x1, 2x2, 3x3)
 * - Paper size selection (Letter, A4)
 * - High-DPI export for printing
 * - Crop, rotate, and flip tools
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import type { TextureFile } from '@/types/texture';
import { useTextureStore } from '@/stores/textureStore';

export interface TextureEditorProps {
  texture: TextureFile;
  onSave: (editedTexture: TextureFile) => void;
  onCancel: () => void;
  isFullPage?: boolean; // When true, renders inline instead of as a modal
}

type EditorMode = 'preview' | 'edit';
type Tool = 'select' | 'crop' | 'rotate' | 'pan';
type TileMode = 1 | 2 | 3;
type PaperSize = 'letter' | 'a4';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColorSettings {
  hue: number;        // -180 to 180 degrees
  saturation: number; // 0 to 200 (100 = normal)
  brightness: number; // 0 to 200 (100 = normal)
  contrast: number;   // 0 to 200 (100 = normal)
  temperature: number; // -100 to 100 (negative = cooler/blue, positive = warmer/orange)
}

interface WeatheringSettings {
  dirt: number;        // 0-100: adds brown/gray overlay
  rust: number;        // 0-100: adds orange-brown spots
  fade: number;        // 0-100: desaturates and lightens
  grime: number;       // 0-100: darkens edges and crevices
  waterStains: number; // 0-100: vertical streak patterns
}

interface TileOffsetSettings {
  x: number;  // 0-100: horizontal offset percentage
  y: number;  // 0-100: vertical offset percentage
}

// Paper dimensions in inches
const PAPER_SIZES = {
  letter: { width: 8.5, height: 11, label: 'Letter (8.5×11")' },
  a4: { width: 8.27, height: 11.69, label: 'A4 (210×297mm)' },
};

// Scale presets organized by category
const SCALE_PRESETS = {
  'Model Railroad': [
    { name: 'Z', ratio: 220, label: '1:220' },
    { name: 'N', ratio: 160, label: '1:160' },
    { name: 'HO', ratio: 87, label: '1:87' },
    { name: 'S', ratio: 64, label: '1:64' },
    { name: 'O', ratio: 48, label: '1:48' },
    { name: 'G', ratio: 22, label: '1:22.5' },
  ],
  'Wargaming': [
    { name: '6mm', ratio: 285, label: '1:285' },
    { name: '10mm', ratio: 160, label: '1:160' },
    { name: '15mm', ratio: 100, label: '1:100' },
    { name: '20mm', ratio: 72, label: '1:72' },
    { name: '28mm', ratio: 56, label: '1:56' },
    { name: '32mm', ratio: 48, label: '1:48' },
  ],
  'Dollhouse': [
    { name: '1:48', ratio: 48, label: '1:48 (Quarter)' },
    { name: '1:24', ratio: 24, label: '1:24 (Half)' },
    { name: '1:12', ratio: 12, label: '1:12 (Standard)' },
    { name: '1:6', ratio: 6, label: '1:6 (Playscale)' },
  ],
};

export function TextureEditor({ texture, onSave, onCancel, isFullPage = false }: TextureEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Get real-world dimensions from store
  const { realWidth, realHeight, selectedScale } = useTextureStore();

  // Mode: preview (true-to-scale) vs edit (crop/rotate)
  const [mode, setMode] = useState<EditorMode>('preview');

  // True-to-scale settings
  const [useTrueScale, setUseTrueScale] = useState(true);
  const [scaleRatio, setScaleRatio] = useState(selectedScale?.ratio || 87);
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  const [tileMode, setTileMode] = useState<TileMode>(1);
  const [outputDpi, setOutputDpi] = useState(300);

  // Color adjustments
  const [colors, setColors] = useState<ColorSettings>({
    hue: 0,
    saturation: 100,
    brightness: 100,
    contrast: 100,
    temperature: 0,
  });

  // Weathering effects
  const [weathering, setWeathering] = useState<WeatheringSettings>({
    dirt: 0,
    rust: 0,
    fade: 0,
    grime: 0,
    waterStains: 0,
  });

  // Tile offset for avoiding repetition
  const [tileOffset, setTileOffset] = useState<TileOffsetSettings>({
    x: 0,
    y: 0,
  });

  // Edit mode state
  const [tool, setTool] = useState<Tool>('select');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Check if texture has true-to-scale metadata
  const hasTrueScale = realWidth > 0 && realHeight > 0;

  // Calculate tile print size
  const getTilePrintSizeInches = useCallback(() => {
    if (!hasTrueScale) return null;
    return {
      width: realWidth / scaleRatio,
      height: realHeight / scaleRatio,
    };
  }, [hasTrueScale, realWidth, realHeight, scaleRatio]);

  const getTilePrintSizeMm = useCallback(() => {
    const inches = getTilePrintSizeInches();
    if (!inches) return null;
    return {
      width: inches.width * 25.4,
      height: inches.height * 25.4,
    };
  }, [getTilePrintSizeInches]);

  // Load image on mount
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      initCanvas();
    };
    img.src = texture.url;
  }, [texture.url]);

  // Initialize canvas with image
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    saveToHistory();
  }, []);

  // Render preview canvas (true-to-scale mode)
  const renderPreview = useCallback(() => {
    const previewCanvas = previewCanvasRef.current;
    const sourceCanvas = canvasRef.current;
    if (!previewCanvas || !sourceCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on paper size
    const container = containerRef.current;
    if (!container) return;

    const paper = PAPER_SIZES[paperSize];
    const aspectRatio = paper.height / paper.width;
    const width = Math.min(container.clientWidth - 32, 800);
    const height = width * aspectRatio;

    previewCanvas.width = width * window.devicePixelRatio;
    previewCanvas.height = height * window.devicePixelRatio;
    previewCanvas.style.width = width + 'px';
    previewCanvas.style.height = height + 'px';

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate tile size
    let tileSize: number;

    if (tileMode > 1) {
      // Tile preview mode: show NxN tiles
      tileSize = width / tileMode;
    } else if (useTrueScale && hasTrueScale) {
      // True-to-scale mode
      const tilePrintInches = realWidth / scaleRatio;
      const tilesAcrossPage = paper.width / tilePrintInches;
      tileSize = width / tilesAcrossPage;
    } else {
      // Default: 100px base tile size
      tileSize = 100;
    }

    // Apply color filters
    ctx.filter = `hue-rotate(${colors.hue}deg) saturate(${colors.saturation}%) brightness(${colors.brightness}%) contrast(${colors.contrast}%)`;

    // Calculate tile offset
    const offsetX = (tileOffset.x / 100) * tileSize;
    const offsetY = (tileOffset.y / 100) * tileSize;

    // Draw tiled pattern with offset
    const cols = Math.ceil((width + tileSize) / tileSize) + 1;
    const rows = Math.ceil((height + tileSize) / tileSize) + 1;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        ctx.drawImage(
          sourceCanvas,
          col * tileSize + offsetX,
          row * tileSize + offsetY,
          tileSize,
          tileSize
        );
      }
    }

    // Reset filter
    ctx.filter = 'none';

    // Apply weathering effects
    applyWeatheringEffects(ctx, width, height);

    // Draw tile grid lines in tile preview mode
    if (tileMode > 1) {
      drawTileGrid(ctx, width, height, tileSize);
    }
  }, [paperSize, tileMode, useTrueScale, hasTrueScale, realWidth, scaleRatio, colors, tileOffset, weathering]);

  // Apply weathering effects and temperature to canvas (pixel-level adjustments)
  const applyWeatheringEffects = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Skip if no effects applied
    const hasWeathering = weathering.dirt > 0 || weathering.rust > 0 ||
                          weathering.fade > 0 || weathering.grime > 0 ||
                          weathering.waterStains > 0;
    const hasTemperature = colors.temperature !== 0;
    if (!hasWeathering && !hasTemperature) return;

    // Get current image data
    const imageData = ctx.getImageData(0, 0, width * window.devicePixelRatio, height * window.devicePixelRatio);
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    // Create noise pattern for effects (seeded for consistency)
    const noise = new Float32Array(w * h);
    for (let i = 0; i < noise.length; i++) {
      noise[i] = Math.random();
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        const noiseVal = noise[y * w + x];

        // Fade effect: desaturate and lighten
        if (weathering.fade > 0) {
          const fadeAmount = weathering.fade / 100;
          const gray = (r + g + b) / 3;
          r = r + (gray - r) * fadeAmount * 0.5 + fadeAmount * 20;
          g = g + (gray - g) * fadeAmount * 0.5 + fadeAmount * 20;
          b = b + (gray - b) * fadeAmount * 0.5 + fadeAmount * 20;
        }

        // Dirt effect: add brown/gray overlay
        if (weathering.dirt > 0) {
          const dirtAmount = (weathering.dirt / 100) * noiseVal * 0.4;
          r = r * (1 - dirtAmount) + 80 * dirtAmount;
          g = g * (1 - dirtAmount) + 60 * dirtAmount;
          b = b * (1 - dirtAmount) + 40 * dirtAmount;
        }

        // Rust effect: orange-brown spots
        if (weathering.rust > 0) {
          const rustThreshold = 1 - (weathering.rust / 100) * 0.3;
          if (noiseVal > rustThreshold) {
            const rustIntensity = (noiseVal - rustThreshold) / (1 - rustThreshold);
            r = r * (1 - rustIntensity * 0.6) + 180 * rustIntensity * 0.6;
            g = g * (1 - rustIntensity * 0.6) + 80 * rustIntensity * 0.6;
            b = b * (1 - rustIntensity * 0.6) + 20 * rustIntensity * 0.6;
          }
        }

        // Grime effect: darken edges (simple vignette-like)
        if (weathering.grime > 0) {
          const edgeX = Math.min(x, w - x) / (w / 2);
          const edgeY = Math.min(y, h - y) / (h / 2);
          const edgeFactor = Math.min(edgeX, edgeY);
          const grimeDarken = (1 - edgeFactor) * (weathering.grime / 100) * 0.3;
          r = r * (1 - grimeDarken);
          g = g * (1 - grimeDarken);
          b = b * (1 - grimeDarken);
        }

        // Water stains: vertical streaks
        if (weathering.waterStains > 0) {
          const streakNoise = Math.sin(x * 0.1 + noiseVal * 10) * 0.5 + 0.5;
          const verticalFade = y / h;
          const streakIntensity = streakNoise * verticalFade * (weathering.waterStains / 100) * 0.2;
          r = r * (1 - streakIntensity) + 60 * streakIntensity;
          g = g * (1 - streakIntensity) + 50 * streakIntensity;
          b = b * (1 - streakIntensity) + 45 * streakIntensity;
        }

        // Temperature effect: shift colors warm (orange) or cool (blue)
        if (colors.temperature !== 0) {
          const tempAmount = colors.temperature / 100;
          if (tempAmount > 0) {
            // Warm: increase red/yellow, decrease blue
            r = r + tempAmount * 30;
            g = g + tempAmount * 10;
            b = b - tempAmount * 20;
          } else {
            // Cool: increase blue, decrease red/yellow
            r = r + tempAmount * 20;
            g = g + tempAmount * 5;
            b = b - tempAmount * 30;
          }
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [weathering, colors.temperature]);

  // Draw tile grid lines
  const drawTileGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, tileSize: number) => {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (let x = tileSize; x < width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = tileSize; y < height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  // Re-render preview when settings change
  useEffect(() => {
    if (mode === 'preview' && imageRef.current) {
      renderPreview();
    }
  }, [mode, renderPreview]);

  // Draw image with transforms for edit mode
  const drawImage = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(img, 0, 0);
    ctx.restore();

    if (cropArea && tool === 'crop') {
      drawCropOverlay(ctx, cropArea);
    }
  }, [rotation, flipH, flipV, cropArea, tool]);

  // Draw crop overlay
  const drawCropOverlay = (ctx: CanvasRenderingContext2D, area: CropArea) => {
    const canvas = ctx.canvas;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, area.y);
    ctx.fillRect(0, area.y, area.x, area.height);
    ctx.fillRect(area.x + area.width, area.y, canvas.width - area.x - area.width, area.height);
    ctx.fillRect(0, area.y + area.height, canvas.width, canvas.height - area.y - area.height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.width, area.height);

    const handleSize = 10;
    ctx.fillStyle = '#3b82f6';
    const corners = [
      { x: area.x, y: area.y },
      { x: area.x + area.width, y: area.y },
      { x: area.x, y: area.y + area.height },
      { x: area.x + area.width, y: area.y + area.height },
    ];
    corners.forEach(({ x, y }) => {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });

    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const x = area.x + (area.width * i) / 3;
      const y = area.y + (area.height * i) / 3;
      ctx.beginPath();
      ctx.moveTo(x, area.y);
      ctx.lineTo(x, area.y + area.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }
  };

  // Redraw when edit transforms change
  useEffect(() => {
    if (mode === 'edit') {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawImage(ctx, img);
    }
  }, [mode, rotation, flipH, flipV, cropArea, tool, drawImage]);

  // Save to history
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newIndex = historyIndex - 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newIndex = historyIndex + 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
    }
  };

  // Edit operations
  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
    saveToHistory();
  };

  const handleFlipH = () => {
    setFlipH((prev) => !prev);
    saveToHistory();
  };

  const handleFlipV = () => {
    setFlipV((prev) => !prev);
    saveToHistory();
  };

  const startCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setTool('crop');
    setCropArea({
      x: canvas.width * 0.1,
      y: canvas.height * 0.1,
      width: canvas.width * 0.8,
      height: canvas.height * 0.8,
    });
  };

  const applyCrop = () => {
    if (!cropArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const croppedData = ctx.getImageData(
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height
    );

    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    ctx.putImageData(croppedData, 0, 0);

    setCropArea(null);
    setTool('select');
    saveToHistory();
  };

  const cancelCrop = () => {
    setCropArea(null);
    setTool('select');
  };

  // Mouse handlers for crop
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'crop' || !cropArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || tool !== 'crop' || !cropArea) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    setCropArea((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        x: Math.max(0, Math.min(canvas.width - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(canvas.height - prev.height, prev.y + dy)),
      };
    });

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset color adjustments
  const resetColors = () => {
    setColors({ hue: 0, saturation: 100, brightness: 100, contrast: 100, temperature: 0 });
  };

  // Reset weathering effects
  const resetWeathering = () => {
    setWeathering({ dirt: 0, rust: 0, fade: 0, grime: 0, waterStains: 0 });
  };

  // Reset tile offset
  const resetTileOffset = () => {
    setTileOffset({ x: 0, y: 0 });
  };

  // Export as high-DPI image
  const exportAsDataURL = async (format: 'jpeg' | 'png' = 'jpeg', quality: number = 0.95): Promise<string> => {
    const exportCanvas = document.createElement('canvas');
    const paper = PAPER_SIZES[paperSize];

    exportCanvas.width = paper.width * outputDpi;
    exportCanvas.height = paper.height * outputDpi;

    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) throw new Error('Failed to get export context');

    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) throw new Error('Source canvas not available');

    // Calculate tile size for export
    let tileSize: number;

    if (useTrueScale && hasTrueScale) {
      const tilePrintInches = realWidth / scaleRatio;
      tileSize = tilePrintInches * outputDpi;
    } else {
      tileSize = outputDpi; // 1 inch at target DPI
    }

    // Calculate tile offset for export
    const offsetX = (tileOffset.x / 100) * tileSize;
    const offsetY = (tileOffset.y / 100) * tileSize;

    // Apply color filters
    exportCtx.filter = `hue-rotate(${colors.hue}deg) saturate(${colors.saturation}%) brightness(${colors.brightness}%)`;

    // Draw tiles with offset
    const cols = Math.ceil((exportCanvas.width + tileSize) / tileSize) + 1;
    const rows = Math.ceil((exportCanvas.height + tileSize) / tileSize) + 1;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        exportCtx.drawImage(
          sourceCanvas,
          col * tileSize + offsetX,
          row * tileSize + offsetY,
          tileSize,
          tileSize
        );
      }
    }

    exportCtx.filter = 'none';

    // Apply weathering effects to export
    applyWeatheringEffects(exportCtx, exportCanvas.width, exportCanvas.height);

    return exportCanvas.toDataURL(`image/${format}`, quality);
  };

  // Handle download
  const handleDownload = async (format: 'jpeg' | 'png') => {
    try {
      const dataUrl = await exportAsDataURL(format, format === 'jpeg' ? 0.95 : undefined);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${texture.name.replace(/[^a-z0-9]/gi, '-')}-${scaleRatio}scale.${format}`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Save edited texture
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    const url = URL.createObjectURL(blob);

    const editedTexture: TextureFile = {
      ...texture,
      id: `edited-${Date.now()}`,
      name: texture.name.replace(/\.[^.]+$/, '') + '-edited.png',
      file: blob,
      url,
      metadata: {
        ...texture.metadata,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
      },
    };

    onSave(editedTexture);
  };

  const tileSizeInches = getTilePrintSizeInches();
  const tileSizeMm = getTilePrintSizeMm();

  return (
    <div className={`${isFullPage ? 'flex-1' : 'fixed inset-0 z-50'} bg-gray-900 flex flex-col`}>
      {/* Top Toolbar */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Back button for full page mode */}
          {isFullPage && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-white mr-2"
              title="Back to Library"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}

          {/* Texture name */}
          <span className="text-white font-medium mr-4 truncate max-w-[200px]" title={texture.name}>
            {texture.name}
          </span>

          {/* Mode toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setMode('preview')}
              className={`px-3 py-1 text-sm rounded ${mode === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`px-3 py-1 text-sm rounded ${mode === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Edit
            </button>
          </div>

          {mode === 'edit' && (
            <>
              <div className="w-px h-6 bg-gray-700 mx-2" />
              {/* Undo/Redo */}
              <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-50" title="Undo">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-gray-400 hover:text-white disabled:opacity-50" title="Redo">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>

              <div className="w-px h-6 bg-gray-700 mx-2" />

              {/* Rotate/Flip */}
              <button onClick={() => handleRotate(-90)} className="p-2 text-gray-400 hover:text-white" title="Rotate Left">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={() => handleRotate(90)} className="p-2 text-gray-400 hover:text-white" title="Rotate Right">
                <svg className="w-5 h-5 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={handleFlipH} className={`p-2 ${flipH ? 'text-blue-400' : 'text-gray-400'} hover:text-white`} title="Flip Horizontal">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              <button onClick={handleFlipV} className={`p-2 ${flipV ? 'text-blue-400' : 'text-gray-400'} hover:text-white`} title="Flip Vertical">
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>

              <div className="w-px h-6 bg-gray-700 mx-2" />

              {/* Crop */}
              {tool === 'crop' ? (
                <>
                  <button onClick={applyCrop} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Apply Crop</button>
                  <button onClick={cancelCrop} className="px-3 py-1.5 text-gray-400 text-sm hover:text-white">Cancel</button>
                </>
              ) : (
                <button onClick={startCrop} className="p-2 text-gray-400 hover:text-white" title="Crop">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3V3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v18M3 9h18" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasTrueScale && (
            <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
              ✓ True Scale
            </span>
          )}
          <span className="text-sm text-gray-400">
            {canvasRef.current?.width} × {canvasRef.current?.height}px
          </span>
          {!isFullPage && (
            <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">
              Cancel
            </button>
          )}
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {isFullPage ? 'Save to Library' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-8">
          {mode === 'preview' ? (
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <canvas ref={previewCanvasRef} className="block" />
            </div>
          ) : (
            <div
              className="relative bg-[repeating-conic-gradient(#374151_0%_25%,#1f2937_0%_50%)] bg-[length:20px_20px]"
              style={{ transform: `scale(${zoom})` }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          )}
          {/* Hidden source canvas */}
          {mode === 'preview' && <canvas ref={canvasRef} className="hidden" />}
        </div>

        {/* Right sidebar - Controls */}
        {mode === 'preview' && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Scale Controls */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Scale</h3>
                  {hasTrueScale && (
                    <button
                      onClick={() => setUseTrueScale(!useTrueScale)}
                      className={`text-xs px-2 py-1 rounded ${useTrueScale ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                    >
                      {useTrueScale ? 'True Scale' : 'Custom'}
                    </button>
                  )}
                </div>

                {hasTrueScale && useTrueScale ? (
                  <>
                    <p className="text-xs text-gray-400 mb-3">
                      Texture covers {realWidth}" × {realHeight}" of real-world surface.
                    </p>

                    {Object.entries(SCALE_PRESETS).map(([category, presets]) => (
                      <div key={category} className="mb-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{category}</p>
                        <div className="grid grid-cols-4 gap-1">
                          {presets.slice(0, 4).map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => setScaleRatio(preset.ratio)}
                              className={`px-2 py-1.5 border rounded text-xs ${scaleRatio === preset.ratio ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                              title={preset.label}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Custom ratio input */}
                    <div className="mt-3">
                      <label className="text-xs text-gray-400">Custom Ratio</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-400">1:</span>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={scaleRatio}
                          onChange={(e) => setScaleRatio(parseInt(e.target.value) || 87)}
                          className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white"
                        />
                      </div>
                    </div>

                    {/* Scale info display */}
                    {tileSizeInches && tileSizeMm && (
                      <div className="mt-3 p-3 bg-blue-900/30 rounded-lg">
                        <p className="text-xs font-medium text-blue-300">1:{scaleRatio} Scale</p>
                        <p className="text-xs text-blue-200 mt-1">
                          Tile size: {tileSizeInches.width.toFixed(3)}" × {tileSizeInches.height.toFixed(3)}"
                        </p>
                        <p className="text-xs text-blue-200">
                          ({tileSizeMm.width.toFixed(1)}mm × {tileSizeMm.height.toFixed(1)}mm)
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">
                    No true-scale data available. Set real-world dimensions in Scale Controls.
                  </p>
                )}
              </div>

              {/* Tile Preview Mode */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Tile Preview</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as TileMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTileMode(m)}
                      className={`px-3 py-2 border rounded text-sm ${tileMode === m ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                    >
                      {m === 1 ? 'Normal' : `${m}×${m}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Adjustments */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Color</h3>
                  <button onClick={resetColors} className="text-xs text-blue-400 hover:text-blue-300">Reset</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400">Hue: {colors.hue}°</label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={colors.hue}
                      onChange={(e) => setColors({ ...colors, hue: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Saturation: {colors.saturation}%</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={colors.saturation}
                      onChange={(e) => setColors({ ...colors, saturation: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Brightness: {colors.brightness}%</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={colors.brightness}
                      onChange={(e) => setColors({ ...colors, brightness: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Contrast: {colors.contrast}%</label>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={colors.contrast}
                      onChange={(e) => setColors({ ...colors, contrast: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Temperature: {colors.temperature > 0 ? '+' : ''}{colors.temperature}</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={colors.temperature}
                      onChange={(e) => setColors({ ...colors, temperature: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                      <span>Cool</span>
                      <span>Warm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weathering Effects */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Weathering</h3>
                  <button onClick={resetWeathering} className="text-xs text-blue-400 hover:text-blue-300">Reset</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400">Dirt: {weathering.dirt}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weathering.dirt}
                      onChange={(e) => setWeathering({ ...weathering, dirt: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Rust: {weathering.rust}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weathering.rust}
                      onChange={(e) => setWeathering({ ...weathering, rust: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Fade: {weathering.fade}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weathering.fade}
                      onChange={(e) => setWeathering({ ...weathering, fade: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Grime: {weathering.grime}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weathering.grime}
                      onChange={(e) => setWeathering({ ...weathering, grime: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Water Stains: {weathering.waterStains}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weathering.waterStains}
                      onChange={(e) => setWeathering({ ...weathering, waterStains: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Add realistic aging effects for model buildings
                </p>
              </div>

              {/* Tile Offset */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">Tile Offset</h3>
                  <button onClick={resetTileOffset} className="text-xs text-blue-400 hover:text-blue-300">Reset</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400">Horizontal: {tileOffset.x}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tileOffset.x}
                      onChange={(e) => setTileOffset({ ...tileOffset, x: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Vertical: {tileOffset.y}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tileOffset.y}
                      onChange={(e) => setTileOffset({ ...tileOffset, y: parseInt(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Shift tiles to avoid obvious pattern repetition
                </p>
              </div>

              {/* Paper Size */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Paper Size</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PAPER_SIZES) as [PaperSize, typeof PAPER_SIZES['letter']][]).map(([size, config]) => (
                    <button
                      key={size}
                      onClick={() => setPaperSize(size)}
                      className={`px-3 py-2 border rounded text-xs ${paperSize === size ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Export</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleDownload('jpeg')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Download JPEG ({outputDpi} DPI)
                  </button>
                  <button
                    onClick={() => handleDownload('png')}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 text-sm font-medium"
                  >
                    Download PNG ({outputDpi} DPI)
                  </button>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400">Output DPI</label>
                  <select
                    value={outputDpi}
                    onChange={(e) => setOutputDpi(parseInt(e.target.value))}
                    className="w-full mt-1 px-2 py-1.5 bg-gray-600 border border-gray-500 rounded text-sm text-white"
                  >
                    <option value="150">150 DPI (Draft)</option>
                    <option value="300">300 DPI (Standard)</option>
                    <option value="600">600 DPI (High Quality)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar - Edit mode only */}
      {mode === 'edit' && (
        <div className="h-10 bg-gray-800 border-t border-gray-700 flex items-center justify-center gap-4 px-4">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="p-1 text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm text-gray-400 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-1 text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-white border border-gray-600 rounded"
          >
            100%
          </button>
          <button
            onClick={() => {
              const container = containerRef.current;
              const canvas = canvasRef.current;
              if (!container || !canvas) return;
              const scale = Math.min(
                (container.clientWidth - 64) / canvas.width,
                (container.clientHeight - 64) / canvas.height
              );
              setZoom(scale);
            }}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-white border border-gray-600 rounded"
          >
            Fit
          </button>
        </div>
      )}
    </div>
  );
}
