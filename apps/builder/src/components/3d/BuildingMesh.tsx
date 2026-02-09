'use client';

/**
 * TidKit Builder - 3D Building Mesh Component
 * Generates parametric building geometry based on store parameters
 */

import { useMemo, useRef } from 'react';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildingStore } from '@/stores/buildingStore';

export function BuildingMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const { params, showWireframe } = useBuildingStore();

  // Convert feet to Three.js units (1 unit = 1 foot for easier visualization)
  const { width, depth, height } = params.dimensions;
  const { style: roofStyle, pitch, overhang } = params.roof;

  // Calculate roof height based on pitch
  const roofHeight = useMemo(() => {
    if (roofStyle === 'flat') return 0;
    // For gable/hip: height = (width/2) * tan(pitch)
    const pitchRad = (pitch * Math.PI) / 180;
    return (depth / 2) * Math.tan(pitchRad);
  }, [roofStyle, pitch, depth]);

  // Fallback colors (used when no texture is assigned)
  const wallColor = '#d4a373';
  const roofColor = '#5c4033';

  return (
    <group ref={groupRef} position={[0, height / 2, 0]}>
      {/* Main building box (walls) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={wallColor} />
        {showWireframe && <Edges color="black" threshold={15} />}
      </mesh>

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

// Gable Roof Component
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

    // Gable roof: two sloped panels meeting at a ridge
    const w = width / 2 + overhang;
    const d = depth / 2 + overhang;
    const h = roofHeight;

    // Calculate roof panel dimensions
    const roofPanelWidth = Math.sqrt(d * d + h * h);

    // Vertices for both roof panels
    const vertices = new Float32Array([
      // Left roof panel
      -w, baseHeight / 2, -d, // 0: back-left-bottom
      -w, baseHeight / 2, d,  // 1: front-left-bottom
      0, baseHeight / 2 + h, d,   // 2: front-ridge
      0, baseHeight / 2 + h, -d,  // 3: back-ridge

      // Right roof panel
      w, baseHeight / 2, -d,  // 4: back-right-bottom
      w, baseHeight / 2, d,   // 5: front-right-bottom
      0, baseHeight / 2 + h, d,   // 6: front-ridge (same as 2)
      0, baseHeight / 2 + h, -d,  // 7: back-ridge (same as 3)
    ]);

    const indices = new Uint16Array([
      // Left panel
      0, 1, 2,
      0, 2, 3,
      // Right panel
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

// Hip Roof Component (simplified - 4 sloped panels)
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
    const ridgeLen = Math.max(0, (width - depth) / 2); // Ridge length for rectangular buildings

    // Vertices
    const vertices = new Float32Array([
      // Base corners
      -w, baseHeight / 2, -d, // 0: back-left
      w, baseHeight / 2, -d,  // 1: back-right
      w, baseHeight / 2, d,   // 2: front-right
      -w, baseHeight / 2, d,  // 3: front-left
      // Ridge points
      -ridgeLen, baseHeight / 2 + h, 0, // 4: ridge-left
      ridgeLen, baseHeight / 2 + h, 0,  // 5: ridge-right
    ]);

    const indices = new Uint16Array([
      // Back panel
      0, 4, 5,
      0, 5, 1,
      // Right panel
      1, 5, 2,
      // Front panel
      2, 5, 4,
      2, 4, 3,
      // Left panel
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

// Shed Roof Component (single sloped panel)
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
      -w, baseHeight / 2, -d,         // 0: back-left-low
      w, baseHeight / 2, -d,          // 1: back-right-low
      w, baseHeight / 2 + h, d,       // 2: front-right-high
      -w, baseHeight / 2 + h, d,      // 3: front-left-high
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
