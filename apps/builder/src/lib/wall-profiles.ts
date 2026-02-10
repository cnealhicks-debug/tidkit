/**
 * TidKit Builder - Wall Profile Geometry
 * Computes wall outline vertices for each roof style.
 * Shared by the 3D renderer and unfold strategies.
 */

import type { RoofStyle } from '@/types/building';

export interface WallProfile {
  /** Wall outline vertices, origin at bottom-left, wound counter-clockwise */
  vertices: { x: number; y: number }[];
  /** Y coordinate where base wall meets roof extension (for paper fold line) */
  foldLineY?: number;
}

export interface WallProfileParams {
  roofStyle: RoofStyle;
  wallSide: 'front' | 'back' | 'left' | 'right';
  wallWidth: number;    // panel width (depth for L/R, width for F/B)
  wallHeight: number;   // base wall height (not including roof)
  roofPitch: number;    // degrees
  buildingDepth: number; // side-to-side dimension (used for slope half-span)
}

/**
 * Compute the roof height from pitch and the slope's horizontal half-span.
 * For gable/gambrel/saltbox the slope spans depth/2.
 * For shed the slope spans the full depth.
 * For mansard the steep slope spans a fraction of depth/2.
 */
export function getRoofHeight(roofStyle: RoofStyle, depth: number, pitch: number): number {
  if (roofStyle === 'flat') return 0;
  const pitchRad = (pitch * Math.PI) / 180;
  if (roofStyle === 'shed') {
    return depth * Math.tan(pitchRad);
  }
  return (depth / 2) * Math.tan(pitchRad);
}

/**
 * Get the 2D wall profile for a given wall and roof style.
 * Vertices are wound counter-clockwise starting from bottom-left.
 */
export function getWallProfile(params: WallProfileParams): WallProfile {
  const { roofStyle, wallSide, wallWidth: w, wallHeight: h, roofPitch, buildingDepth } = params;
  const pitchRad = (roofPitch * Math.PI) / 180;
  const isLeftRight = wallSide === 'left' || wallSide === 'right';

  const rect = (): WallProfile => ({
    vertices: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
  });

  switch (roofStyle) {
    case 'flat':
    case 'hip':
      return rect();

    case 'gable':
      return gableProfile(w, h, pitchRad, buildingDepth, isLeftRight);

    case 'shed':
      return shedProfile(w, h, pitchRad, buildingDepth, wallSide, isLeftRight);

    case 'saltbox':
      return saltboxProfile(w, h, pitchRad, buildingDepth, isLeftRight);

    case 'gambrel':
      return gambrelProfile(w, h, pitchRad, buildingDepth, isLeftRight);

    case 'mansard':
      return mansardProfile(w, h, pitchRad, buildingDepth, isLeftRight);

    default:
      return rect();
  }
}

// ---------------------------------------------------------------------------
// Per-style profile generators
// ---------------------------------------------------------------------------

/**
 * Gable: Left/Right walls become pentagons. Front/Back stay rectangular.
 * Ridge runs along x (width), slope spans z (depth).
 * Gable ends face ±x (left/right walls spanning depth).
 */
function gableProfile(
  w: number, h: number, pitchRad: number, depth: number, isLeftRight: boolean
): WallProfile {
  if (!isLeftRight) {
    return { vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
  }
  // w = depth for L/R walls
  const roofHeight = (depth / 2) * Math.tan(pitchRad);
  return {
    vertices: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: w / 2, y: h + roofHeight },
      { x: 0, y: h },
    ],
    foldLineY: h,
  };
}

/**
 * Shed: Left/Right walls become trapezoids (one side higher).
 * Front wall is tall, back wall is short (or vice versa).
 * Slope runs across z (depth), from back (low) to front (high).
 */
function shedProfile(
  w: number, h: number, pitchRad: number, depth: number,
  wallSide: string, isLeftRight: boolean
): WallProfile {
  const roofHeight = depth * Math.tan(pitchRad);

  if (isLeftRight) {
    // Trapezoid: left edge at h (back/low), right edge at h+roofHeight (front/high)
    // Convention: x=0 is the "back" side, x=w is the "front" side
    return {
      vertices: [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h + roofHeight },
        { x: 0, y: h },
      ],
      foldLineY: h,
    };
  }

  // Front wall is the tall side
  if (wallSide === 'front') {
    const tallH = h + roofHeight;
    return {
      vertices: [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: tallH },
        { x: 0, y: tallH },
      ],
      foldLineY: h,
    };
  }

  // Back wall stays at base height
  return {
    vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
  };
}

/**
 * Saltbox: Asymmetric gable — ridge offset toward the front.
 * Front slope is shorter/steeper, back slope is longer/gentler.
 * Left/Right walls become asymmetric pentagons. Front/Back stay rectangular.
 */
function saltboxProfile(
  w: number, h: number, pitchRad: number, depth: number, isLeftRight: boolean
): WallProfile {
  if (!isLeftRight) {
    return { vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
  }

  // Ridge at ~35% from front (65% from back) for classic saltbox proportions
  const ridgePos = w * 0.35;
  const frontRoofHeight = ridgePos * Math.tan(pitchRad);
  // Back slope is gentler — use half the pitch for the long back slope
  const backPitchRad = pitchRad * 0.5;
  const backRoofHeight = (w - ridgePos) * Math.tan(backPitchRad);
  // Use the front height as the dominant peak, cap back to not exceed
  const roofHeight = Math.min(frontRoofHeight, backRoofHeight + frontRoofHeight * 0.3);
  const peakHeight = h + Math.max(frontRoofHeight, roofHeight);

  return {
    vertices: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },                  // back wall top (low side)
      { x: ridgePos, y: peakHeight },   // ridge peak
      { x: 0, y: h },                  // front wall top
    ],
    foldLineY: h,
  };
}

/**
 * Gambrel: Left/Right walls have a dual-slope profile (barn-style).
 * Lower slope is steep (~60°), upper slope is gentler (pitch).
 * Front/Back stay rectangular.
 */
function gambrelProfile(
  w: number, h: number, pitchRad: number, depth: number, isLeftRight: boolean
): WallProfile {
  if (!isLeftRight) {
    return { vertices: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
  }

  // Lower slope is steep (60°), spans ~30% of half-width from each side
  const lowerAngle = Math.PI / 3; // 60 degrees
  const halfW = w / 2;
  const lowerSpan = halfW * 0.35; // How far in from eave the break point is
  const lowerHeight = lowerSpan * Math.tan(lowerAngle);

  // Upper slope uses the roof pitch, spans remaining distance to center
  const upperSpan = halfW - lowerSpan;
  const upperHeight = upperSpan * Math.tan(pitchRad);

  const totalRoofHeight = lowerHeight + upperHeight;

  return {
    vertices: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },                                    // right eave
      { x: w - lowerSpan, y: h + lowerHeight },           // right break point
      { x: halfW, y: h + totalRoofHeight },                // ridge peak
      { x: lowerSpan, y: h + lowerHeight },                // left break point
      { x: 0, y: h },                                     // left eave
    ],
    foldLineY: h,
  };
}

/**
 * Mansard: All four walls get a steep lower slope profile.
 * The steep slope rises from the wall top, then a flat/gentle top cap covers the rest.
 * This creates a 6-point hexagonal profile on each wall.
 */
function mansardProfile(
  w: number, h: number, pitchRad: number, depth: number, isLeftRight: boolean
): WallProfile {
  // Mansard angle is steep — use 70° for the lower slope
  const mansardAngle = (70 * Math.PI) / 180;
  // The mansard slope spans inward from each wall
  // For L/R walls, inset is based on depth dimension; for F/B, based on depth too for consistency
  const inset = (isLeftRight ? depth : depth) * 0.15; // 15% of depth
  const mansardHeight = inset * Math.tan(mansardAngle);

  return {
    vertices: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },                            // right base
      { x: w - inset, y: h + mansardHeight },      // right mansard top
      { x: inset, y: h + mansardHeight },           // left mansard top
      { x: 0, y: h },                             // left base
    ],
    foldLineY: h,
  };
}

/**
 * Check if a wall profile is a simple rectangle (4 vertices, all right angles).
 */
export function isRectangularProfile(profile: WallProfile): boolean {
  return profile.vertices.length === 4 && !profile.foldLineY;
}

/**
 * Get the maximum height of a wall profile.
 */
export function getProfileMaxHeight(profile: WallProfile): number {
  return Math.max(...profile.vertices.map(v => v.y));
}
