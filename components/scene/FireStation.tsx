'use client';

import React from 'react';

/**
 * Airside ARFF (Airport Rescue and Fire Fighting) Cat-9 Station
 * Positioned mid-field with immediate rapid access to Runway 09L at [-105, 0, -25]
 */
export function FireStation() {
  const stationPos: [number, number, number] = [-105, 0, -28];

  return (
    <group position={stationPos} name="ARFFStation">
      {/* Main Firehouse Building */}
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 7, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
      </mesh>

      {/* ARFF Station Signage */}
      <mesh position={[0, 6.2, 7.05]}>
        <planeGeometry args={[18, 1.2]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>

      {/* Two High-Speed Vehicle Equipment Bays with Red Roll-up Doors */}
      {[-6, 6].map((dx, idx) => (
        <group key={dx} position={[dx, 2.5, 7.02]}>
          <mesh castShadow>
            <planeGeometry args={[8.5, 5]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.4} metalness={0.2} />
          </mesh>
          {/* Glass window strip across bay door */}
          <mesh position={[0, 0.6, 0.02]}>
            <planeGeometry args={[7.5, 0.7]} />
            <meshStandardMaterial color="#0284c7" roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Watch Room / Observation Cab on Roof */}
      <mesh position={[7, 8.2, 0]} castShadow>
        <boxGeometry args={[6, 3, 6]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Red Alert Rotating Strobe on Firehouse Roof */}
      <mesh position={[7, 10.2, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <pointLight position={[7, 10.5, 0]} intensity={2.5} distance={30} color="#ef4444" />

      {/* ARFF 6x6 Heavy Crash Tender (Rosenbauer / Oshkosh Striker style) */}
      <group position={[-6, 0, 14]} rotation={[0, 0, 0]}>
        {/* Chassis */}
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[3.2, 2.2, 8.5]} />
          <meshStandardMaterial color="#84cc16" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Cockpit panoramic glass */}
        <mesh position={[0, 1.8, 2.6]} castShadow>
          <boxGeometry args={[3.0, 1.3, 2.4]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
        {/* High-capacity roof water/foam turret monitor */}
        <mesh position={[0, 2.7, 2.2]} castShadow>
          <cylinderGeometry args={[0.25, 0.3, 0.9, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {/* Emergency Blue LED Lightbar */}
        <mesh position={[0, 2.65, 1.4]}>
          <boxGeometry args={[2.2, 0.25, 0.5]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <pointLight position={[0, 3.2, 1.4]} intensity={2.0} distance={20} color="#3b82f6" />
      </group>
    </group>
  );
}
