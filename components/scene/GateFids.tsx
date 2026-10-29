'use client';

import React from 'react';
import { useWT } from '@/lib/store';

/**
 * 3D Flight Information Display System (FIDS) Gate Boards
 * Mounted on the terminal frontage directly facing each gate stand.
 */
export function GateFids() {
  const activeSiteId = useWT((s) => s.activeSiteId);
  const site = useWT((s) => s.sites[activeSiteId]);

  if (!site) return null;

  return (
    <group name="GateFIDSDisplays">
      {site.gates.map((g) => {
        // Gate coordinates: x matches gateX
        const gx = -45 + g.idx * 30;
        const flight = site.flights.find((f) => f.id === g.flightId);

        return (
          <group key={g.idx} position={[gx, 8.8, 10.8]}>
            {/* Display mounting frame */}
            <mesh castShadow>
              <boxGeometry args={[4.2, 1.8, 0.3]} />
              <meshStandardMaterial color="#090d16" roughness={0.4} metalness={0.8} />
            </mesh>

            {/* Glowing electronic screen background */}
            <mesh position={[0, 0, 0.16]}>
              <planeGeometry args={[4.0, 1.6]} />
              <meshBasicMaterial color="#020617" />
            </mesh>

            {/* Gate indicator header (Yellow LED bar) */}
            <mesh position={[0, 0.6, 0.17]}>
              <planeGeometry args={[3.8, 0.25]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>

            {/* Status light */}
            <mesh position={[1.7, 0.6, 0.18]}>
              <circleGeometry args={[0.08, 12]} />
              <meshBasicMaterial color={flight?.phase === 'boarding' ? '#22c55e' : '#38bdf8'} />
            </mesh>
            <pointLight
              position={[0, 0, 0.5]}
              intensity={0.6}
              distance={8}
              color={flight ? '#38bdf8' : '#64748b'}
            />
          </group>
        );
      })}
    </group>
  );
}
