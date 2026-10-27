'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { C } from './palette';
import { AIRCRAFT_DIMS, GATE_COUNT, GATE_STAND_Z, aircraftPose, gateX } from '@/lib/layout';
import { useWT, type Flight, type GroundVehicle } from '@/lib/store';
import { simEngine, type SimAircraft, type SimRoadVehicle, type SimPassenger } from '@/lib/sim/engine';

// Preload all 8 authentic commercial airliner glTF models to eliminate hitching
useGLTF.preload('/models/a380.glb');
useGLTF.preload('/models/a359.glb');
useGLTF.preload('/models/a333.glb');
useGLTF.preload('/models/a320.glb');
useGLTF.preload('/models/a321.glb');
useGLTF.preload('/models/b773.glb');
useGLTF.preload('/models/b789.glb');
useGLTF.preload('/models/b738.glb');

/* ------------------------------------------------------------------ selection ring */

function SelectRing({ radius, color = C.terminalFasciaGold }: { radius: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.06;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}>
      <ringGeometry args={[radius, radius + 1.2, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ------------------------------------------------------------- authentic airline liveries */

function AirlineLiveryTailBadge({
  finDesign,
  primaryColor,
  accentColor,
}: {
  finDesign: Flight['finDesign'];
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <group position={[0, 0, 0]}>
      {/* Port & Starboard Emblem Badges */}
      {[-0.18, 0.18].map((sideX) => (
        <group key={sideX} position={[sideX, 0, 0]} rotation={[0, sideX > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          {finDesign === 'emirates' && (
            // Emirates UAE Flag Ribbon: Red field with Green, White, Black horizontal bars
            <group scale={1.2}>
              <mesh position={[0, 0.5, 0]}>
                <planeGeometry args={[1.6, 0.35]} />
                <meshStandardMaterial color="#00732f" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.15, 0]}>
                <planeGeometry args={[1.6, 0.35]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.2, 0]}>
                <planeGeometry args={[1.6, 0.35]} />
                <meshStandardMaterial color="#000000" roughness={0.3} />
              </mesh>
              <mesh position={[-0.7, 0.15, 0.01]}>
                <planeGeometry args={[0.35, 1.05]} />
                <meshStandardMaterial color="#d71920" roughness={0.3} />
              </mesh>
            </group>
          )}

          {finDesign === 'etihad' && (
            // Etihad "Facets of Abu Dhabi" geometric triangles
            <group scale={1.1}>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <planeGeometry args={[0.9, 0.9]} />
                <meshStandardMaterial color="#c49a45" roughness={0.3} metalness={0.6} />
              </mesh>
              <mesh position={[0.4, -0.3, 0.01]} rotation={[0, 0, -Math.PI / 6]}>
                <planeGeometry args={[0.7, 0.7]} />
                <meshStandardMaterial color="#3d312a" roughness={0.4} />
              </mesh>
            </group>
          )}

          {finDesign === 'qatar' && (
            // Qatar Airways Arabian Oryx Emblem
            <group scale={1.2}>
              <mesh>
                <circleGeometry args={[0.65, 24]} />
                <meshStandardMaterial color="#5c0632" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.15, 0.01]} rotation={[0, 0, 0.2]}>
                <planeGeometry args={[0.15, 0.9]} />
                <meshStandardMaterial color="#8a8d8f" roughness={0.3} />
              </mesh>
              <mesh position={[-0.15, 0.1, 0.01]} rotation={[0, 0, -0.2]}>
                <planeGeometry args={[0.12, 0.7]} />
                <meshStandardMaterial color="#8a8d8f" roughness={0.3} />
              </mesh>
            </group>
          )}

          {finDesign === 'singapore' && (
            // Singapore Airlines Golden Kris Bird
            <group scale={1.3}>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <planeGeometry args={[0.25, 1.4]} />
                <meshStandardMaterial color="#eaaa00" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0.2, 0.3, 0.01]} rotation={[0, 0, Math.PI / 6]}>
                <planeGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="#eaaa00" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          )}

          {finDesign === 'lufthansa' && (
            // Lufthansa Circled Crane Symbol
            <group scale={1.2}>
              <mesh>
                <ringGeometry args={[0.55, 0.75, 24]} />
                <meshStandardMaterial color="#ffad00" roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.01]} rotation={[0, 0, Math.PI / 6]}>
                <planeGeometry args={[0.15, 0.9]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
            </group>
          )}

          {finDesign === 'british' && (
            // British Airways Chatham Dockyard Fluttering Union Jack Ribbon
            <group scale={1.2}>
              <mesh rotation={[0, 0, 0.25]}>
                <planeGeometry args={[1.5, 0.5]} />
                <meshStandardMaterial color="#075aaa" roughness={0.3} />
              </mesh>
              <mesh position={[0.1, 0.1, 0.01]} rotation={[0, 0, -0.2]}>
                <planeGeometry args={[1.3, 0.3]} />
                <meshStandardMaterial color="#eb2226" roughness={0.3} />
              </mesh>
            </group>
          )}

          {finDesign === 'airindia' && (
            // Air India Red Fin with Golden Jharokha Arch
            <group scale={1.3}>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <ringGeometry args={[0.4, 0.75, 16]} />
                <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.2, 0.01]}>
                <circleGeometry args={[0.3, 16]} />
                <meshStandardMaterial color="#d91424" roughness={0.3} />
              </mesh>
            </group>
          )}

          {finDesign === 'indigo' && (
            // IndiGo Signature Royal Indigo with Sky Constellation
            <group scale={1.2}>
              <mesh>
                <circleGeometry args={[0.7, 24]} />
                <meshStandardMaterial color="#00a4e4" roughness={0.3} />
              </mesh>
              {[-0.3, 0, 0.3].map((cx, i) => (
                <mesh key={i} position={[cx, (i % 2 === 0 ? 0.15 : -0.15), 0.01]}>
                  <circleGeometry args={[0.12, 12]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
              ))}
            </group>
          )}

          {finDesign === 'akasa' && (
            // Akasa 'Rising A' Orange Swoosh
            <group scale={1.2}>
              <mesh rotation={[0, 0, 0.35]}>
                <ringGeometry args={[0.35, 0.7, 16]} />
                <meshStandardMaterial color="#ff5000" roughness={0.3} />
              </mesh>
              <mesh position={[0.2, 0.2, 0.01]} rotation={[0, 0, -0.4]}>
                <planeGeometry args={[0.2, 0.7]} />
                <meshStandardMaterial color="#4a154b" roughness={0.3} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- 3D GLTF Model Config */

interface ModelTransform {
  file: string;
  rotationY: number;
  centerOffset: [number, number, number];
  scale: [number, number, number];
  tailBadgeOffset: [number, number, number];
  tailBadgeScale: number;
  navLightSpan: number;
  strobeZ: number;
  gearHeight: number;
}

const MODEL_CONFIGS: Record<string, ModelTransform> = {
  'Airbus A380-800': {
    file: '/models/a380.glb',
    rotationY: 0,
    centerOffset: [-10.0, 5.36, 27.6],
    scale: [0.38, 0.38, 0.38],
    tailBadgeOffset: [0, 8.8, -13.5],
    tailBadgeScale: 2.2,
    navLightSpan: 15.2,
    strobeZ: -14.0,
    gearHeight: 0.28,
  },
  'Airbus A350-900': {
    file: '/models/a359.glb',
    rotationY: 0,
    centerOffset: [-5.4, 4.64, 28.6],
    scale: [0.40, 0.40, 0.40],
    tailBadgeOffset: [0, 6.8, -13.2],
    tailBadgeScale: 1.8,
    navLightSpan: 12.9,
    strobeZ: -13.5,
    gearHeight: 0.28,
  },
  'Airbus A330-300': {
    file: '/models/a333.glb',
    rotationY: 0,
    centerOffset: [7.7, 4.29, 5.9],
    scale: [0.40, 0.40, 0.40],
    tailBadgeOffset: [0, 6.2, -12.0],
    tailBadgeScale: 1.7,
    navLightSpan: 12.0,
    strobeZ: -12.5,
    gearHeight: 0.28,
  },
  'Airbus A320neo': {
    file: '/models/a320.glb',
    rotationY: -Math.PI / 2,
    centerOffset: [3.3, 0.78, 0.0],
    scale: [0.45, 0.45, 0.45],
    tailBadgeOffset: [0, 4.8, -7.6],
    tailBadgeScale: 1.3,
    navLightSpan: 8.6,
    strobeZ: -8.0,
    gearHeight: 0.28,
  },
  'Airbus A321neo': {
    file: '/models/a321.glb',
    rotationY: -Math.PI / 2,
    centerOffset: [3.3, 0.78, 0.0],
    scale: [0.45, 0.45, 0.52],
    tailBadgeOffset: [0, 4.9, -8.8],
    tailBadgeScale: 1.4,
    navLightSpan: 8.6,
    strobeZ: -9.2,
    gearHeight: 0.28,
  },
  'Boeing 777-300ER': {
    file: '/models/b773.glb',
    rotationY: 0,
    centerOffset: [1.4, 4.22, 21.8],
    scale: [0.42, 0.42, 0.42],
    tailBadgeOffset: [0, 6.5, -10.8],
    tailBadgeScale: 1.8,
    navLightSpan: 13.6,
    strobeZ: -11.5,
    gearHeight: 0.28,
  },
  'Boeing 787-9 Dreamliner': {
    file: '/models/b789.glb',
    rotationY: 0,
    centerOffset: [0.5, -0.12, 3.2],
    scale: [0.40, 0.40, 0.40],
    tailBadgeOffset: [0, 6.0, -10.8],
    tailBadgeScale: 1.7,
    navLightSpan: 11.9,
    strobeZ: -11.2,
    gearHeight: 0.28,
  },
  'Boeing 737 MAX 8': {
    file: '/models/b738.glb',
    rotationY: -Math.PI / 2,
    centerOffset: [0.7, 2.69, 0.0],
    scale: [0.45, 0.45, 0.45],
    tailBadgeOffset: [0, 4.5, -7.9],
    tailBadgeScale: 1.3,
    navLightSpan: 8.5,
    strobeZ: -8.2,
    gearHeight: 0.28,
  },
};

function AircraftGlbMesh({
  modelFile,
  config,
  airlineColor,
}: {
  modelFile: string;
  config: ModelTransform;
  airlineColor: string;
}) {
  const gltf = useGLTF(modelFile);

  const clonedScene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        if (m.material) {
          // Clone material so individual livery tints don't cross-contaminate
          const orig = m.material as THREE.MeshStandardMaterial;
          const mat = orig.clone();
          mat.roughness = Math.max(0.2, mat.roughness ?? 0.3);
          mat.metalness = Math.min(0.6, mat.metalness ?? 0.1);
          mat.envMapIntensity = 1.2;
          m.material = mat;
        }
      }
    });
    return clone;
  }, [gltf.scene, airlineColor]);

  return (
    <group rotation={[0, config.rotationY, 0]}>
      <group position={config.centerOffset}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- complete real aircraft */

const RealCommercialAircraft = React.memo(function RealCommercialAircraft({
  flight,
  activeSiteId,
  selected,
}: {
  flight: Flight;
  activeSiteId: string;
  selected: boolean;
}) {
  const select = useWT((s) => s.select);
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';
  const site = useWT((s) => s.sites[activeSiteId]);
  const gateIndex = flight.gate ?? 0;
  const gx = gateX(gateIndex, site.gates.length);

  const groupRef = useRef<THREE.Group>(null);
  const strobeRef = useRef<THREE.PointLight>(null);
  const beaconRef = useRef<THREE.PointLight>(null);

  const pose = useMemo(() => {
    if (flight.phase === 'parked' || flight.phase === 'disembarking' || flight.phase === 'unloading' || flight.phase === 'servicing' || flight.phase === 'boarding') {
      return {
        x: gx,
        y: 0,
        z: GATE_STAND_Z,
        heading: Math.PI, // Facing terminal gate at -Z
        pitch: 0,
        roll: 0,
      };
    }
    const pathKind =
      flight.phase === 'approaching'
        ? 'approach'
        : flight.phase === 'landing'
        ? 'landing'
        : flight.phase === 'taxi_in'
        ? 'taxi_in'
        : flight.phase === 'pushback'
        ? 'pushback'
        : flight.phase === 'taxi_out' || flight.phase === 'runway_entry'
        ? 'taxi_out'
        : 'takeoff';

    return aircraftPose(pathKind, gx, flight.t);
  }, [flight.phase, flight.t, gx]);

  const config = MODEL_CONFIGS[flight.aircraftType] ?? MODEL_CONFIGS['Airbus A321neo'];

  useFrame(({ clock }) => {
    // 60 FPS Decoupled Direct Object3D Physics Transform
    const simAc = simEngine.aircraft.find((a) => a.id === flight.id);
    if (groupRef.current) {
      if (simAc) {
        groupRef.current.position.set(simAc.pos.x, simAc.pos.y + config.gearHeight, simAc.pos.z);
        groupRef.current.rotation.order = 'YXZ';
        groupRef.current.rotation.set(simAc.pitch, simAc.heading, simAc.roll, 'YXZ');
      } else {
        groupRef.current.position.set(pose.x, pose.y + config.gearHeight, pose.z);
        groupRef.current.rotation.order = 'YXZ';
        groupRef.current.rotation.set(pose.pitch, pose.heading, pose.roll, 'YXZ');
      }
    }

    // White wingtip/tail strobes flash in double pulses
    if (strobeRef.current) {
      const t = clock.elapsedTime % 1.2;
      const flash = (t < 0.08 || (t > 0.18 && t < 0.26)) ? 4.5 : 0;
      strobeRef.current.intensity = flash * (isNight ? 1.5 : 1.0);
    }
    // Red anti-collision beacon rotates/flashes smoothly
    if (beaconRef.current) {
      const flash = Math.sin(clock.elapsedTime * 6) > 0.4 ? 3.0 : 0.1;
      beaconRef.current.intensity = flash;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[pose.x, pose.y + config.gearHeight, pose.z]}
      rotation={[pose.pitch, pose.heading, pose.roll]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select({ kind: 'flight', id: flight.id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* Selection Halo */}
      {selected && <SelectRing radius={config.navLightSpan * 0.9} color={flight.airlineColor} />}

      {/* Scaled 3D Aircraft Model */}
      <group scale={config.scale}>
        <React.Suspense fallback={null}>
          <AircraftGlbMesh
            modelFile={config.file}
            config={config}
            airlineColor={flight.airlineColor}
          />
        </React.Suspense>

        {/* Authentic Tail Fin Livery Decal Inserts */}
        <group position={config.tailBadgeOffset} scale={config.tailBadgeScale}>
          <AirlineLiveryTailBadge
            finDesign={flight.finDesign}
            primaryColor={flight.airlineColor}
            accentColor={flight.airlineAccent}
          />
        </group>
      </group>

      {/* Aeronautical Navigation Lighting */}
      {/* Port Red Wingtip Light */}
      <mesh position={[-config.navLightSpan, 2.2, -1.2]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color={C.navRed} emissive={C.navRed} emissiveIntensity={isNight ? 4 : 2} />
      </mesh>
      {/* Starboard Green Wingtip Light */}
      <mesh position={[config.navLightSpan, 2.2, -1.2]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color={C.navGreen} emissive={C.navGreen} emissiveIntensity={isNight ? 4 : 2} />
      </mesh>

      {/* Flashing White Strobes */}
      <pointLight ref={strobeRef} position={[0, 4.5, config.strobeZ]} color="#ffffff" distance={25} />

      {/* Pulsing Red Anti-Collision Beacon */}
      <pointLight ref={beaconRef} position={[0, 5.2, 0]} color="#ef4444" distance={20} />

      {/* Nose Gear Taxi Lights (Illuminating tarmac ahead) */}
      {(flight.phase === 'taxi_in' || flight.phase === 'taxi_out' || flight.phase === 'takeoff' || flight.phase === 'landing') && (
        <spotLight
          position={[0, 1.2, 8]}
          target-position={[0, 0, 35]}
          intensity={isNight ? 4.5 : 2.0}
          angle={0.45}
          penumbra={0.6}
          color="#ffffff"
          distance={60}
        />
      )}
    </group>
  );
});

/* ------------------------------------------------------------- ground service equipment */

function GroundVehicleMesh({
  vehicle,
  flight,
  gatesCount,
}: {
  vehicle: GroundVehicle;
  flight?: Flight;
  gatesCount: number;
}) {
  const select = useWT((s) => s.select);
  const selection = useWT((s) => s.selection);
  const isSel = selection.kind === 'vehicle' && selection.id === vehicle.id;
  const gx = gateX(vehicle.gate, gatesCount);

  // Determine realistic GSE operational position
  const vPos = useMemo((): [number, number, number, number] => {
    // [x, y, z, rotationY]
    if (vehicle.type === 'pushback') {
      if (flight && flight.phase === 'pushback') {
        const pose = aircraftPose('pushback', gx, flight.t);
        // Tug connected right at the nose gear (6m ahead of center)
        const forwardX = Math.sin(pose.heading);
        const forwardZ = Math.cos(pose.heading);
        return [pose.x + forwardX * 6.5, 0.28, pose.z + forwardZ * 6.5, pose.heading];
      }
      return [gx + 6.5, 0.28, 28, 0];
    }
    if (vehicle.type === 'baggage') {
      if (flight && (flight.phase === 'unloading' || flight.phase === 'servicing')) {
        return [gx - 5.5, 0.28, 22, -Math.PI / 2];
      }
      return [gx - 8.5, 0.28, 24, 0];
    }
    if (vehicle.type === 'catering') {
      if (flight && (flight.phase === 'servicing' || flight.phase === 'boarding')) {
        return [gx + 5.2, 0.28, 24, Math.PI / 2];
      }
      return [gx + 8.5, 0.28, 22, 0];
    }
    // Fuel bowser tanker
    if (flight && flight.phase === 'servicing') {
      return [gx - 7.5, 0.28, 20, Math.PI / 3];
    }
    return [gx + 9.5, 0.28, 18, 0];
  }, [vehicle.type, vehicle.gate, flight?.phase, flight?.t, gx]);

  return (
    <group
      position={[vPos[0], vPos[1], vPos[2]]}
      rotation={[0, vPos[3], 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select({ kind: 'vehicle', id: vehicle.id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {isSel && <SelectRing radius={3.2} color={C.terminalFasciaGold} />}

      {/* Towbarless Pushback Tractor */}
      {vehicle.type === 'pushback' && (
        <group>
          {/* Heavy steel low-profile chassis */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[3.2, 1.2, 5.8]} />
            <meshStandardMaterial color={C.tugChassis} roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Enclosed driver cabin */}
          <mesh position={[0, 1.8, 1.6]} castShadow>
            <boxGeometry args={[2.4, 1.1, 1.8]} />
            <meshStandardMaterial color={C.tugCabin} roughness={0.2} />
          </mesh>
          {/* Nose gear hydraulic clamping cradle */}
          <mesh position={[0, 0.6, -2.4]} castShadow>
            <boxGeometry args={[2.2, 0.8, 1.4]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Heavy industrial wheels */}
          {[-1.7, 1.7].map((wx) =>
            [-1.8, 1.8].map((wz) => (
              <mesh key={`${wx}-${wz}`} position={[wx, 0.6, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.6, 0.6, 0.5, 16]} />
                <meshStandardMaterial color={C.tireBlack} roughness={0.9} />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* Baggage Tractor & Baggage Carts Train */}
      {vehicle.type === 'baggage' && (
        <group>
          {/* Tractor Cab */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[1.8, 1.1, 2.6]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.5} />
          </mesh>
          {/* Two Luggage Container Dollies */}
          {[-3.2, -6.0].map((dz, idx) => (
            <group key={dz} position={[0, 0, dz]}>
              <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[1.7, 0.3, 2.2]} />
                <meshStandardMaterial color="#64748b" metalness={0.5} />
              </mesh>
              {/* Loaded Baggage Container Box */}
              <mesh position={[0, 1.0, 0]} castShadow>
                <boxGeometry args={[1.5, 1.0, 1.9]} />
                <meshStandardMaterial color={idx === 0 ? '#cbd5e1' : '#f59e0b'} roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Catering High-Loader Truck */}
      {vehicle.type === 'catering' && (
        <group>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[2.4, 1.4, 6.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
          {/* Scissor lift mechanism */}
          <mesh position={[0, 2.1, 0]} castShadow>
            <boxGeometry args={[2.2, 1.2, 4.8]} />
            <meshStandardMaterial color={C.cateringScissor} metalness={0.6} />
          </mesh>
          {/* Galley bridge canopy */}
          <mesh position={[0, 2.5, 2.6]}>
            <boxGeometry args={[1.6, 1.4, 1.2]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ----------------------------------------------------------------- fleets */

export function AircraftFleet() {
  const activeSiteId = useWT((s) => s.activeSiteId);
  const flightIds = useWT((s) => s.sites[s.activeSiteId].flights.map((f) => f.id).join(','));
  const selectionId = useWT((s) => (s.selection.kind === 'flight' ? s.selection.id : null));

  const flightList = useMemo(() => {
    return useWT.getState().sites[activeSiteId].flights;
  }, [flightIds, activeSiteId]);

  return (
    <group>
      {flightList.map((f) => {
        const isSel = selectionId === f.id;
        return (
          <RealCommercialAircraft
            key={f.id}
            flight={f}
            activeSiteId={activeSiteId}
            selected={isSel}
          />
        );
      })}
    </group>
  );
}

export function GroundFleet() {
  const activeSiteId = useWT((s) => s.activeSiteId);
  const site = useWT((s) => s.sites[activeSiteId]);
  const vehicleList = site.vehicles;
  const flights = site.flights;
  const gatesCount = site.gates.length;

  return (
    <group>
      {vehicleList.map((v) => {
        const flight = flights.find((f) => f.gate === v.gate);
        return (
          <GroundVehicleMesh
            key={v.id}
            vehicle={v}
            flight={flight}
            gatesCount={gatesCount}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------- Landside Road Vehicles with Physics & Kinematics */

function RoadVehicleMesh({ vehicle }: { vehicle: SimRoadVehicle }) {
  const groupRef = useRef<THREE.Group>(null);
  const frontLeftWheelRef = useRef<THREE.Group>(null);
  const frontRightWheelRef = useRef<THREE.Group>(null);
  const hazardMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const wheelSpinRef = useRef<number>(0);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(vehicle.pos.x, vehicle.pos.y, vehicle.pos.z);
      groupRef.current.rotation.y = vehicle.heading;
    }

    // Front wheels steer into turns
    if (frontLeftWheelRef.current && frontRightWheelRef.current) {
      frontLeftWheelRef.current.rotation.y = vehicle.steeringAngle;
      frontRightWheelRef.current.rotation.y = vehicle.steeringAngle;
    }

    // Blinking 4-way hazard emergency flashers when stopped at taxi bay or drop-off
    if (hazardMatRef.current) {
      const isBlinking = vehicle.isHazardsOn || vehicle.stopTimer > 0;
      if (isBlinking) {
        const flash = Math.sin(performance.now() * 0.009) > 0.1;
        hazardMatRef.current.emissiveIntensity = flash ? 3.5 : 0.1;
      } else {
        hazardMatRef.current.emissiveIntensity = 0.1;
      }
    }
  });

  const isBus = vehicle.type === 'bus';
  const isTaxi = vehicle.type === 'taxi';
  const brand = vehicle.brand ?? (isTaxi ? 'uber' : 'private');

  if (isBus) {
    return (
      <group ref={groupRef} position={[vehicle.pos.x, vehicle.pos.y, vehicle.pos.z]}>
        {/* BMTC Vayu Vajra Airport Volvo Low-Floor AC Bus */}
        {/* Main Bus Chassis Body */}
        <mesh position={[0, 1.45, 0]} castShadow>
          <boxGeometry args={[2.55, 2.65, 11.2]} />
          <meshStandardMaterial color={vehicle.color} roughness={0.3} metalness={0.2} />
        </mesh>

        {/* White Aerodynamic Roof Cap */}
        <mesh position={[0, 2.82, 0]} castShadow>
          <boxGeometry args={[2.5, 0.22, 11.0]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>

        {/* Panoramic Tinted Glass Band */}
        <mesh position={[0, 1.85, 0]}>
          <boxGeometry args={[2.59, 1.15, 10.4]} />
          <meshStandardMaterial color="#0b0f17" roughness={0.1} />
        </mesh>

        {/* Front Electronic Destination LED Display ("KIA-8 BIAL -> ELECTRONIC CITY") */}
        <mesh position={[0, 2.45, 5.61]}>
          <planeGeometry args={[1.8, 0.35]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.0} />
        </mesh>

        {/* Headlights */}
        {[-0.95, 0.95].map((hx) => (
          <mesh key={hx} position={[hx, 0.65, 5.62]}>
            <boxGeometry args={[0.35, 0.2, 0.05]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.8} />
          </mesh>
        ))}

        {/* Taillights */}
        {[-0.95, 0.95].map((tx) => (
          <mesh key={tx} position={[tx, 0.85, -5.62]}>
            <boxGeometry args={[0.3, 0.35, 0.05]} />
            <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={2.5} />
          </mesh>
        ))}

        {/* Amber Hazard Emergency Flashers */}
        {[-1.2, 1.2].map((fx) =>
          [-5.62, 5.62].map((fz) => (
            <mesh key={`${fx}-${fz}`} position={[fx, 0.85, fz]}>
              <boxGeometry args={[0.15, 0.15, 0.06]} />
              <meshStandardMaterial ref={hazardMatRef} color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.1} />
            </mesh>
          ))
        )}

        {/* Steered Front Wheels */}
        <group ref={frontLeftWheelRef} position={[-1.3, 0.45, 3.8]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.32, 14]} />
            <meshStandardMaterial color="#0b0f17" roughness={0.9} />
          </mesh>
        </group>
        <group ref={frontRightWheelRef} position={[1.3, 0.45, 3.8]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.32, 14]} />
            <meshStandardMaterial color="#0b0f17" roughness={0.9} />
          </mesh>
        </group>

        {/* Dual Rear Axle Wheels */}
        {[-1.3, 1.3].map((wx) =>
          [-3.0, -4.2].map((wz) => (
            <mesh key={`${wx}-${wz}`} position={[wx, 0.45, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.45, 0.45, 0.32, 14]} />
              <meshStandardMaterial color="#0b0f17" roughness={0.9} />
            </mesh>
          ))
        )}
      </group>
    );
  }

  // Sedan / SUV / Taxi
  return (
    <group ref={groupRef} position={[vehicle.pos.x, vehicle.pos.y, vehicle.pos.z]}>
      {/* Lower Car Chassis Body */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[1.92, 0.82, 4.4]} />
        <meshStandardMaterial color={vehicle.color} roughness={0.3} metalness={0.25} />
      </mesh>

      {/* Cabin Greenhouse & Glass */}
      <mesh position={[0, 1.32, -0.22]} castShadow>
        <boxGeometry args={[1.72, 0.68, 2.35]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} />
      </mesh>

      {/* Side Mirror Pods */}
      {[-0.98, 0.98].map((mx) => (
        <mesh key={mx} position={[mx, 1.1, 0.7]} castShadow>
          <boxGeometry args={[0.15, 0.12, 0.2]} />
          <meshStandardMaterial color={vehicle.color} />
        </mesh>
      ))}

      {/* Front Headlights */}
      {[-0.72, 0.72].map((hx) => (
        <mesh key={hx} position={[hx, 0.68, 2.21]}>
          <boxGeometry args={[0.3, 0.16, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.5} />
        </mesh>
      ))}

      {/* Rear Taillights */}
      {[-0.72, 0.72].map((tx) => (
        <mesh key={tx} position={[tx, 0.75, -2.21]}>
          <boxGeometry args={[0.32, 0.18, 0.05]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={2.2} />
        </mesh>
      ))}

      {/* Amber 4-Way Hazard Flashers (Blink when stopped at bay/curbside) */}
      {[-0.92, 0.92].map((fx) =>
        [-2.21, 2.21].map((fz) => (
          <mesh key={`${fx}-${fz}`} position={[fx, 0.72, fz]}>
            <boxGeometry args={[0.12, 0.12, 0.06]} />
            <meshStandardMaterial ref={hazardMatRef} color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.1} />
          </mesh>
        ))
      )}

      {/* Dedicated Brand Identity (Uber / Ola / KSTDC Taxi Roof Pod) */}
      {isTaxi && brand === 'uber' && (
        <group position={[0, 1.76, -0.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.22, 0.38]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          <mesh position={[0, 0, 0.2]}>
            <planeGeometry args={[0.7, 0.16]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
          </mesh>
        </group>
      )}

      {isTaxi && brand === 'ola' && (
        <group position={[0, 1.76, -0.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.22, 0.38]} />
            <meshStandardMaterial color="#059669" />
          </mesh>
          <mesh position={[0, 0, 0.2]}>
            <planeGeometry args={[0.7, 0.16]} />
            <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={1.5} />
          </mesh>
        </group>
      )}

      {isTaxi && brand === 'kstdc' && (
        <group position={[0, 1.76, -0.2]}>
          {/* Yellow KSTDC Taxi Lightbox */}
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.24, 0.4]} />
            <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={1.6} />
          </mesh>
          {/* Red & Yellow Karnataka Stripe along doors */}
          {[-0.97, 0.97].map((sx) => (
            <mesh key={sx} position={[sx, -1.05, 0.2]}>
              <boxGeometry args={[0.02, 0.12, 3.2]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          ))}
        </group>
      )}

      {/* Steered Front Wheels */}
      <group ref={frontLeftWheelRef} position={[-1.0, 0.32, 1.3]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.24, 12]} />
          <meshStandardMaterial color="#0b0f17" roughness={0.9} />
        </mesh>
      </group>
      <group ref={frontRightWheelRef} position={[1.0, 0.32, 1.3]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.24, 12]} />
          <meshStandardMaterial color="#0b0f17" roughness={0.9} />
        </mesh>
      </group>

      {/* Fixed Rear Wheels */}
      {[-1.0, 1.0].map((wx) => (
        <mesh key={wx} position={[wx, 0.32, -1.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.24, 12]} />
          <meshStandardMaterial color="#0b0f17" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function RoadFleet() {
  const vehicles = simEngine.vehicles;
  return (
    <group>
      {vehicles.map((v) => (
        <RoadVehicleMesh key={v.id} vehicle={v} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------- Terminal & Landside Pedestrians */

function PassengerMesh({ passenger }: { passenger: SimPassenger }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const isWaiting = passenger.state === 'waiting_taxi';

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const bob = isWaiting ? 0 : Math.sin(clock.elapsedTime * 7 + passenger.pos.x) * 0.04;
      groupRef.current.position.set(passenger.pos.x, passenger.pos.y + bob, passenger.pos.z);
      groupRef.current.rotation.y = passenger.heading;
    }

    // Walking stride leg swing
    if (leftLegRef.current && rightLegRef.current) {
      if (isWaiting) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      } else {
        const swing = Math.sin(clock.elapsedTime * 7 + passenger.pos.x) * 0.42;
        leftLegRef.current.rotation.x = swing;
        rightLegRef.current.rotation.x = -swing;
      }
    }
  });

  return (
    <group ref={groupRef} position={[passenger.pos.x, passenger.pos.y, passenger.pos.z]}>
      {/* Torso */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.9, 8]} />
        <meshStandardMaterial color={passenger.clothesColor} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </mesh>

      {/* Animated Walking Legs */}
      <mesh ref={leftLegRef} position={[-0.1, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh ref={rightLegRef} position={[0.1, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* VIP Executive Leather Briefcase for Helipad passengers */}
      {passenger.id.includes('VIP') ? (
        <group position={[0.32, 0.52, 0.08]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.32, 0.44]} />
            <meshStandardMaterial color="#2d1a0e" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <torusGeometry args={[0.06, 0.015, 6, 12]} />
            <meshStandardMaterial color="#d4af37" metalness={0.8} />
          </mesh>
        </group>
      ) : (
        /* Rolling Suitcase or Luggage Trolley */
        passenger.hasLuggage && (
          <group position={[0.38, 0.45, 0.2]}>
            {/* 4-Wheel Hard Shell Rolling Suitcase */}
            <mesh castShadow>
              <boxGeometry args={[0.26, 0.58, 0.42]} />
              <meshStandardMaterial color="#334155" roughness={0.4} />
            </mesh>
            {/* Chrome Telescopic Handle */}
            <mesh position={[0, 0.42, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.35, 4]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
            {/* Miniature 4-Wheels */}
            {[-0.1, 0.1].map((wx) =>
              [-0.16, 0.16].map((wz) => (
                <mesh key={`${wx}-${wz}`} position={[wx, -0.3, wz]}>
                  <sphereGeometry args={[0.04, 6, 6]} />
                  <meshStandardMaterial color="#0b0f17" />
                </mesh>
              ))
            )}
          </group>
        )
      )}
    </group>
  );
}

export function PassengerFleet() {
  const passengers = simEngine.passengers;
  return (
    <group>
      {passengers.map((p) => (
        <PassengerMesh key={p.id} passenger={p} />
      ))}
    </group>
  );
}
