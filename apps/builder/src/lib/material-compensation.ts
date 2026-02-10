/**
 * TidKit Builder - Material Thickness Compensation
 * Utilities for adjusting panel dimensions based on material thickness and joint method
 */

import type { JointMethod } from '@/types/building';
import type { Point2D } from './unfold';

/**
 * Butt joint dimension compensation.
 * For butt joints, panels that sit between two others need to be shorter
 * by 2x the material thickness (one thickness per side).
 *
 * Convention: front/back panels are full width, left/right panels are shortened.
 */
export function compensateButtJoint(
  panelWidth: number,
  panelHeight: number,
  wallSide: 'front' | 'back' | 'left' | 'right',
  materialThickness: number
): { width: number; height: number } {
  if (wallSide === 'left' || wallSide === 'right') {
    // Side panels sit between front and back, so subtract 2x thickness from width
    return {
      width: panelWidth - 2 * materialThickness,
      height: panelHeight,
    };
  }
  // Front and back panels are full width
  return { width: panelWidth, height: panelHeight };
}

/**
 * Miter joint dimension compensation.
 * For mitered joints, all panels keep their full outer dimensions.
 * Each panel's mating edges are cut at 45° so they meet cleanly.
 * No dimensional shortening needed — the bevel removes material at the edge.
 */
export function compensateMiterJoint(
  panelWidth: number,
  panelHeight: number,
): { width: number; height: number } {
  // Miter joints don't change panel outer dimensions
  return { width: panelWidth, height: panelHeight };
}

export interface SlotTabJoint {
  // Slot cutouts on one panel
  slots: {
    x: number;      // Position along the edge
    width: number;   // Slot width (= material thickness)
    depth: number;   // Slot depth into the panel
  }[];
  // Tab extensions on the mating panel
  tabs: {
    x: number;       // Position along the edge
    width: number;    // Tab width (= material thickness)
    extension: number; // Tab length extending beyond the edge
  }[];
}

/**
 * Generate slot-and-tab joint positions along an edge.
 * Slots are cut into one panel, tabs extend from the mating panel.
 *
 * @param edgeLength Length of the edge in model units
 * @param materialThickness Material thickness in model units
 * @param tabCount Number of tabs (auto-calculated if 0)
 */
export function generateSlotTabJoints(
  edgeLength: number,
  materialThickness: number,
  tabCount: number = 0
): SlotTabJoint {
  // Auto-calculate tab count: roughly one tab per inch, minimum 2
  const count = tabCount > 0 ? tabCount : Math.max(2, Math.round(edgeLength / 1));

  const slotWidth = materialThickness;
  const slotDepth = materialThickness * 3;

  // Distribute tabs evenly along the edge
  const spacing = edgeLength / (count + 1);

  const slots: SlotTabJoint['slots'] = [];
  const tabs: SlotTabJoint['tabs'] = [];

  for (let i = 0; i < count; i++) {
    const x = spacing * (i + 1) - slotWidth / 2;
    slots.push({ x, width: slotWidth, depth: slotDepth });
    tabs.push({ x, width: slotWidth, extension: slotDepth });
  }

  return { slots, tabs };
}

/**
 * Generate slot cutout vertices for a panel edge.
 * Returns an array of Point2D representing the notched edge profile.
 *
 * @param edgeStart Start point of the edge
 * @param edgeEnd End point of the edge
 * @param joints The slot-tab joint specification
 * @param inward Direction to cut slots (perpendicular into the panel)
 */
export function generateSlotCutoutVertices(
  edgeStart: Point2D,
  edgeEnd: Point2D,
  joints: SlotTabJoint,
  inward: boolean = true
): Point2D[] {
  const dx = edgeEnd.x - edgeStart.x;
  const dy = edgeEnd.y - edgeStart.y;
  const edgeLength = Math.sqrt(dx * dx + dy * dy);

  if (edgeLength === 0) return [edgeStart, edgeEnd];

  // Unit vector along edge
  const ux = dx / edgeLength;
  const uy = dy / edgeLength;

  // Perpendicular (inward) direction
  const direction = inward ? 1 : -1;
  const px = -uy * direction;
  const py = ux * direction;

  const vertices: Point2D[] = [{ ...edgeStart }];

  for (const slot of joints.slots) {
    // Walk to slot start
    const slotStartX = edgeStart.x + ux * slot.x;
    const slotStartY = edgeStart.y + uy * slot.x;
    vertices.push({ x: slotStartX, y: slotStartY });

    // Cut into panel
    vertices.push({ x: slotStartX + px * slot.depth, y: slotStartY + py * slot.depth });

    // Across slot width
    const slotEndX = slotStartX + ux * slot.width;
    const slotEndY = slotStartY + uy * slot.width;
    vertices.push({ x: slotEndX + px * slot.depth, y: slotEndY + py * slot.depth });

    // Back to edge
    vertices.push({ x: slotEndX, y: slotEndY });
  }

  vertices.push({ ...edgeEnd });
  return vertices;
}

/**
 * Generate tab extension vertices for a panel edge.
 * Returns an array of Point2D representing the edge with tab protrusions.
 */
export function generateTabExtensionVertices(
  edgeStart: Point2D,
  edgeEnd: Point2D,
  joints: SlotTabJoint,
  outward: boolean = true
): Point2D[] {
  const dx = edgeEnd.x - edgeStart.x;
  const dy = edgeEnd.y - edgeStart.y;
  const edgeLength = Math.sqrt(dx * dx + dy * dy);

  if (edgeLength === 0) return [edgeStart, edgeEnd];

  // Unit vector along edge
  const ux = dx / edgeLength;
  const uy = dy / edgeLength;

  // Perpendicular (outward) direction
  const direction = outward ? 1 : -1;
  const px = -uy * direction;
  const py = ux * direction;

  const vertices: Point2D[] = [{ ...edgeStart }];

  for (const tab of joints.tabs) {
    // Walk to tab start
    const tabStartX = edgeStart.x + ux * tab.x;
    const tabStartY = edgeStart.y + uy * tab.x;
    vertices.push({ x: tabStartX, y: tabStartY });

    // Extend outward
    vertices.push({ x: tabStartX + px * tab.extension, y: tabStartY + py * tab.extension });

    // Across tab width
    const tabEndX = tabStartX + ux * tab.width;
    const tabEndY = tabStartY + uy * tab.width;
    vertices.push({ x: tabEndX + px * tab.extension, y: tabEndY + py * tab.extension });

    // Back to edge
    vertices.push({ x: tabEndX, y: tabEndY });
  }

  vertices.push({ ...edgeEnd });
  return vertices;
}
