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
// Accessories — renders accessory objects around the building
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

  const { width: w, height: h, depth: d } = preset.dimensions;
  const color = ACCESSORY_COLORS[accessory.category] || '#808080';
  // Accessory position is from building origin (ground level)
  // Group origin is at building center height, so adjust Y
  const posY = -buildingHeight / 2 + accessory.position.y + h / 2;

  return (
    <mesh
      position={[accessory.position.x, posY, accessory.position.z]}
      rotation={[0, (accessory.rotation * Math.PI) / 180, 0]}
      scale={accessory.scale}
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
      <Edges color="#333333" />
    </mesh>
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
