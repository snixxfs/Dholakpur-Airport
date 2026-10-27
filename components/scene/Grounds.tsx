'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { C } from './palette';
import { APRON_ZONE, GATE_COUNT, RUNWAY_09L, TAXIWAY_ALPHA, gateX } from '@/lib/layout';
import { useWT } from '@/lib/store';

type V3 = [number, number, number];

function Slab({
  pos,
  size,
  color,
  roughness = 0.85,
  metalness = 0.1,
  receive = true,
}: {
  pos: V3;
  size: V3;
  color: string;
  roughness?: number;
  metalness?: number;
  receive?: boolean;
}) {
  return (
    <mesh position={pos} receiveShadow={receive}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/* ------------------------------------------------------------- Taxiway Guidance Signs */

function AirfieldSign({
  pos,
  text,
  type = 'location',
}: {
  pos: V3;
  text: string;
  type?: 'location' | 'direction' | 'mandatory';
}) {
  const bgColor = type === 'mandatory' ? '#dc2626' : type === 'location' ? '#0f172a' : '#f59e0b';
  const textColor = type === 'location' ? '#f59e0b' : '#ffffff';

  return (
    <group position={pos}>
      {/* Sign Housing Box */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.4, 0.65, 0.25]} />
        <meshStandardMaterial color={bgColor} roughness={0.3} />
      </mesh>
      {/* Mounting Stems */}
      {[-0.45, 0.45].map((sx) => (
        <mesh key={sx} position={[sx, 0.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
      ))}
      {/* Illuminated Front Face */}
      <mesh position={[0, 0.45, 0.13]}>
        <planeGeometry args={[1.25, 0.5]} />
        <meshStandardMaterial color={bgColor} emissive={bgColor} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------- High-Mast Apron Floodlights */

function HighMastFloodlight({ pos }: { pos: V3 }) {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';

  return (
    <group position={pos}>
      {/* Steel Lattice Mast */}
      <mesh position={[0, 10, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, 20, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Head Luminaire Frame */}
      <mesh position={[0, 20.2, 0]} castShadow>
        <boxGeometry args={[3.2, 0.4, 1.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Multi-head Floodlight Banks */}
      {[-1.1, 0, 1.1].map((fx) => (
        <mesh key={fx} position={[fx, 19.8, 0.5]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.8, 0.6, 0.3]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={isNight ? 4 : 0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- Aeronautical Lights */

function RunwayLights({ isNight }: { isNight: boolean }) {
  const lightsRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!lightsRef.current) return;
    const pulse = 0.88 + Math.sin(clock.elapsedTime * 6) * 0.12;
    const nightBoost = isNight ? 2.5 : 1.0;
    lightsRef.current.children.forEach((c) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = pulse * nightBoost;
    });
  });

  const lights: [number, number, number, string][] = useMemo(() => {
    const list: [number, number, number, string][] = [];
    // White runway edge lights along Runway 09L/27R
    for (let x = -225; x <= 225; x += 15) {
      list.push([x, 0.28, RUNWAY_09L.z - RUNWAY_09L.width / 2 + 0.35, '#ffffff']);
      list.push([x, 0.28, RUNWAY_09L.z + RUNWAY_09L.width / 2 - 0.35, '#ffffff']);
    }
    // Green threshold lights across Runway 09L threshold
    for (let z = RUNWAY_09L.z - RUNWAY_09L.width / 2 + 1; z <= RUNWAY_09L.z + RUNWAY_09L.width / 2 - 1; z += 1.8) {
      list.push([-225, 0.32, z, C.lightGreenThresh]);
      list.push([225, 0.32, z, C.lightRedEnd]);
    }
    // Blue taxiway edge lights along Taxiway Alpha
    for (let x = -175; x <= 155; x += 12) {
      list.push([x, 0.24, TAXIWAY_ALPHA.z - TAXIWAY_ALPHA.width / 2, C.lightBlueTaxi]);
      list.push([x, 0.24, TAXIWAY_ALPHA.z + TAXIWAY_ALPHA.width / 2, C.lightBlueTaxi]);
    }
    // Green taxiway centerline lights
    for (let x = -170; x <= 150; x += 14) {
      list.push([x, 0.22, TAXIWAY_ALPHA.z, C.lightGreenTaxi]);
    }
    return list;
  }, []);

  return (
    <group ref={lightsRef}>
      {lights.map(([x, y, z, color], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.12, 0.14, 0.28, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isNight ? 2.5 : 1.2}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function PapiLightArray() {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';
  const papiX = RUNWAY_09L.touchdownX - 16;
  const papiZ = RUNWAY_09L.z + RUNWAY_09L.width / 2 + 4.5;

  return (
    <group position={[papiX, 0.1, papiZ]}>
      {[-4.5, -1.5, 1.5, 4.5].map((offX, i) => {
        const isWhite = i < 2; // 2 white, 2 red on 3° glideslope
        const color = isWhite ? C.lightWhite : C.lightRedPAPI;
        return (
          <group key={i} position={[offX, 0, 0]}>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.7, 0.6, 0.8]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.45, -0.42]}>
              <circleGeometry args={[0.22, 14]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isNight ? 3.5 : 2.2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Windsock({ x, z }: { x: number; z: number }) {
  const sockRef = useRef<THREE.Group>(null);
  const weather = useWT((s) => s.sites[s.activeSiteId].weather);

  useFrame(({ clock }) => {
    if (!sockRef.current) return;
    const baseAngle = ((weather.windHeading - 180) * Math.PI) / 180;
    sockRef.current.rotation.y = baseAngle + Math.sin(clock.elapsedTime * 1.8) * 0.08;
  });

  return (
    <group position={[x, 0, z]}>
      {/* Mast */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 7, 8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Swivel Basket */}
      <mesh position={[0, 6.9, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 10]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {/* Fabric Cone */}
      <group ref={sockRef} position={[0, 6.9, 0]}>
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[1.6, 0, 0]} castShadow>
          <coneGeometry args={[0.55, 3.2, 16, 1, true]} />
          <meshStandardMaterial color="#ea580c" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function PalmCluster({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 2.5, 0]} rotation={[0.06, 0, -0.05]} castShadow>
        <cylinderGeometry args={[0.22, 0.35, 5, 8]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      <group position={[0, 4.9, 0]}>
        {Array.from({ length: 7 }, (_, i) => {
          const rotY = (i * Math.PI * 2) / 7;
          return (
            <mesh key={i} rotation={[0.45, rotY, 0]} castShadow>
              <coneGeometry args={[1.6, 3.4, 4]} />
              <meshStandardMaterial color="#365314" roughness={0.8} flatShading />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- Airfield Grounds */

export function Grounds({ gates = GATE_COUNT }: { gates?: number }) {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';

  const gardenMounds = useMemo(() => {
    const list: [number, number, number][] = [];
    // Forecourt landscaped garden mounds (Kempegowda T2 signature)
    for (let x = -70; x <= 70; x += 22) {
      list.push([x + Math.sin(x) * 3, -48 - Math.cos(x) * 4, 1.1 + Math.abs(Math.sin(x)) * 0.3]);
    }
    // Perimeter landscaped boundary
    for (let x = -180; x <= 180; x += 32) {
      list.push([x, 115, 0.95]);
      list.push([x, -68, 1.05]);
    }
    return list;
  }, []);

  return (
    <group>
      {/* 1. Large Base Airfield Landscape (Realistic Muted Deccan Sage/Olive Turf) */}
      <Slab pos={[0, -0.6, 25]} size={[580, 1.0, 380]} color={C.terrainGrass} roughness={0.95} />

      {/* Red Devanahalli Loam Earth Grading along airfield perimeter */}
      <Slab pos={[0, -0.55, -75]} size={[580, 0.9, 45]} color={C.terrainLoamRed} roughness={0.98} />
      <Slab pos={[0, -0.55, 125]} size={[580, 0.9, 45]} color={C.terrainLoamRed} roughness={0.98} />
      <Slab pos={[-275, -0.55, 25]} size={[35, 0.9, 250]} color={C.terrainLoamRed} roughness={0.98} />
      <Slab pos={[275, -0.55, 25]} size={[35, 0.9, 250]} color={C.terrainLoamRed} roughness={0.98} />

      {/* 2. Runway 09L/27R Structural Base (480m total length!) */}
      {/* Graded Crushed Gravel Runway Safety Area */}
      <Slab pos={[0, 0.05, RUNWAY_09L.z]} size={[RUNWAY_09L.xMax - RUNWAY_09L.xMin + 45, 0.22, RUNWAY_09L.width + 12]} color={C.terrainGravel} roughness={0.92} />
      {/* Bituminous Asphalt Shoulder */}
      <Slab pos={[0, 0.08, RUNWAY_09L.z]} size={[RUNWAY_09L.xMax - RUNWAY_09L.xMin + 35, 0.25, RUNWAY_09L.width + 5]} color={C.runwayShoulder} roughness={0.9} />
      {/* Main High-Grade Bitumen Runway Surface */}
      <Slab pos={[0, 0.12, RUNWAY_09L.z]} size={[RUNWAY_09L.xMax - RUNWAY_09L.xMin, 0.28, RUNWAY_09L.width]} color={C.runwayAsphalt} roughness={0.88} />

      {/* Runway Blast Pads with Yellow Chevrons */}
      {[-230, 230].map((bx) => (
        <group key={bx} position={[bx, 0.28, RUNWAY_09L.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[18, RUNWAY_09L.width]} />
            <meshStandardMaterial color={C.runwayShoulder} />
          </mesh>
          {[-6, 0, 6].map((cx) => (
            <mesh key={cx} position={[cx, 0.02, 0]} rotation={[-Math.PI / 2, 0, bx < 0 ? Math.PI / 4 : -Math.PI / 4]}>
              <planeGeometry args={[0.9, 8]} />
              <meshStandardMaterial color={C.blastPadChevron} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Threshold Piano Keys (12 stripes on each threshold) */}
      {Array.from({ length: 12 }, (_, i) => {
        const zOff = (i - 5.5) * 1.5;
        return (
          <group key={`piano-${i}`}>
            <mesh position={[-210, 0.29, RUNWAY_09L.z + zOff]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[16, 0.9]} />
              <meshStandardMaterial color={C.runwayMarkingWhite} />
            </mesh>
            <mesh position={[210, 0.29, RUNWAY_09L.z + zOff]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[16, 0.9]} />
              <meshStandardMaterial color={C.runwayMarkingWhite} />
            </mesh>
          </group>
        );
      })}

      {/* Runway Numbers: '09L' at West, '27R' at East */}
      <mesh position={[-185, 0.29, RUNWAY_09L.z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[9, 4.5]} />
        <meshStandardMaterial color={C.runwayMarkingWhite} />
      </mesh>
      <mesh position={[185, 0.29, RUNWAY_09L.z]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <planeGeometry args={[9, 4.5]} />
        <meshStandardMaterial color={C.runwayMarkingWhite} />
      </mesh>

      {/* Touchdown Aiming Point Markers (4 heavy 20m blocks) */}
      {[-130, -90, 90, 130].map((tx) => (
        <group key={tx}>
          <mesh position={[tx, 0.29, RUNWAY_09L.z - 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 2.2]} />
            <meshStandardMaterial color={C.runwayMarkingWhite} />
          </mesh>
          <mesh position={[tx, 0.29, RUNWAY_09L.z + 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 2.2]} />
            <meshStandardMaterial color={C.runwayMarkingWhite} />
          </mesh>
          {/* Heavy tire skid rubber deposits on touchdown zone */}
          <mesh position={[tx, 0.295, RUNWAY_09L.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[24, 7]} />
            <meshStandardMaterial color={C.touchdownRubber} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* Runway Dashed Centerline */}
      {Array.from({ length: 28 }, (_, i) => {
        const cx = -190 + i * 14;
        return (
          <mesh key={`cl-${i}`} position={[cx, 0.29, RUNWAY_09L.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[9, 0.9]} />
            <meshStandardMaterial color={C.runwayMarkingWhite} />
          </mesh>
        );
      })}

      {/* 3. Parallel Taxiway Alpha */}
      <Slab pos={[-10, 0.1, TAXIWAY_ALPHA.z]} size={[350, 0.25, TAXIWAY_ALPHA.width]} color={C.taxiwayAsphalt} roughness={0.88} />
      {/* Taxiway Centerline */}
      <mesh position={[-10, 0.27, TAXIWAY_ALPHA.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[348, 0.6]} />
        <meshStandardMaterial color={C.taxiwayLineYellow} />
      </mesh>

      {/* Rapid-Exit High-Speed Taxiway Turnoff (30° angle) */}
      <mesh position={[45, 0.11, 70]} rotation={[0, -Math.PI / 6, 0]}>
        <boxGeometry args={[TAXIWAY_ALPHA.width, 0.25, 42]} />
        <meshStandardMaterial color={C.taxiwayAsphalt} />
      </mesh>
      <mesh position={[45, 0.27, 70]} rotation={[0, -Math.PI / 6, 0]}>
        <boxGeometry args={[0.6, 0.05, 41]} />
        <meshStandardMaterial color={C.taxiwayLineYellow} />
      </mesh>

      {/* Runway 09L Entrance & Holding Point (Hold-short lines) */}
      <Slab pos={[-165, 0.11, 70]} size={[TAXIWAY_ALPHA.width, 0.25, 36]} color={C.taxiwayAsphalt} />
      <mesh position={[-165, 0.28, 74]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TAXIWAY_ALPHA.width - 0.8, 1.2]} />
        <meshStandardMaterial color={C.taxiwayLineYellow} />
      </mesh>

      {/* Taxiway Guidance Signs */}
      <AirfieldSign pos={[-175, 0, 72]} text="09L-27R" type="mandatory" />
      <AirfieldSign pos={[-155, 0, 72]} text="A" type="location" />
      <AirfieldSign pos={[35, 0, 72]} text="B ->" type="direction" />
      <AirfieldSign pos={[55, 0, 72]} text="09L-27R" type="mandatory" />

      {/* 4. Terminal 2 Concrete Apron & Parking Stands */}
      <Slab pos={[0, 0.12, 25]} size={[170, 0.26, 38]} color={C.apronConcrete} roughness={0.8} />

      {/* Concrete Expansion Joint Grid Lines */}
      {Array.from({ length: 14 }, (_, i) => {
        const sx = -75 + i * 12;
        return (
          <mesh key={`seam-${i}`} position={[sx, 0.27, 25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 38]} />
            <meshStandardMaterial color={C.apronJoint} />
          </mesh>
        );
      })}

      {/* Parking Stands (Gates 201 to 204) */}
      {Array.from({ length: gates }, (_, i) => {
        const gx = gateX(i, gates);
        return (
          <group key={`stand-${i}`}>
            {/* Lead-in Line from Taxiway Alpha */}
            <mesh position={[gx, 0.27, 34]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.5, 20]} />
              <meshStandardMaterial color={C.apronStandYellow} />
            </mesh>
            {/* T-Bar Stop Line for Nose Wheels */}
            <mesh position={[gx, 0.275, 14]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[6.5, 0.8]} />
              <meshStandardMaterial color={C.apronStandYellow} />
            </mesh>
            {/* Stand Red Safety Clearance Box */}
            <mesh position={[gx, 0.265, 22.5]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[22, 28]} />
              <meshStandardMaterial color="#fee2e2" transparent opacity={0.25} />
            </mesh>
            {/* GSE Staging Box (White dashed equipment zone) */}
            <mesh position={[gx + 8.5, 0.27, 20]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[6, 12]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* High-Mast Apron Floodlight Towers */}
      <HighMastFloodlight pos={[-75, 0, 16]} />
      <HighMastFloodlight pos={[-15, 0, 16]} />
      <HighMastFloodlight pos={[45, 0, 16]} />
      <HighMastFloodlight pos={[75, 0, 16]} />

      {/* Landscaped Palms and Forecourt Gardens */}
      {gardenMounds.map(([x, z, s], i) => (
        <PalmCluster key={i} x={x} z={z} scale={s} />
      ))}

      {/* Operational Lighting & Instruments */}
      <RunwayLights isNight={isNight} />
      <PapiLightArray />
      <Windsock x={RUNWAY_09L.touchdownX - 35} z={RUNWAY_09L.z + 18} />
    </group>
  );
}
