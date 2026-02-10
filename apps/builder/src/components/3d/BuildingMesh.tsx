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
import { DEFAULT_MATERIAL, ACCESSORY_PRESETS, type MaterialType, type Opening, type FloorConfig, type Accessory } from '@/types/building';

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
          <meshStandardMaterial color={colors.wall} />
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
}: {
  accessory: Accessory;
  buildingHeight: number;
}) {
  const preset = ACCESSORY_PRESETS.find((p) => p.type === accessory.type);
  if (!preset) return null;

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
        <meshStandardMaterial color={wallColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 0, -depth / 2 + thickness / 2]}>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial color={wallColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>

      {/* Left wall (between front and back for butt joints) */}
      <mesh position={[-width / 2 + thickness / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, sideDepth]} />
        <meshStandardMaterial color={edgeColor} />
        {showWireframe && <Edges color="black" />}
      </mesh>

      {/* Right wall */}
      <mesh position={[width / 2 - thickness / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, sideDepth]} />
        <meshStandardMaterial color={edgeColor} />
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

    const vertices = new Float32Array([
      -w, baseHeight / 2, -d,
      -w, baseHeight / 2, d,
      0, baseHeight / 2 + h, d,
      0, baseHeight / 2 + h, -d,

      w, baseHeight / 2, -d,
      w, baseHeight / 2, d,
      0, baseHeight / 2 + h, d,
      0, baseHeight / 2 + h, -d,
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
      5, 4, 7,
      5, 7, 6,
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
