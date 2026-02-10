'use client';

/**
 * TidKit Builder - 3D Building Mesh Component
 * Generates parametric building geometry based on store parameters.
 * Renders material thickness for non-paper materials.
 */

import { useMemo, useRef } from 'react';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildingStore } from '@/stores/buildingStore';
import { MATERIAL_PROPERTIES, DEFAULT_MATERIAL, type MaterialType } from '@/types/building';

// Material colors for 3D preview
const MATERIAL_COLORS: Record<MaterialType, { wall: string; edge: string }> = {
  paper: { wall: '#d4a373', edge: '#c49363' },
  foamcore: { wall: '#f0ead6', edge: '#e0dac6' },
  plywood: { wall: '#c4a46c', edge: '#a4844c' },
  chipboard: { wall: '#b0a090', edge: '#908070' },
};

export function BuildingMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const { params, showWireframe } = useBuildingStore();

  const { width, depth, height } = params.dimensions;
  const { style: roofStyle, pitch, overhang } = params.roof;
  const material = params.material || DEFAULT_MATERIAL;
  const materialProps = MATERIAL_PROPERTIES[material.type];
  const colors = MATERIAL_COLORS[material.type];

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
