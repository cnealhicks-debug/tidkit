'use client';

/**
 * TidKit Builder - 3D Scene Component
 * Sets up the Three.js scene with camera, lights, and controls
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { BuildingMesh } from './BuildingMesh';
import { useBuildingStore } from '@/stores/buildingStore';

function SceneContent() {
  const { params } = useBuildingStore();

  // Calculate camera distance based on building size
  const maxDimension = Math.max(
    params.dimensions.width,
    params.dimensions.depth,
    params.dimensions.height
  );
  const cameraDistance = maxDimension * 2;

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[cameraDistance, cameraDistance * 0.7, cameraDistance]}
        fov={50}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.4} />

      {/* Ground grid */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0, 0]}
      />

      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* The building */}
      <BuildingMesh />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, params.dimensions.height / 2, 0]}
      />
    </>
  );
}

export function Scene() {
  return (
    <Canvas shadows className="w-full h-full bg-gray-100">
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
