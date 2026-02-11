/**
 * TidKit Builder - Sticker Graphics
 * SVG render functions for 2D sticker accessories.
 * Each sticker returns inline SVG elements positioned at (0,0) origin.
 * Coordinates are in model inches. Caller handles placement and Y-flip.
 */

import type { AccessoryType } from '@/types/building';

export interface StickerGraphic {
  type: AccessoryType;
  /** Hex color used for the 3D preview plane */
  previewColor: string;
  /** Returns SVG element string (no outer <svg> wrapper).
   *  Origin (0,0) is top-left in SVG coordinates.
   *  Width/height are in model inches. */
  render: (width: number, height: number, props: Record<string, any>) => string;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const STICKER_GRAPHICS: Record<string, StickerGraphic> = {
  'sign-flat': {
    type: 'sign-flat',
    previewColor: '#DAA520',
    render: (w, h, props) => {
      const text = escapeXml(props.text || 'SHOP');
      const bg = props.bgColor || '#DAA520';
      const fg = props.textColor || '#FFFFFF';
      const fs = h * 0.45;
      const r = Math.min(w, h) * 0.05;
      return `<rect width="${w}" height="${h}" fill="${bg}" stroke="#333" stroke-width="${w * 0.008}" rx="${r}"/>` +
        `<text x="${w / 2}" y="${h / 2}" fill="${fg}" font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${text}</text>`;
    },
  },

  'house-number': {
    type: 'house-number',
    previewColor: '#333333',
    render: (w, h, props) => {
      const num = escapeXml(String(props.number || '123'));
      const style = props.style || 'modern';
      const bg = style === 'modern' ? '#333333' : '#8B4513';
      const fg = '#FFFFFF';
      const fs = h * 0.6;
      const r = style === 'modern' ? Math.min(w, h) * 0.08 : 0;
      return `<rect width="${w}" height="${h}" fill="${bg}" rx="${r}"/>` +
        `<text x="${w / 2}" y="${h / 2}" fill="${fg}" font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${num}</text>`;
    },
  },

  'shutters': {
    type: 'shutters',
    previewColor: '#2E5930',
    render: (w, h, props) => {
      const color = props.color || '#2E5930';
      const dark = '#1B3D1D';
      const slats = Math.max(3, Math.floor(h / (w * 0.25)));
      const spacing = h / slats;
      let lines = '';
      for (let i = 1; i < slats; i++) {
        const y = i * spacing;
        lines += `<line x1="${w * 0.08}" y1="${y}" x2="${w * 0.92}" y2="${y}" stroke="${dark}" stroke-width="${w * 0.02}"/>`;
      }
      return `<rect width="${w}" height="${h}" fill="${color}" stroke="${dark}" stroke-width="${w * 0.03}"/>` + lines;
    },
  },

  'flower-box': {
    type: 'flower-box',
    previewColor: '#8B4513',
    render: (w, h, props) => {
      const boxColor = props.color || '#8B4513';
      const boxH = h * 0.55;
      const boxY = h - boxH;
      // Planter box
      let svg = `<rect x="0" y="${boxY}" width="${w}" height="${boxH}" fill="${boxColor}" stroke="#5C2D0E" stroke-width="${w * 0.006}"/>`;
      // Soil line
      svg += `<rect x="${w * 0.05}" y="${boxY}" width="${w * 0.9}" height="${boxH * 0.3}" fill="#4A3520"/>`;
      // Simple flower circles
      const flowerColors = ['#FF6B6B', '#FFD93D', '#FF8ED4', '#6BCB77', '#FF6B6B'];
      const flowerCount = Math.max(3, Math.floor(w / (h * 0.5)));
      const spacing = w / (flowerCount + 1);
      for (let i = 0; i < flowerCount; i++) {
        const cx = spacing * (i + 1);
        const cy = boxY * 0.6;
        const r = Math.min(w, h) * 0.12;
        const fc = flowerColors[i % flowerColors.length];
        // Stem
        svg += `<line x1="${cx}" y1="${cy + r}" x2="${cx}" y2="${boxY}" stroke="#2D6A2D" stroke-width="${r * 0.3}"/>`;
        // Petals
        svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fc}"/>`;
        svg += `<circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#FFD700"/>`;
      }
      return svg;
    },
  },

  'light-fixture': {
    type: 'light-fixture',
    previewColor: '#666666',
    render: (w, h, props) => {
      const cx = w / 2;
      // Mounting plate
      let svg = `<rect x="${cx - w * 0.15}" y="0" width="${w * 0.3}" height="${h * 0.15}" fill="#444" rx="${w * 0.02}"/>`;
      // Arm
      svg += `<rect x="${cx - w * 0.04}" y="${h * 0.1}" width="${w * 0.08}" height="${h * 0.3}" fill="#555"/>`;
      // Lamp body
      const lampY = h * 0.35;
      const lampH = h * 0.55;
      svg += `<rect x="${cx - w * 0.3}" y="${lampY}" width="${w * 0.6}" height="${lampH}" fill="#777" stroke="#555" stroke-width="${w * 0.02}" rx="${w * 0.04}"/>`;
      // Glass pane
      svg += `<rect x="${cx - w * 0.22}" y="${lampY + lampH * 0.1}" width="${w * 0.44}" height="${lampH * 0.7}" fill="#FFFFCC" opacity="0.7" rx="${w * 0.02}"/>`;
      // Cap
      svg += `<rect x="${cx - w * 0.35}" y="${lampY - h * 0.03}" width="${w * 0.7}" height="${h * 0.06}" fill="#555" rx="${w * 0.02}"/>`;
      return svg;
    },
  },

  'sticker-banner': {
    type: 'sticker-banner',
    previewColor: '#8B0000',
    render: (w, h, props) => {
      const bg = props.bgColor || '#8B0000';
      const fg = props.textColor || '#FFFFFF';
      const text = escapeXml(props.text || '');
      const border = h * 0.08;
      let svg = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
      svg += `<rect x="0" y="0" width="${w}" height="${border}" fill="${fg}" opacity="0.3"/>`;
      svg += `<rect x="0" y="${h - border}" width="${w}" height="${border}" fill="${fg}" opacity="0.3"/>`;
      if (text) {
        const fs = h * 0.5;
        svg += `<text x="${w / 2}" y="${h / 2}" fill="${fg}" font-family="Arial,Helvetica,sans-serif" ` +
          `font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${text}</text>`;
      }
      return svg;
    },
  },

  'sticker-motif': {
    type: 'sticker-motif',
    previewColor: '#DAA520',
    render: (w, h, props) => {
      const color = props.color || '#DAA520';
      const shape = props.shape || 'diamond';
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.45;
      const ry = h * 0.45;

      switch (shape) {
        case 'star': {
          const points: string[] = [];
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? Math.min(rx, ry) : Math.min(rx, ry) * 0.4;
            points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
          }
          return `<polygon points="${points.join(' ')}" fill="${color}" stroke="#333" stroke-width="${w * 0.01}"/>`;
        }
        case 'cross': {
          const arm = Math.min(rx, ry) * 0.3;
          return `<polygon points="${cx - arm},${cy - ry} ${cx + arm},${cy - ry} ${cx + arm},${cy - arm} ` +
            `${cx + rx},${cy - arm} ${cx + rx},${cy + arm} ${cx + arm},${cy + arm} ` +
            `${cx + arm},${cy + ry} ${cx - arm},${cy + ry} ${cx - arm},${cy + arm} ` +
            `${cx - rx},${cy + arm} ${cx - rx},${cy - arm} ${cx - arm},${cy - arm}" ` +
            `fill="${color}" stroke="#333" stroke-width="${w * 0.01}"/>`;
        }
        default: // diamond
          return `<polygon points="${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}" ` +
            `fill="${color}" stroke="#333" stroke-width="${w * 0.01}"/>`;
      }
    },
  },

  'sticker-poster': {
    type: 'sticker-poster',
    previewColor: '#FFFFF0',
    render: (w, h, props) => {
      const bg = props.bgColor || '#FFFFF0';
      const fg = props.textColor || '#333333';
      const text = escapeXml(props.text || 'WANTED');
      const border = Math.min(w, h) * 0.04;
      const fs = h * 0.18;
      let svg = `<rect width="${w}" height="${h}" fill="${bg}" stroke="#999" stroke-width="${border}"/>`;
      svg += `<text x="${w / 2}" y="${h * 0.22}" fill="${fg}" font-family="Georgia,serif" ` +
        `font-size="${fs}" font-weight="bold" text-anchor="middle" dominant-baseline="central">${text}</text>`;
      // Decorative line
      svg += `<line x1="${w * 0.15}" y1="${h * 0.35}" x2="${w * 0.85}" y2="${h * 0.35}" stroke="${fg}" stroke-width="${border * 0.5}"/>`;
      // Body lines (placeholder text)
      for (let i = 0; i < 4; i++) {
        const y = h * 0.45 + i * h * 0.1;
        const indent = i === 3 ? w * 0.3 : w * 0.15;
        svg += `<line x1="${indent}" y1="${y}" x2="${w - w * 0.15}" y2="${y}" stroke="${fg}" stroke-width="${border * 0.3}" opacity="0.4"/>`;
      }
      return svg;
    },
  },

  'sticker-vent-grill': {
    type: 'sticker-vent-grill',
    previewColor: '#555555',
    render: (w, h, props) => {
      const color = props.color || '#555555';
      const border = Math.min(w, h) * 0.06;
      let svg = `<rect width="${w}" height="${h}" fill="#888" stroke="${color}" stroke-width="${border}" rx="${border}"/>`;
      // Horizontal slats
      const slotCount = Math.max(3, Math.floor(h / (w * 0.15)));
      const slotH = (h - border * 2) / (slotCount * 2);
      for (let i = 0; i < slotCount; i++) {
        const y = border + slotH * (2 * i + 0.5);
        svg += `<rect x="${border * 1.5}" y="${y}" width="${w - border * 3}" height="${slotH * 0.8}" fill="${color}" rx="${slotH * 0.2}"/>`;
      }
      return svg;
    },
  },
};

export function getStickerGraphic(type: AccessoryType): StickerGraphic | undefined {
  return STICKER_GRAPHICS[type];
}

/** Returns true if the given accessory type has a sticker graphic definition */
export function hasStickerGraphic(type: AccessoryType): boolean {
  return type in STICKER_GRAPHICS;
}
