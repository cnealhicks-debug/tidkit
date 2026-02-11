/**
 * TidKit Builder - Sticker Placement
 * Maps 2D sticker accessories from 3D building coordinates
 * to 2D panel coordinates for SVG rendering.
 */

import type { Accessory, BuildingParams } from '@/types/building';
import { ACCESSORY_PRESETS } from '@/types/building';
import type { Panel, PanelSticker } from './unfold';
import { getStickerGraphic } from './sticker-graphics';

/**
 * Map a 2D sticker accessory onto its target wall panel.
 * Returns the panel ID and a PanelSticker ready for SVG rendering.
 */
export function placeSticker(
  accessory: Accessory,
  params: BuildingParams,
): { targetPanelId: string; sticker: PanelSticker } | null {
  if (accessory.renderMode !== '2d') return null;

  const preset = ACCESSORY_PRESETS.find(p => p.type === accessory.type);
  if (!preset) return null;

  const graphic = getStickerGraphic(accessory.type);
  if (!graphic) return null;

  // Convert feet to model inches: 12 inches/foot ÷ scale ratio
  const feetToModelInches = 12 / params.scale.ratio;

  const stickerW = preset.dimensions.width * feetToModelInches * accessory.scale;
  const stickerH = preset.dimensions.height * feetToModelInches * accessory.scale;

  // Map attachedTo → panel ID
  const panelIdMap: Record<string, string> = {
    'wall-front': 'front-wall',
    'wall-back': 'back-wall',
    'wall-left': 'left-wall',
    'wall-right': 'right-wall',
  };

  const attachedTo = accessory.attachedTo || 'wall-front';
  const targetPanelId = panelIdMap[attachedTo];
  if (!targetPanelId) return null;

  // Position: accessory.position.x = distance from left edge of wall in feet
  //           accessory.position.y = distance from ground level in feet
  const x = accessory.position.x * feetToModelInches;
  const y = accessory.position.y * feetToModelInches;

  const svgContent = graphic.render(stickerW, stickerH, accessory.properties || {});

  return {
    targetPanelId,
    sticker: {
      id: `sticker-${accessory.id}`,
      x,
      y,
      width: stickerW,
      height: stickerH,
      svgContent,
    },
  };
}

/**
 * Attach all 2D sticker accessories to their target panels.
 * For paper material: stickers go on structural wall panels.
 * For thick materials with facades: stickers go on facade panels instead.
 */
export function attachStickersToPanel(
  accessories: Accessory[],
  panels: Panel[],
  facadePanels: Panel[] | undefined,
  params: BuildingParams,
): void {
  const stickers2D = accessories.filter(a => a.renderMode === '2d');
  if (stickers2D.length === 0) return;

  const generatesFacades = params.material?.generateFacades ?? false;

  for (const accessory of stickers2D) {
    const placement = placeSticker(accessory, params);
    if (!placement) continue;

    // Prefer facade panel for thick materials, fall back to structural
    let targetPanel: Panel | undefined;
    if (generatesFacades && facadePanels) {
      targetPanel = facadePanels.find(p => p.id === `facade-${placement.targetPanelId}`);
    }
    if (!targetPanel) {
      targetPanel = panels.find(p => p.id === placement.targetPanelId);
    }

    if (targetPanel) {
      if (!targetPanel.stickers) targetPanel.stickers = [];
      targetPanel.stickers.push(placement.sticker);
    }
  }
}
