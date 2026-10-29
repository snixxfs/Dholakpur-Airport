'use client';

import React from 'react';

/**
 * Airside Perimeter Security System: Jet blast deflectors, boundary security fence lines,
 * and security checkpoint gates.
 */
export function PerimeterSecurity() {
  return (
    <group name="PerimeterSecurity">
      {/* Heavy Steel Jet Blast Deflector Screen behind Runway 09L threshold */}
      {/* Angled at 60 degrees to deflect jet engine exhaust upward */}
      <group position={[-148, 0, -72]} rotation={[0, 0, -Math.PI / 6]}>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 5.0, 36]} />
          <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.7} />
        </mesh>
        {/* Slanted chevron warning stripes */}
        <mesh position={[0.18, 2.5, 0]}>
          <planeGeometry args={[0.02, 35]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      </group>

      {/* Security Fence Along Airfield Northern Boundary */}
      {[-120, -70, -20, 30, 80, 130].map((x) => (
        <group key={x} position={[x, 0, -115]}>
          {/* Concrete barrier base */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[48, 0.8, 0.4]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} />
          </mesh>
          {/* Chainlink fence posts and mesh panel */}
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[47.8, 2.0, 0.05]} />
            <meshStandardMaterial color="#64748b" wireframe transparent opacity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Airfield Security Crash Gate & Guardhouse */}
      <group position={[-150, 0, 15]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <boxGeometry args={[4.5, 3.2, 4]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Boom barrier gate */}
        <mesh position={[4, 1.0, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[8, 0.15, 0.15]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
}
