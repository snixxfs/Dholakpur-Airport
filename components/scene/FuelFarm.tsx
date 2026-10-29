'use client';

import React from 'react';

/**
 * Airside Jet-A1 Bulk Aviation Fuel Farm & Hydrant Pumping Station
 * Located southeast of the apron at [85, 0, 48]
 */
export function FuelFarm() {
  const farmPos: [number, number, number] = [88, 0, 42];

  return (
    <group position={farmPos} name="JetA1FuelFarm">
      {/* Concrete containment basin / bund floor */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[36, 0.1, 28]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Concrete bund containment wall */}
      {/* Front and back walls */}
      <mesh position={[0, 0.8, 14]} castShadow receiveShadow>
        <boxGeometry args={[36.4, 1.5, 0.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.8, -14]} castShadow receiveShadow>
        <boxGeometry args={[36.4, 1.5, 0.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      {/* Side walls */}
      <mesh position={[18, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 1.5, 28]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <mesh position={[-18, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 1.5, 28]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>

      {/* 3 Cylindrical Jet-A1 Storage Tanks */}
      {[-10, 0, 10].map((dx, idx) => (
        <group key={dx} position={[dx, 0, 0]}>
          {/* Main tank cylinder */}
          <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[4.2, 4.2, 8.5, 32]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.4} roughness={0.3} />
          </mesh>
          {/* Domed roof */}
          <mesh position={[0, 8.9, 0]} castShadow>
            <sphereGeometry args={[4.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 4]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Red hazard band and "JET A-1" branding */}
          <mesh position={[0, 5.8, 0]}>
            <cylinderGeometry args={[4.24, 4.24, 0.8, 32]} />
            <meshStandardMaterial color="#dc2626" roughness={0.4} />
          </mesh>
          {/* Tank inspection spiral stairway */}
          <mesh position={[4.28, 4.2, 0]}>
            <boxGeometry args={[0.3, 8.2, 0.6]} />
            <meshStandardMaterial color="#475569" metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Pump Shelter & Hydrant Distribution Manifold */}
      <group position={[0, 0, -18]}>
        <mesh position={[0, 1.8, 0]} castShadow>
          <boxGeometry args={[16, 3.2, 5]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Overhead safety warning sign */}
        <mesh position={[0, 2.2, 2.55]}>
          <planeGeometry args={[7, 1.2]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      </group>

      {/* Perimeter Security Floodlight */}
      <mesh position={[-17, 4.5, 13]}>
        <cylinderGeometry args={[0.15, 0.2, 9, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <pointLight position={[-17, 9, 13]} intensity={2.0} distance={40} color="#fef08a" />
    </group>
  );
}
