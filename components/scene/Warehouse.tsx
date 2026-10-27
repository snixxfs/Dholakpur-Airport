'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { C } from './palette';
import { ATC_TOWER, GATE_COUNT, TERMINAL_T2, gateX } from '@/lib/layout';
import { useWT } from '@/lib/store';

export type GateVisual = 'free' | 'docking' | 'unloading' | 'boarding' | 'maintenance';

/* ------------------------------------------------------------------ ATC Tower */

function KempegowdaAtcTower() {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';
  const radarRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (radarRef.current) {
      radarRef.current.rotation.y = clock.elapsedTime * 2.2;
    }
    if (beaconRef.current) {
      const flash = Math.sin(clock.elapsedTime * 8) > 0.35 ? 3.5 : 0.2;
      beaconRef.current.emissiveIntensity = isNight ? flash * 1.5 : flash;
    }
  });

  return (
    <group position={[ATC_TOWER.x, 0, ATC_TOWER.z]}>
      {/* Heavy Base Plinth */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[ATC_TOWER.baseRadius * 1.25, ATC_TOWER.baseRadius * 1.35, 3.0, 24]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* Architectural Fluted Tower Shaft (48m soaring) */}
      <mesh position={[0, ATC_TOWER.shaftHeight / 2 + 3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[ATC_TOWER.baseRadius * 0.75, ATC_TOWER.baseRadius * 1.15, ATC_TOWER.shaftHeight, 24]} />
        <meshStandardMaterial color={C.towerShaft} roughness={0.6} />
      </mesh>

      {/* Fluted Vertical Ribs (signature BLR fluted architectural treatment) */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(angle) * (ATC_TOWER.baseRadius * 0.78),
              ATC_TOWER.shaftHeight / 2 + 3,
              Math.cos(angle) * (ATC_TOWER.baseRadius * 0.78),
            ]}
            rotation={[0, angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.4, ATC_TOWER.shaftHeight, 0.7]} />
            <meshStandardMaterial color={C.towerFlutedRibs} roughness={0.4} metalness={0.5} />
          </mesh>
        );
      })}

      {/* Observation Deck Underside Flare */}
      <mesh position={[0, ATC_TOWER.shaftHeight + 4.2, 0]} castShadow>
        <cylinderGeometry args={[ATC_TOWER.cabRadius * 1.15, ATC_TOWER.baseRadius * 0.8, 2.8, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* 360° Glazed Air Traffic Control Cab */}
      <mesh position={[0, ATC_TOWER.shaftHeight + 7.0, 0]}>
        <cylinderGeometry args={[ATC_TOWER.cabRadius, ATC_TOWER.cabRadius * 0.88, 3.8, 24]} />
        <meshStandardMaterial
          color={isNight ? '#fef08a' : C.towerCabGlass}
          emissive={isNight ? '#fef08a' : '#000000'}
          emissiveIntensity={isNight ? 1.4 : 0}
          roughness={0.08}
          transparent
          opacity={isNight ? 0.95 : 0.75}
        />
      </mesh>

      {/* Geometric Conical Roof Cap & Spire */}
      <mesh position={[0, ATC_TOWER.shaftHeight + 9.8, 0]} castShadow>
        <cylinderGeometry args={[ATC_TOWER.cabRadius * 0.85, ATC_TOWER.cabRadius * 1.08, 1.8, 24]} />
        <meshStandardMaterial color={C.timberRoofCanopy} roughness={0.4} />
      </mesh>

      {/* Communications Mast & Spire */}
      <mesh position={[0, ATC_TOWER.shaftHeight + 13.5, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 6.0, 8]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.8} />
      </mesh>

      {/* Rotating Primary Surveillance Radar Dish */}
      <group ref={radarRef} position={[0, ATC_TOWER.shaftHeight + 11.2, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[2.4, 2.4, 0.25, 20, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={C.radarRed} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 1.8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Obstruction Warning Beacons */}
      {[-0.8, 0.8].map((bx) => (
        <mesh key={bx} position={[bx, ATC_TOWER.shaftHeight + 16.6, 0]}>
          <sphereGeometry args={[0.26, 12, 12]} />
          <meshStandardMaterial ref={beaconRef} color={C.beaconRed} emissive={C.beaconRed} emissiveIntensity={3} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- Dual Aerobridge Gate */

function DualAerobridgeGate({
  x,
  gateIndex,
  gateNumber,
  connected,
  state,
  selected,
}: {
  x: number;
  gateIndex: number;
  gateNumber: string;
  connected: boolean;
  state: GateVisual;
  selected: boolean;
}) {
  const select = useWT((s) => s.select);
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';
  const vdgsRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!vdgsRef.current) return;
    const pulse = state === 'boarding' || state === 'unloading' ? 0.7 + Math.sin(clock.elapsedTime * 6) * 0.3 : 1.0;
    vdgsRef.current.emissiveIntensity = pulse * (isNight ? 2.5 : 1.6);
  });

  const vdgsColor =
    state === 'free'
      ? C.lightGreenThresh
      : state === 'boarding'
      ? C.apronStandYellow
      : state === 'unloading'
      ? C.terminalGlassAirside
      : C.lightAmberPAPI;

  return (
    <group
      position={[x, 0, TERMINAL_T2.frontAirsideZ]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select({ kind: 'gate', idx: gateIndex });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* Pier Rotunda Structure */}
      <mesh position={[0, 5.5, 1.4]} castShadow>
        <cylinderGeometry args={[2.8, 2.8, 5.5, 16]} />
        <meshStandardMaterial color={selected ? C.terminalFasciaGold : C.terminalSteelTruss} roughness={0.4} />
      </mesh>

      {/* Gate Identification Signboard ("GATE 201") */}
      <mesh position={[0, 9.4, 1.8]} castShadow>
        <boxGeometry args={[4.4, 1.5, 0.35]} />
        <meshStandardMaterial color="#020617" roughness={0.2} />
      </mesh>

      {/* VDGS Screen */}
      <mesh position={[0, 9.4, 2.0]}>
        <planeGeometry args={[4.0, 1.1]} />
        <meshStandardMaterial ref={vdgsRef} color={vdgsColor} emissive={vdgsColor} emissiveIntensity={1.8} />
      </mesh>

      {/* Aerobridge Tunnel 1 (Main Forward Door) */}
      <group position={[-1.2, 5.2, connected ? 5.8 : 3.4]}>
        <mesh castShadow>
          <boxGeometry args={[2.2, 2.8, connected ? 8.6 : 4.2]} />
          <meshStandardMaterial color={C.jetbridgeMetal} roughness={0.3} metalness={0.3} />
        </mesh>
        {/* Full-length glass viewing panel on jetbridge side */}
        {[-1.12, 1.12].map((wx) => (
          <mesh key={wx} position={[wx, 0.2, 0]}>
            <boxGeometry args={[0.04, 1.6, connected ? 8.2 : 3.8]} />
            <meshStandardMaterial color={C.terminalGlassAirside} roughness={0.1} transparent opacity={0.78} />
          </mesh>
        ))}
        {/* Accordion Door Seal */}
        <mesh position={[0, 0, (connected ? 8.6 : 4.2) / 2 + 0.45]} castShadow>
          <boxGeometry args={[2.5, 3.0, 0.9]} />
          <meshStandardMaterial color={C.jetbridgeAccordion} roughness={0.9} />
        </mesh>
      </group>

      {/* Aerobridge Tunnel 2 (Second Door for Widebody Boarding) */}
      <group position={[1.8, 5.2, connected ? 4.8 : 2.8]} rotation={[0, 0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.0, 2.6, connected ? 6.8 : 3.2]} />
          <meshStandardMaterial color={C.jetbridgeMetal} roughness={0.3} metalness={0.3} />
        </mesh>
        <mesh position={[1.02, 0.2, 0]}>
          <boxGeometry args={[0.04, 1.4, connected ? 6.4 : 2.8]} />
          <meshStandardMaterial color={C.terminalGlassAirside} roughness={0.1} transparent opacity={0.78} />
        </mesh>
      </group>

      {/* Wheeled Support Bogies & Telescopic Hydraulic Legs */}
      <mesh position={[-1.2, 2.2, connected ? 7.2 : 4.2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 4.4, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
      {[-0.8, 0.8].map((bx) => (
        <mesh key={bx} position={[-1.2 + bx, 0.55, connected ? 7.2 : 4.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.35, 12]} />
          <meshStandardMaterial color={C.tireBlack} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- Landscaping & Palm Trees */

function PalmTree({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  return (
    <group position={pos} scale={scale}>
      {/* Slightly curving segmented trunk */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.42, 6.4, 7]} />
        <meshStandardMaterial color="#6d4f3b" roughness={0.9} />
      </mesh>
      {/* Coconut / palm frond crown */}
      <group position={[0, 6.4, 0]}>
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 6;
          return (
            <mesh
              key={i}
              position={[Math.sin(angle) * 1.5, -0.4, Math.cos(angle) * 1.5]}
              rotation={[0.4, angle, 0]}
              castShadow
            >
              <coneGeometry args={[1.6, 3.2, 4]} />
              <meshStandardMaterial color="#2d5a27" roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- Terminal 1 Complex */

function KempegowdaTerminal1() {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';

  return (
    <group position={[-115, 0, -2]}>
      {/* Main Terminal 1 Plinth */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[65, 8, 36]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
      </mesh>

      {/* BLR T1 Iconic Curved Barrel Vault Metallic Roof */}
      <mesh position={[0, 8.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[18.5, 18.5, 65, 32, 1, false, Math.PI * 0.15, Math.PI * 0.7]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Airside Glass Curtain Wall */}
      <mesh position={[0, 4.5, 18.1]}>
        <planeGeometry args={[63, 7]} />
        <meshStandardMaterial
          color={isNight ? '#fef08a' : '#38bdf8'}
          emissive={isNight ? '#fef08a' : '#000000'}
          emissiveIntensity={isNight ? 1.0 : 0}
          roughness={0.1}
          transparent
          opacity={isNight ? 0.9 : 0.7}
        />
      </mesh>

      {/* Terminal 1 Facade Signage Banner */}
      <mesh position={[0, 9.2, -18.2]}>
        <boxGeometry args={[32, 2.2, 0.4]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 9.2, -18.45]}>
        <planeGeometry args={[30, 1.6]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>

      {/* Landside Forecourt Drop-off Canopy */}
      <mesh position={[0, 4.2, -22]} castShadow>
        <boxGeometry args={[58, 0.4, 9]} />
        <meshStandardMaterial color="#64748b" roughness={0.4} />
      </mesh>
      {[-24, -8, 8, 24].map((px) => (
        <mesh key={px} position={[px, 2.1, -22]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 4.2, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.6} />
        </mesh>
      ))}

      {/* Gates 101, 102, 103 Boarding Bridges */}
      {[-25, 0, 25].map((gx, idx) => (
        <group key={gx} position={[gx, 4.5, 18]}>
          {/* Rotunda */}
          <mesh position={[0, 0, 1.2]} castShadow>
            <cylinderGeometry args={[1.5, 1.5, 3.2, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.4} />
          </mesh>
          {/* Glass Jetbridge Tunnel */}
          <mesh position={[0, 0, 6.5]} castShadow>
            <boxGeometry args={[2.2, 2.6, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 10.6]} castShadow>
            <boxGeometry args={[2.6, 2.8, 1.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- Multi-Level Car Parking (MLCP) */

function MultiLevelCarParking() {
  return (
    <group position={[65, 0, -65]}>
      {/* 4-Level Concrete Parking Structure */}
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[36, 10, 28]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>
      {/* Floor Slabs Openings */}
      {[2.5, 5.0, 7.5].map((fy) => (
        <mesh key={fy} position={[0, fy, 0]}>
          <boxGeometry args={[36.4, 0.4, 28.4]} />
          <meshStandardMaterial color="#64748b" roughness={0.6} />
        </mesh>
      ))}
      {/* Exterior Aluminum Louver Screening */}
      {[-17.8, 17.8].map((lx) => (
        <mesh key={lx} position={[lx, 5, 0]}>
          <boxGeometry args={[0.3, 8.5, 26]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Rooftop Solar Panels / Parking Canopy */}
      <mesh position={[0, 10.6, 0]} castShadow>
        <boxGeometry args={[34, 0.3, 26]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Illuminated Stairwell & Elevator Cores */}
      <mesh position={[16, 6, 12]} castShadow>
        <boxGeometry args={[5, 12, 5]} />
        <meshStandardMaterial color="#0284c7" transparent opacity={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------- Landside Roundabout & Gantry */

function LandsideRoundaboutAndHighway() {
  return (
    <group position={[0, 0, -75]}>
      {/* Central Landscaped Garden Island */}
      <mesh position={[0, 0.28, 0]} receiveShadow>
        <cylinderGeometry args={[20, 21, 0.55, 32]} />
        <meshStandardMaterial color="#3f4e30" roughness={0.9} />
      </mesh>
      {/* Concrete Curb Ring */}
      <mesh position={[0, 0.35, 0]}>
        <ringGeometry args={[19.8, 20.8, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>

      {/* Decorative Garden Sculpture / Water Fountain */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[3.2, 4.5, 2.5, 16]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.4} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[1.8, 3.0, 16]} />
        <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Palm Trees ring around the roundabout */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        return (
          <PalmTree
            key={i}
            pos={[Math.sin(angle) * 14, 0.28, Math.cos(angle) * 14]}
            scale={0.9}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------- Cargo & Maintenance */

function AirfieldAncillaryBuildings() {
  return (
    <group>
      {/* 1. West Maintenance Hangar & ARFF Fire Station (Shifted west of T1) */}
      <group position={[-190, 0, 15]}>
        {/* Main Hangar Body */}
        <mesh position={[0, 9, 0]} castShadow receiveShadow>
          <boxGeometry args={[48, 18, 38]} />
          <meshStandardMaterial color={C.hangarRoof} roughness={0.5} />
        </mesh>
        {/* Arched Curved Roof Cap */}
        <mesh position={[0, 18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[6.5, 6.5, 48, 24, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={C.hangarSteel} roughness={0.4} />
        </mesh>
        {/* Retractable Giant Hangar Doors */}
        <mesh position={[0, 7.5, 19.1]}>
          <boxGeometry args={[44, 15, 0.4]} />
          <meshStandardMaterial color={C.hangarDoors} roughness={0.6} />
        </mesh>
        {/* Hangar Warning Yellow/Black Chevron Strip */}
        <mesh position={[0, 0.3, 20]}>
          <planeGeometry args={[44, 0.6]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>

        {/* Airport Rescue & Fire Fighting (ARFF) Crash Station Adjacent */}
        <group position={[32, 0, 0]}>
          <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[18, 9, 28]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
          {/* Red Rapid-Response Appliance Bay Doors */}
          {[-5, 0, 5].map((dx) => (
            <mesh key={dx} position={[dx, 2.8, 14.1]}>
              <boxGeometry args={[3.8, 5.2, 0.3]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 2. Air Cargo Logistics Center */}
      <group position={[115, 0, 15]}>
        <mesh position={[0, 6.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[46, 13, 36]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>
        {/* Cargo Loading Dock Bays */}
        {[-14, -7, 0, 7, 14].map((dx) => (
          <mesh key={dx} position={[dx, 2.5, 18.1]}>
            <boxGeometry args={[4.2, 4.5, 0.4]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* 3. Jet-A1 Aviation Fuel Farm (White Cylindrical Storage Tanks) */}
      <group position={[135, 0, 65]}>
        {/* Concrete Safety Bund Wall */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[32, 2.4, 24]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
        {/* 3 Large White Jet-A1 Fuel Tanks */}
        {[-9, 0, 9].map((tx) => (
          <mesh key={tx} position={[tx, 5.5, 0]} castShadow>
            <cylinderGeometry args={[3.8, 3.8, 8.5, 24]} />
            <meshStandardMaterial color={C.fuelTankWhite} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- Terminal 2 Building */

export function Warehouse({
  docks = GATE_COUNT,
  dockStates,
}: {
  docks?: number;
  dockStates?: GateVisual[];
}) {
  const selection = useWT((s) => s.selection);
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';
  const site = useWT((s) => s.sites[s.activeSiteId]);

  return (
    <group>
      {/* ================= Kempegowda Terminal 2 "Terminal in a Garden" Complex ================= */}
      
      {/* 1. Precast Concrete Ground Plinth (Level 1: Arrivals & Baggage Infrastructure) */}
      <mesh position={[0, 3.5, TERMINAL_T2.centerZ]} castShadow receiveShadow>
        <boxGeometry args={[TERMINAL_T2.width, 7.0, TERMINAL_T2.depth]} />
        <meshStandardMaterial color={C.terminalPlinth} roughness={0.7} />
      </mesh>

      {/* 2. Elevated Departures Concourse (Level 2: Check-in & Gate Lounges) */}
      <mesh position={[0, 9.5, TERMINAL_T2.centerZ]} castShadow receiveShadow>
        <boxGeometry args={[TERMINAL_T2.width - 2, 5.0, TERMINAL_T2.depth - 2]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>

      {/* 3. Undulating Bamboo/Timber Wave Canopies (BLR T2 signature soaring wave profile) */}
      {Array.from({ length: 6 }, (_, i) => {
        const bayZ = TERMINAL_T2.centerZ - TERMINAL_T2.depth / 2 + 5 + i * 8.5;
        const waveY = TERMINAL_T2.height + 1.8 + Math.sin(i * 1.1) * 0.9;
        return (
          <group key={i} position={[0, waveY, bayZ]}>
            {/* Curved Rafter Canopy */}
            <mesh castShadow>
              <boxGeometry args={[TERMINAL_T2.width + TERMINAL_T2.roofOverhang * 2, 1.4, 9.2]} />
              <meshStandardMaterial color={C.timberRoofCanopy} roughness={0.4} />
            </mesh>
            {/* Warm Underside Bamboo Rafter Slats */}
            <mesh position={[0, -0.75, 0]}>
              <boxGeometry args={[TERMINAL_T2.width + TERMINAL_T2.roofOverhang * 1.8, 0.2, 8.8]} />
              <meshStandardMaterial color={C.timberRoofUnderside} roughness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* 4. Royal Gold Architectural Fascia Trim */}
      <mesh position={[0, TERMINAL_T2.height + 2.2, TERMINAL_T2.frontAirsideZ + TERMINAL_T2.roofOverhang]} castShadow>
        <boxGeometry args={[TERMINAL_T2.width + TERMINAL_T2.roofOverhang * 2 + 0.4, 1.8, 0.8]} />
        <meshStandardMaterial color={C.terminalFasciaGold} roughness={0.25} metalness={0.7} />
      </mesh>

      {/* 5. Expansive Airside Double-Height Glass Curtain Wall */}
      <mesh position={[0, TERMINAL_T2.height / 2, TERMINAL_T2.frontAirsideZ + 0.15]}>
        <boxGeometry args={[TERMINAL_T2.width - 4, TERMINAL_T2.height - 1.5, 0.25]} />
        <meshStandardMaterial
          color={isNight ? C.terminalGlassInterior : C.terminalGlassAirside}
          emissive={isNight ? C.terminalGlassInterior : '#000000'}
          emissiveIntensity={isNight ? 1.1 : 0}
          roughness={0.08}
          metalness={0.2}
          transparent
          opacity={isNight ? 0.95 : 0.75}
        />
      </mesh>

      {/* Structural Steel Mullions along Airside Facade */}
      {Array.from({ length: 18 }, (_, i) => {
        const mx = -TERMINAL_T2.width / 2 + 5 + i * ((TERMINAL_T2.width - 10) / 17);
        return (
          <mesh key={i} position={[mx, TERMINAL_T2.height / 2, TERMINAL_T2.frontAirsideZ + 0.35]} castShadow>
            <boxGeometry args={[0.35, TERMINAL_T2.height - 1.5, 0.35]} />
            <meshStandardMaterial color={C.terminalSteelTruss} roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}

      {/* 6. Diamond-Lattice Architectural Bamboo Columns (The signature T2 4-leg column clusters) */}
      {[-55, -25, 0, 25, 55].map((cx) => (
        <group key={cx} position={[cx, 0, TERMINAL_T2.frontAirsideZ + 2.0]}>
          {[-1.2, 1.2].map((ox) =>
            [-1.2, 1.2].map((oz) => (
              <mesh key={`${ox}-${oz}`} position={[ox, TERMINAL_T2.height / 2, oz]} castShadow>
                <cylinderGeometry args={[0.55, 0.85, TERMINAL_T2.height, 12]} />
                <meshStandardMaterial color={C.timberColumns} roughness={0.5} />
              </mesh>
            ))
          )}
          {/* Top Capital Truss */}
          <mesh position={[0, TERMINAL_T2.height - 0.5, 0]} castShadow>
            <boxGeometry args={[4.2, 1.2, 4.2]} />
            <meshStandardMaterial color={C.timberRoofUnderside} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* 7. Landside Departures Elevated Flyover Roadway & Curbside Drop-off */}
      <group position={[0, 0, TERMINAL_T2.backLandsideZ - 12]}>
        {/* Elevated Concrete Viaduct */}
        <mesh position={[0, 4.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[TERMINAL_T2.width + 30, 0.9, 18]} />
          <meshStandardMaterial color={C.forecourtRoad} roughness={0.8} />
        </mesh>
        {/* Flyover Support Columns */}
        {[-60, -30, 0, 30, 60].map((vx) => (
          <mesh key={vx} position={[vx, 2.4, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.3, 4.8, 16]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
        ))}
        {/* Curbside Drop-off Glass Canopy */}
        <mesh position={[0, 7.8, 6]} castShadow>
          <boxGeometry args={[TERMINAL_T2.width + 10, 0.35, 8]} />
          <meshStandardMaterial color={C.canopyGlass} roughness={0.1} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* ================= Kempegowda Terminal 1 Complex (Gates 101-103) ================= */}
      <KempegowdaTerminal1 />

      {/* ================= Cityside Multi-Level Car Parking (MLCP) ================= */}
      <MultiLevelCarParking />

      {/* ================= Landside Roundabout & Overhead Highway Gantry ================= */}
      <LandsideRoundaboutAndHighway />

      {/* ================= ATC Control Tower ================= */}
      <KempegowdaAtcTower />

      {/* ================= Ancillary Buildings (Hangar, ARFF, Cargo, Fuel) ================= */}
      <AirfieldAncillaryBuildings />

      {/* ================= Dual Aerobridge Boarding Piers (Gates 201 - 204) ================= */}
      {Array.from({ length: docks }, (_, i) => {
        const gx = gateX(i, docks);
        const state = dockStates?.[i] ?? 'free';
        const isSel = selection.kind === 'gate' && selection.idx === i;
        const isConnected = state === 'unloading' || state === 'boarding' || state === 'docking';
        const gateNumber = site.gates[i]?.gateNumber ?? `20${i + 1}`;

        return (
          <DualAerobridgeGate
            key={`gate-${i}`}
            x={gx}
            gateIndex={i}
            gateNumber={gateNumber}
            connected={isConnected}
            state={state}
            selected={isSel}
          />
        );
      })}
    </group>
  );
}

export type DockVisual = GateVisual;
