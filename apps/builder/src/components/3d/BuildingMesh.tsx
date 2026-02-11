'use client';

/**
 * TidKit Builder - 3D Building Mesh Component
 * Generates parametric building geometry based on store parameters.
 * Renders material thickness for non-paper materials.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildingStore } from '@/stores/buildingStore';
import { DEFAULT_MATERIAL, ACCESSORY_PRESETS, type MaterialType, type Opening, type FloorConfig, type Accessory, type AccessoryPreset } from '@/types/building';
import { getWallProfile } from '@/lib/wall-profiles';
import { getStickerGraphic } from '@/lib/sticker-graphics';
import { WallMaterial } from './WallMaterial';

// Material colors for 3D preview
const MATERIAL_COLORS: Record<MaterialType, { wall: string; edge: string }> = {
  paper: { wall: '#d4a373', edge: '#c49363' },
  foamcore: { wall: '#f0ead6', edge: '#e0dac6' },
  plywood: { wall: '#c4a46c', edge: '#a4844c' },
  chipboard: { wall: '#b0a090', edge: '#908070' },
};

export function BuildingMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const params = useBuildingStore((s) => s.params);
  const showWireframe = useBuildingStore((s) => s.showWireframe);
  const accessories = useBuildingStore((s) => s.accessories);
  const invalidate = useThree((s) => s.invalidate);

  const { width, depth, height } = params.dimensions;
  const { style: roofStyle, pitch, overhang } = params.roof;
  const material = params.material || DEFAULT_MATERIAL;
  const colors = MATERIAL_COLORS[material.type];

  // Force R3F to re-render when building properties change
  useEffect(() => {
    invalidate();
  }, [material.type, material.thickness, material.jointMethod, colors.wall, params.openings, accessories, invalidate]);

  // Calculate roof height based on pitch
  const roofHeight = useMemo(() => {
    if (roofStyle === 'flat') return 0;
    const pitchRad = (pitch * Math.PI) / 180;
    // Shed slope spans full depth; all others span half
    if (roofStyle === 'shed') return depth * Math.tan(pitchRad);
    return (depth / 2) * Math.tan(pitchRad);
  }, [roofStyle, pitch, depth]);

  // Wall thickness in feet (convert from model inches through scale)
  // For 3D preview, exaggerate thickness so it's visible at building scale
  const wallThicknessFeet = useMemo(() => {
    if (material.type === 'paper') return 0;
    // Convert model inches to feet, then exaggerate for visibility
    // Real thickness at scale would be invisible, so we use a visible minimum
    const realThicknessFeet = material.thickness * params.scale.ratio / 12;
    return Math.max(realThicknessFeet, 0.4); // At least 0.4 feet (~5") visible thickness
  }, [material.type, material.thickness, params.scale.ratio]);

  const showThickness = material.type !== 'paper' && wallThicknessFeet > 0;
  const roofColor = '#5c4033';

  return (
    <group ref={groupRef} position={[0, height / 2, 0]}>
      {/* Walls */}
      {showThickness ? (
        <ThickWalls
          width={width}
          depth={depth}
          height={height}
          thickness={wallThicknessFeet}
          wallColor={colors.wall}
          edgeColor={colors.edge}
          showWireframe={showWireframe}
          jointMethod={material.jointMethod}
        />
      ) : (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <WallMaterial surface="frontWall" fallbackColor={colors.wall} />
          {showWireframe && <Edges color="black" threshold={15} />}
        </mesh>
      )}

      {/* Roof based on style */}
      {roofStyle === 'flat' && (
        <mesh position={[0, height / 2 + 0.1, 0]}>
          <boxGeometry args={[width + overhang * 2, 0.2, depth + overhang * 2]} />
          <meshStandardMaterial color={roofColor} />
          {showWireframe && <Edges color="black" />}
        </mesh>
      )}

      {roofStyle === 'gable' && (
        <GableRoof
          width={width}
          depth={depth}
          roofHeight={roofHeight}
          overhang={overhang}
          baseHeight={height}
          color={roofColor}
          showWireframe={showWireframe}
        />
      )}

      {roofStyle === 'hip' && (
        <HipRoof
          width={width}
          depth={depth}
          roofHeight={roofHeight}
          overhang={overhang}
          baseHeight={height}
          color={roofColor}
          showWireframe={showWireframe}
        />
      )}

      {roofStyle === 'shed' && (
        <ShedRoof
          width={width}
          depth={depth}
          roofHeight={roofHeight}
          overhang={overhang}
          baseHeight={height}
          color={roofColor}
          showWireframe={showWireframe}
        />
      )}

      {roofStyle === 'gambrel' && (
        <GambrelRoof
          width={width}
          depth={depth}
          roofHeight={roofHeight}
          overhang={overhang}
          baseHeight={height}
          color={roofColor}
          showWireframe={showWireframe}
        />
      )}

      {roofStyle === 'mansard' && (
        <MansardRoof
          width={width}
          depth={depth}
          roofHeight={roofHeight}
          overhang={overhang}
          baseHeight={height}
          color={roofColor}
          showWireframe={showWireframe}
        />
      )}

      {roofStyle === 'saltbox' && (
        <SaltboxRoof
          width={width}
          depth={depth}
          roofHeight={roofHeight}
          overhang={overhang}
          baseHeight={height}
          color={roofColor}
          showWireframe={showWireframe}
        />
      )}

      {/* Wall fills — triangles/trapezoids closing gaps between walls and roof */}
      {roofStyle !== 'flat' && roofStyle !== 'hip' && (
        <WallFill
          roofStyle={roofStyle}
          width={width}
          depth={depth}
          height={height}
          roofPitch={pitch}
          wallColor={colors.wall}
          edgeColor={colors.edge}
          showWireframe={showWireframe}
          thickness={showThickness ? wallThicknessFeet : 0}
        />
      )}

      {/* Windows and doors */}
      {params.openings.map((opening) => (
        <WallOpening
          key={opening.id}
          opening={opening}
          buildingWidth={width}
          buildingDepth={depth}
          buildingHeight={height}
          floors={params.floors}
        />
      ))}

      {/* Accessories */}
      {accessories.map((accessory) => (
        <AccessoryMesh
          key={accessory.id}
          accessory={accessory}
          buildingHeight={height}
          buildingWidth={width}
          buildingDepth={depth}
        />
      ))}
    </group>
  );
}

// =============================================================================
// Openings — renders windows and doors on wall surfaces
// =============================================================================

function WallOpening({
  opening,
  buildingWidth,
  buildingDepth,
  buildingHeight,
  floors,
}: {
  opening: Opening;
  buildingWidth: number;
  buildingDepth: number;
  buildingHeight: number;
  floors: FloorConfig[];
}) {
  // Calculate absolute Y from floor base
  const floorBaseY = floors
    .slice(0, opening.floor)
    .reduce((sum, f) => sum + f.height, 0);
  const centerY = -buildingHeight / 2 + floorBaseY + opening.y + opening.height / 2;
  const isWindow = opening.type === 'window';
  const color = isWindow ? '#87CEEB' : '#6B4226';
  const offset = 0.05;

  let position: [number, number, number] = [0, centerY, 0];
  let size: [number, number, number] = [opening.width, opening.height, 0.08];

  switch (opening.wall) {
    case 'front': {
      const cx = -buildingWidth / 2 + opening.x + opening.width / 2;
      position = [cx, centerY, buildingDepth / 2 + offset];
      size = [opening.width, opening.height, 0.08];
      break;
    }
    case 'back': {
      const cx = -buildingWidth / 2 + opening.x + opening.width / 2;
      position = [cx, centerY, -buildingDepth / 2 - offset];
      size = [opening.width, opening.height, 0.08];
      break;
    }
    case 'left': {
      const cz = -buildingDepth / 2 + opening.x + opening.width / 2;
      position = [-buildingWidth / 2 - offset, centerY, cz];
      size = [0.08, opening.height, opening.width];
      break;
    }
    case 'right': {
      const cz = -buildingDepth / 2 + opening.x + opening.width / 2;
      position = [buildingWidth / 2 + offset, centerY, cz];
      size = [0.08, opening.height, opening.width];
      break;
    }
  }

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent={isWindow}
        opacity={isWindow ? 0.5 : 0.9}
      />
      <Edges color="#333333" />
    </mesh>
  );
}

// =============================================================================
// Accessories — type-specific 3D geometry for each accessory kind
// =============================================================================

const ACCESSORY_COLORS: Record<string, string> = {
  exterior: '#808080',
  structural: '#606060',
  decorative: '#8B5A2B',
  signage: '#DAA520',
};

function AccessoryMesh({
  accessory,
  buildingHeight,
  buildingWidth,
  buildingDepth,
}: {
  accessory: Accessory;
  buildingHeight: number;
  buildingWidth: number;
  buildingDepth: number;
}) {
  const preset = ACCESSORY_PRESETS.find((p) => p.type === accessory.type);
  if (!preset) return null;

  // 2D stickers render as flat colored planes on wall surfaces
  if (accessory.renderMode === '2d') {
    return (
      <StickerMesh
        accessory={accessory}
        preset={preset}
        buildingHeight={buildingHeight}
        buildingWidth={buildingWidth}
        buildingDepth={buildingDepth}
      />
    );
  }

  // 3D parts render with full geometry
  const dims = preset.dimensions;
  const color = ACCESSORY_COLORS[accessory.category] || '#808080';
  const posY = -buildingHeight / 2 + accessory.position.y;
  const rotRad = (accessory.rotation * Math.PI) / 180;

  return (
    <group
      position={[accessory.position.x, posY, accessory.position.z]}
      rotation={[0, rotRad, 0]}
      scale={accessory.scale}
    >
      <AccessoryGeometry type={accessory.type} dims={dims} color={color} />
    </group>
  );
}

/** Flat colored quad on a wall surface for 2D sticker accessories */
function StickerMesh({
  accessory,
  preset,
  buildingHeight,
  buildingWidth,
  buildingDepth,
}: {
  accessory: Accessory;
  preset: AccessoryPreset;
  buildingHeight: number;
  buildingWidth: number;
  buildingDepth: number;
}) {
  const graphic = getStickerGraphic(accessory.type);
  const color = graphic?.previewColor || '#DAA520';
  const w = preset.dimensions.width * accessory.scale;
  const h = preset.dimensions.height * accessory.scale;
  const offset = 0.06; // Slight offset from wall to prevent z-fighting

  const posY = -buildingHeight / 2 + accessory.position.y + h / 2;

  let position: [number, number, number] = [0, posY, 0];
  let rotation: [number, number, number] = [0, 0, 0];

  switch (accessory.attachedTo) {
    case 'wall-front': {
      const cx = -buildingWidth / 2 + accessory.position.x + w / 2;
      position = [cx, posY, buildingDepth / 2 + offset];
      break;
    }
    case 'wall-back': {
      const cx = -buildingWidth / 2 + accessory.position.x + w / 2;
      position = [cx, posY, -buildingDepth / 2 - offset];
      rotation = [0, Math.PI, 0];
      break;
    }
    case 'wall-left': {
      const cz = -buildingDepth / 2 + accessory.position.x + w / 2;
      position = [-buildingWidth / 2 - offset, posY, cz];
      rotation = [0, -Math.PI / 2, 0];
      break;
    }
    case 'wall-right': {
      const cz = -buildingDepth / 2 + accessory.position.x + w / 2;
      position = [buildingWidth / 2 + offset, posY, cz];
      rotation = [0, Math.PI / 2, 0];
      break;
    }
  }

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      <Edges color="#333333" />
    </mesh>
  );
}

function AccessoryGeometry({
  type,
  dims,
  color,
}: {
  type: string;
  dims: { width: number; height: number; depth: number };
  color: string;
}) {
  const { width: w, height: h, depth: d } = dims;

  switch (type) {
    case 'chimney':
      return <ChimneyMesh w={w} h={h} d={d} />;
    case 'steps':
      return <StepsMesh w={w} h={h} d={d} />;
    case 'column':
      return <ColumnMesh w={w} h={h} />;
    case 'awning':
    case 'sign-awning':
      return <AwningMesh w={w} h={h} d={d} color={type === 'sign-awning' ? '#2E7D32' : '#8B4513'} />;
    case 'fence':
    case 'gate':
      return <FenceMesh w={w} h={h} d={d} isGate={type === 'gate'} />;
    case 'shutters':
      return <ShuttersMesh w={w} h={h} />;
    case 'sign-hanging':
      return <HangingSignMesh w={w} h={h} d={d} />;
    default:
      // Generic box for all other types
      return (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} />
          <Edges color="#333333" />
        </mesh>
      );
  }
}

/** Brick chimney: main stack + wider cap */
function ChimneyMesh({ w, h, d }: { w: number; h: number; d: number }) {
  const capH = 0.4;
  return (
    <group>
      {/* Main stack */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h - capH, d]} />
        <meshStandardMaterial color="#8B4513" />
        <Edges color="#5C2D0E" />
      </mesh>
      {/* Cap */}
      <mesh position={[0, h - capH / 2, 0]}>
        <boxGeometry args={[w + 0.4, capH, d + 0.4]} />
        <meshStandardMaterial color="#6B3410" />
        <Edges color="#4A2208" />
      </mesh>
    </group>
  );
}

/** Porch steps: N stacked treads */
function StepsMesh({ w, h, d }: { w: number; h: number; d: number }) {
  const stepCount = Math.max(2, Math.round(h / 0.7));
  const stepH = h / stepCount;
  const stepD = d / stepCount;

  return (
    <group>
      {Array.from({ length: stepCount }, (_, i) => (
        <mesh key={i} position={[0, stepH * (i + 0.5), -stepD * i / 2]}>
          <boxGeometry args={[w, stepH * 0.9, stepD * (stepCount - i) / stepCount + stepD * 0.5]} />
          <meshStandardMaterial color="#A0A0A0" />
          <Edges color="#666666" />
        </mesh>
      ))}
    </group>
  );
}

/** Column: cylinder with base and capital */
function ColumnMesh({ w, h }: { w: number; h: number }) {
  const radius = w / 2;
  const baseH = h * 0.06;
  const capitalH = h * 0.08;
  const shaftH = h - baseH - capitalH;

  return (
    <group>
      {/* Base */}
      <mesh position={[0, baseH / 2, 0]}>
        <cylinderGeometry args={[radius * 1.4, radius * 1.5, baseH, 12]} />
        <meshStandardMaterial color="#D0D0D0" />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, baseH + shaftH / 2, 0]}>
        <cylinderGeometry args={[radius, radius, shaftH, 12]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
      {/* Capital */}
      <mesh position={[0, baseH + shaftH + capitalH / 2, 0]}>
        <cylinderGeometry args={[radius * 1.5, radius * 1.3, capitalH, 12]} />
        <meshStandardMaterial color="#D0D0D0" />
      </mesh>
    </group>
  );
}

/** Awning: sloped canopy using a wedge-like shape */
function AwningMesh({ w, h, d, color }: { w: number; h: number; d: number; color: string }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // Wedge: thick at back (wall side), tapers to thin at front
    const verts = new Float32Array([
      // Back face (against wall)
      -w / 2, h, 0,
      w / 2, h, 0,
      w / 2, 0, 0,
      -w / 2, 0, 0,
      // Front edge (thin)
      -w / 2, h * 0.7, -d,
      w / 2, h * 0.7, -d,
      w / 2, h * 0.6, -d,
      -w / 2, h * 0.6, -d,
    ]);
    const indices = new Uint16Array([
      // Top slope
      0, 1, 5, 0, 5, 4,
      // Bottom
      3, 6, 2, 3, 7, 6,
      // Front
      4, 5, 6, 4, 6, 7,
      // Left
      0, 4, 7, 0, 7, 3,
      // Right
      1, 2, 6, 1, 6, 5,
      // Back
      0, 3, 2, 0, 2, 1,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.computeVertexNormals();
    return g;
  }, [w, h, d]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      <Edges color="#333333" />
    </mesh>
  );
}

/** Fence with pickets and horizontal rails */
function FenceMesh({ w, h, d, isGate }: { w: number; h: number; d: number; isGate: boolean }) {
  const picketCount = Math.max(3, Math.round(w / 0.5));
  const picketW = 0.15;
  const gap = (w - picketCount * picketW) / (picketCount - 1);
  const railH = 0.12;
  const picketColor = '#C4A46C';
  const postColor = '#8B6914';

  return (
    <group>
      {/* Posts at each end */}
      <mesh position={[-w / 2, h / 2, 0]}>
        <boxGeometry args={[0.25, h + 0.5, 0.25]} />
        <meshStandardMaterial color={postColor} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[0.25, h + 0.5, 0.25]} />
        <meshStandardMaterial color={postColor} />
      </mesh>
      {/* Top rail */}
      <mesh position={[0, h * 0.85, 0]}>
        <boxGeometry args={[w, railH, d * 0.6]} />
        <meshStandardMaterial color={picketColor} />
      </mesh>
      {/* Bottom rail */}
      <mesh position={[0, h * 0.25, 0]}>
        <boxGeometry args={[w, railH, d * 0.6]} />
        <meshStandardMaterial color={picketColor} />
      </mesh>
      {/* Pickets */}
      {!isGate && Array.from({ length: picketCount }, (_, i) => {
        const x = -w / 2 + picketW / 2 + i * (picketW + gap);
        return (
          <mesh key={i} position={[x, h / 2, 0]}>
            <boxGeometry args={[picketW, h * 0.9, d * 0.4]} />
            <meshStandardMaterial color={picketColor} />
          </mesh>
        );
      })}
      {/* Gate: diagonal brace instead of pickets */}
      {isGate && (
        <mesh position={[0, h / 2, 0]} rotation={[0, 0, Math.atan2(h, w)]}>
          <boxGeometry args={[Math.sqrt(w * w + h * h) * 0.8, 0.1, d * 0.4]} />
          <meshStandardMaterial color={postColor} />
        </mesh>
      )}
    </group>
  );
}

/** Window shutters: pair of thin louvered panels */
function ShuttersMesh({ w, h }: { w: number; h: number }) {
  const panelW = w;
  const spacing = w * 4; // shutters flank a window
  return (
    <group>
      {/* Left shutter */}
      <mesh position={[-spacing / 2, h / 2, 0]}>
        <boxGeometry args={[panelW, h, 0.1]} />
        <meshStandardMaterial color="#2E5930" />
        <Edges color="#1B3D1D" />
      </mesh>
      {/* Right shutter */}
      <mesh position={[spacing / 2, h / 2, 0]}>
        <boxGeometry args={[panelW, h, 0.1]} />
        <meshStandardMaterial color="#2E5930" />
        <Edges color="#1B3D1D" />
      </mesh>
    </group>
  );
}

/** Hanging sign: board + bracket arm */
function HangingSignMesh({ w, h, d }: { w: number; h: number; d: number }) {
  return (
    <group>
      {/* Bracket arm (horizontal) */}
      <mesh position={[0, h + 0.3, 0]}>
        <boxGeometry args={[0.15, 0.15, w / 2 + 0.5]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Vertical bracket mount */}
      <mesh position={[0, h / 2 + 0.3, w / 4 + 0.25]}>
        <boxGeometry args={[0.1, h + 0.6, 0.1]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[d, h, w]} />
        <meshStandardMaterial color="#DAA520" />
        <Edges color="#8B6914" />
      </mesh>
    </group>
  );
}

// =============================================================================
// Thick Walls — renders 4 separate wall panels with visible material thickness
// =============================================================================

function ThickWalls({
  width,
  depth,
  height,
  thickness,
  wallColor,
  edgeColor,
  showWireframe,
  jointMethod,
}: {
  width: number;
  depth: number;
  height: number;
  thickness: number;
  wallColor: string;
  edgeColor: string;
  showWireframe: boolean;
  jointMethod: string;
}) {
  // For butt joints: front/back are full width, sides are shortened
  // For miter joints: all panels are full dimension (miter happens at edges)
  const isMiter = jointMethod === 'miter';
  const sideDepth = isMiter ? depth : depth - thickness * 2;

  return (
    <group>
      {/* Front wall */}
      <mesh position={[0, 0, depth / 2 - thickness / 2]}>
        <boxGeometry args={[width, height, thickness]} />
        <WallMaterial surface="frontWall" fallbackColor={wallColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 0, -depth / 2 + thickness / 2]}>
        <boxGeometry args={[width, height, thickness]} />
        <WallMaterial surface="backWall" fallbackColor={wallColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>

      {/* Left wall (between front and back for butt joints) */}
      <mesh position={[-width / 2 + thickness / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, sideDepth]} />
        <WallMaterial surface="sideWalls" fallbackColor={edgeColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>

      {/* Right wall */}
      <mesh position={[width / 2 - thickness / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, sideDepth]} />
        <WallMaterial surface="sideWalls" fallbackColor={edgeColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>
    </group>
  );
}

// =============================================================================
// Roof Components (unchanged)
// =============================================================================

function GableRoof({
  width,
  depth,
  roofHeight,
  overhang,
  baseHeight,
  color,
  showWireframe,
}: {
  width: number;
  depth: number;
  roofHeight: number;
  overhang: number;
  baseHeight: number;
  color: string;
  showWireframe: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;
    const h = roofHeight;

    // Ridge runs along x (width), slope spans z (depth)
    // Back slope: eave at z=-d up to ridge at z=0
    // Front slope: eave at z=+d up to ridge at z=0
    const vertices = new Float32Array([
      // Back slope
      -w, baseHeight / 2, -d,       // 0: left-back eave
       w, baseHeight / 2, -d,       // 1: right-back eave
       w, baseHeight / 2 + h, 0,    // 2: right-ridge
      -w, baseHeight / 2 + h, 0,    // 3: left-ridge

      // Front slope
      -w, baseHeight / 2, d,        // 4: left-front eave
       w, baseHeight / 2, d,        // 5: right-front eave
       w, baseHeight / 2 + h, 0,    // 6: right-ridge
      -w, baseHeight / 2 + h, 0,    // 7: left-ridge
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
      4, 5, 6,
      4, 6, 7,
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, [width, depth, roofHeight, overhang, baseHeight]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      {showWireframe && <Edges color="black" />}
    </mesh>
  );
}

function HipRoof({
  width,
  depth,
  roofHeight,
  overhang,
  baseHeight,
  color,
  showWireframe,
}: {
  width: number;
  depth: number;
  roofHeight: number;
  overhang: number;
  baseHeight: number;
  color: string;
  showWireframe: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;
    const h = roofHeight;
    const ridgeLen = Math.max(0, (width - depth) / 2);

    const vertices = new Float32Array([
      -w, baseHeight / 2, -d,
      w, baseHeight / 2, -d,
      w, baseHeight / 2, d,
      -w, baseHeight / 2, d,
      -ridgeLen, baseHeight / 2 + h, 0,
      ridgeLen, baseHeight / 2 + h, 0,
    ]);

    const indices = new Uint16Array([
      0, 4, 5,
      0, 5, 1,
      1, 5, 2,
      2, 5, 4,
      2, 4, 3,
      3, 4, 0,
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, [width, depth, roofHeight, overhang, baseHeight]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      {showWireframe && <Edges color="black" />}
    </mesh>
  );
}

function ShedRoof({
  width,
  depth,
  roofHeight,
  overhang,
  baseHeight,
  color,
  showWireframe,
}: {
  width: number;
  depth: number;
  roofHeight: number;
  overhang: number;
  baseHeight: number;
  color: string;
  showWireframe: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;
    const h = roofHeight;

    const vertices = new Float32Array([
      -w, baseHeight / 2, -d,
      w, baseHeight / 2, -d,
      w, baseHeight / 2 + h, d,
      -w, baseHeight / 2 + h, d,
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, [width, depth, roofHeight, overhang, baseHeight]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      {showWireframe && <Edges color="black" />}
    </mesh>
  );
}

// =============================================================================
// Additional Roof Components — Gambrel, Mansard, Saltbox
// =============================================================================

interface RoofProps {
  width: number;
  depth: number;
  roofHeight: number;
  overhang: number;
  baseHeight: number;
  color: string;
  showWireframe: boolean;
}

function GambrelRoof({ width, depth, roofHeight, overhang, baseHeight, color, showWireframe }: RoofProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;
    const halfD = depth / 2;

    // Lower slope is steep (60°), upper uses actual pitch
    const lowerSpan = halfD * 0.35;
    const lowerAngle = Math.PI / 3;
    const lowerH = lowerSpan * Math.tan(lowerAngle);
    const pitchRad = halfD > 0 ? Math.atan(roofHeight / halfD) : Math.PI / 6;
    const upperSpan = halfD - lowerSpan;
    const upperH = upperSpan * Math.tan(pitchRad);
    const totalH = lowerH + upperH;
    const y0 = baseHeight / 2;

    // Scale overhang positions proportionally
    const breakZ = d - lowerSpan * (d / halfD);

    const vertices = new Float32Array([
      // Back lower slope
      -w, y0, -d,                   // 0
       w, y0, -d,                   // 1
       w, y0 + lowerH, -breakZ,     // 2
      -w, y0 + lowerH, -breakZ,     // 3
      // Back upper slope → ridge
       w, y0 + totalH, 0,           // 4
      -w, y0 + totalH, 0,           // 5
      // Front lower slope
      -w, y0, d,                    // 6
       w, y0, d,                    // 7
       w, y0 + lowerH, breakZ,      // 8
      -w, y0 + lowerH, breakZ,      // 9
      // Front upper slope → ridge
       w, y0 + totalH, 0,           // 10
      -w, y0 + totalH, 0,           // 11
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3,     // back lower
      3, 2, 4, 3, 4, 5,     // back upper
      6, 7, 8, 6, 8, 9,     // front lower
      9, 8, 10, 9, 10, 11,  // front upper
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [width, depth, roofHeight, overhang, baseHeight]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      {showWireframe && <Edges color="black" />}
    </mesh>
  );
}

function MansardRoof({ width, depth, roofHeight, overhang, baseHeight, color, showWireframe }: RoofProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;

    const mansardAngle = (70 * Math.PI) / 180;
    const inset = depth * 0.15;
    const insetX = width * 0.15;
    const mansardH = inset * Math.tan(mansardAngle);
    const y0 = baseHeight / 2;

    const vertices = new Float32Array([
      // Base corners (eave level)
      -w, y0, -d,                                   // 0
       w, y0, -d,                                   // 1
       w, y0, d,                                    // 2
      -w, y0, d,                                    // 3
      // Top corners (inset)
      -(w - insetX), y0 + mansardH, -(d - inset),   // 4
       (w - insetX), y0 + mansardH, -(d - inset),   // 5
       (w - insetX), y0 + mansardH,  (d - inset),   // 6
      -(w - insetX), y0 + mansardH,  (d - inset),   // 7
    ]);

    const indices = new Uint16Array([
      0, 1, 5, 0, 5, 4,   // back
      1, 2, 6, 1, 6, 5,   // right
      2, 3, 7, 2, 7, 6,   // front
      3, 0, 4, 3, 4, 7,   // left
      4, 5, 6, 4, 6, 7,   // top
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [width, depth, roofHeight, overhang, baseHeight]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      {showWireframe && <Edges color="black" />}
    </mesh>
  );
}

function SaltboxRoof({ width, depth, roofHeight, overhang, baseHeight, color, showWireframe }: RoofProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;
    const halfD = depth / 2;

    // Ridge offset toward front (~35% from front)
    const ridgePos = halfD * 0.35;
    const pitchRad = halfD > 0 ? Math.atan(roofHeight / halfD) : Math.PI / 6;
    const peakH = ridgePos * Math.tan(pitchRad);
    const y0 = baseHeight / 2;

    // Ridge z position: front is +z, so ridge is at z = d - ridgePos*(d/halfD)
    const ridgeZ = d - ridgePos * (d / halfD);

    const vertices = new Float32Array([
      // Front slope (short, steep)
      -w, y0, d,                  // 0
       w, y0, d,                  // 1
       w, y0 + peakH, ridgeZ,     // 2
      -w, y0 + peakH, ridgeZ,     // 3
      // Back slope (long, gentle)
      -w, y0, -d,                 // 4
       w, y0, -d,                 // 5
       w, y0 + peakH, ridgeZ,     // 6
      -w, y0 + peakH, ridgeZ,     // 7
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3,   // front slope
      5, 4, 7, 5, 7, 6,   // back slope
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [width, depth, roofHeight, overhang, baseHeight]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      {showWireframe && <Edges color="black" />}
    </mesh>
  );
}

// =============================================================================
// WallFill — fills gaps between flat-topped walls and sloped rooflines
// =============================================================================

function WallFill({
  roofStyle,
  width,
  depth,
  height,
  roofPitch,
  wallColor,
  edgeColor,
  showWireframe,
}: {
  roofStyle: string;
  width: number;
  depth: number;
  height: number;
  roofPitch: number;
  wallColor: string;
  edgeColor: string;
  showWireframe: boolean;
  thickness: number;
}) {
  const fills = useMemo(() => {
    const result: { geometry: THREE.BufferGeometry; color: string }[] = [];
    const y0 = height / 2;
    const halfW = width / 2;
    const halfD = depth / 2;

    const sides: Array<'left' | 'right' | 'front' | 'back'> = ['left', 'right', 'front', 'back'];

    for (const side of sides) {
      const isLR = side === 'left' || side === 'right';
      const wallWidth = isLR ? depth : width;
      const profile = getWallProfile({
        roofStyle: roofStyle as any,
        wallSide: side,
        wallWidth,
        wallHeight: height,
        roofPitch,
        buildingDepth: depth,
      });

      // Clip profile polygon to region above wall height
      const fillPoly = clipProfileAbove(profile.vertices, height);
      if (fillPoly.length < 3) continue;

      // Triangulate the clipped polygon (fan from first vertex)
      const tris = triangulateConvex(fillPoly);
      if (tris.length < 3) continue;

      const col = isLR ? edgeColor : wallColor;

      // Map 2D profile coordinates to 3D world positions
      const verts = new Float32Array(tris.length * 3);

      if (isLR) {
        const x = side === 'left' ? -halfW : halfW;
        for (let i = 0; i < tris.length; i++) {
          const v = tris[i];
          verts[i * 3] = x;
          verts[i * 3 + 1] = v.y - height + y0;
          verts[i * 3 + 2] = halfD - v.x;
        }
      } else {
        const z = side === 'front' ? halfD : -halfD;
        for (let i = 0; i < tris.length; i++) {
          const v = tris[i];
          verts[i * 3] = -halfW + v.x;
          verts[i * 3 + 1] = v.y - height + y0;
          verts[i * 3 + 2] = z;
        }
      }

      const inds = new Uint16Array(Array.from({ length: tris.length }, (_, idx) => idx));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.setIndex(new THREE.BufferAttribute(inds, 1));
      geo.computeVertexNormals();
      result.push({ geometry: geo, color: col });
    }

    return result;
  }, [roofStyle, width, depth, height, roofPitch, wallColor, edgeColor]);

  return (
    <group>
      {fills.map((fill, i) => (
        <mesh key={i} geometry={fill.geometry}>
          <meshStandardMaterial color={fill.color} side={THREE.DoubleSide} />
          {showWireframe && <Edges color="black" />}
        </mesh>
      ))}
    </group>
  );
}

/**
 * Clip a polygon to the half-plane y >= clipY.
 * Uses Sutherland–Hodgman for a single horizontal clip line.
 * Handles edges that cross the clip line by inserting intersection vertices.
 */
function clipProfileAbove(
  vertices: { x: number; y: number }[],
  clipY: number,
): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const n = vertices.length;
  const eps = 0.001;

  for (let i = 0; i < n; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const currAbove = curr.y >= clipY - eps;
    const nextAbove = next.y >= clipY - eps;

    if (currAbove) {
      result.push({ x: curr.x, y: Math.max(curr.y, clipY) });
    }

    // Insert intersection when edge crosses the clip line
    if (currAbove !== nextAbove) {
      const dy = next.y - curr.y;
      if (Math.abs(dy) > eps) {
        const t = (clipY - curr.y) / dy;
        if (t > eps && t < 1 - eps) {
          result.push({
            x: curr.x + t * (next.x - curr.x),
            y: clipY,
          });
        }
      }
    }
  }

  return result;
}

/** Simple fan triangulation for convex polygons */
function triangulateConvex(verts: { x: number; y: number }[]): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let i = 1; i < verts.length - 1; i++) {
    result.push(verts[0], verts[i], verts[i + 1]);
  }
  return result;
}
