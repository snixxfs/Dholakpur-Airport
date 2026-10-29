'use client';

import React from 'react';

/**
 * Airfield surface weathering, touchdown rubber tire skid marks,
 * apron hydraulic fluid weathering, and GSE equipment safety box hatch markings.
 */
export function SurfaceDetails() {
  const runwayZ = -72;
  // Touchdown zone located from x = -90 to x = -30
  const skidStrips = [-85, -75, -65, -55, -45, -35];

  return (
    <group name="SurfaceDetails">
      {/* Runway Touchdown Zone Rubber Tire Skid Marks */}
      {skidStrips.map((x, i) => (
        <group key={x} position={[x, 0.12, runwayZ]}>
          {/* Left gear tire rubber deposit tracks */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.5, 2.2]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.35 + (i % 3) * 0.15} />
          </mesh>
          {/* Right gear tire rubber deposit tracks */}
          <mesh position={[0, 0, 5.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.5, 2.2]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.38 + (i % 2) * 0.14} />
          </mesh>
          {/* Centerline nose gear scuff marks */}
          <mesh position={[0, 0, 2.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5.0, 0.8]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Apron Hydraulic & Engine Oil Weathering Stains at Gates 201-204 */}
      {[-45, -15, 15, 45].map((gx) => (
        <group key={gx} position={[gx, 0.11, 24]}>
          {/* Engine nacelle drip spots */}
          <mesh position={[-3.2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.2, 16]} />
            <meshBasicMaterial color="#090d16" transparent opacity={0.4} />
          </mesh>
          <mesh position={[3.2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.1, 16]} />
            <meshBasicMaterial color="#090d16" transparent opacity={0.4} />
          </mesh>
          {/* APU tail exhaust scuff mark */}
          <mesh position={[0, 0, -6.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.0, 3.5]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.3} />
          </mesh>
          {/* Red/White GSE Safety Boundary Line */}
          <mesh position={[7.5, 0, 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 14]} />
            <meshBasicMaterial color="#dc2626" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
