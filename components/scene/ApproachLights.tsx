'use client';

import React from 'react';
import * as THREE from 'three';

/**
 * ICAO CAT-II Approach Lighting System (ALS) & 4-unit PAPI light boxes for Runway 09L
 * Runway 09L threshold is located at x = -135, z = -72.
 */
export function ApproachLights() {
  const thresholdX = -135;
  const runwayZ = -72;

  // Approach light stations spaced every 15m west of threshold
  const stations = [-15, -30, -45, -60, -75, -90, -105, -120, -135, -150, -165, -180];

  return (
    <group name="ApproachLightingSystem">
      {/* ALS Centerline Light Bars & Crossbars */}
      {stations.map((dx, idx) => {
        const isCrossbar = idx === 3 || idx === 6; // 60m and 105m crossbars
        const barWidth = isCrossbar ? 28 : 8;
        return (
          <group key={dx} position={[thresholdX + dx, 0.4, runwayZ]}>
            {/* Mast foundation */}
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.2, 0.3, 0.6, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
            </mesh>
            {/* Horizontal light bar */}
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.5, 0.2, barWidth]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* White precision approach strobe lights */}
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.6, 0.15, barWidth - 0.4]} />
              <meshBasicMaterial color="#f8fafc" />
            </mesh>
            {isCrossbar && (
              <pointLight position={[0, 1.2, 0]} intensity={1.8} distance={35} color="#f8fafc" />
            )}
          </group>
        );
      })}

      {/* 4-Unit Precision Approach Path Indicator (PAPI) Boxes */}
      {/* Placed 30m past threshold, 14m left of runway edge */}
      <group position={[thresholdX + 38, 0, runwayZ - 18]}>
        {[-3, -1, 1, 3].map((dz, i) => (
          <group key={i} position={[0, 0, dz * 1.8]}>
            {/* Housing box */}
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.8, 0.5, 0.6]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.6} />
            </mesh>
            {/* Lens (2 white, 2 red for on-glideslope 3°) */}
            <mesh position={[0.42, 0.35, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.16, 0.16, 0.08, 16]} />
              <meshBasicMaterial color={i < 2 ? '#ffffff' : '#ef4444'} />
            </mesh>
            <pointLight
              position={[0.6, 0.4, 0]}
              intensity={1.2}
              distance={25}
              color={i < 2 ? '#ffffff' : '#ef4444'}
            />
          </group>
        ))}
      </group>
    </group>
  );
}
