'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { C } from './palette';
import { Grounds } from './Grounds';
import { LandsideRoads } from './LandsideRoads';
import { HelipadZone } from './Helipad';
import { WeatherEffects } from './WeatherEffects';
import { ApproachLights } from './ApproachLights';
import { FuelFarm } from './FuelFarm';
import { FireStation } from './FireStation';
import { PerimeterSecurity } from './PerimeterSecurity';
import { SurfaceDetails } from './SurfaceDetails';
import { GateFids } from './GateFids';
import { Warehouse, type GateVisual } from './Warehouse';
import { AircraftFleet, GroundFleet, RoadFleet, PassengerFleet } from './Vehicles';
import { AirportDebugVisualizer } from './DebugVisualizer';
import { simEngine } from '@/lib/sim/engine';
import { useWT, type CameraPreset, type TimeOfDay } from '@/lib/store';
import { cameraApi } from '@/lib/camera';
import { entityPosition } from '@/lib/focus';
import { aircraftPose, gateX, GATE_STAND_Z } from '@/lib/layout';

// Camera Preset Coordinates (Real 3D Perspective)
const PRESETS: Record<CameraPreset, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  overview: {
    pos: new THREE.Vector3(145, 95, 175),
    target: new THREE.Vector3(0, 4, 35),
  },
  runway: {
    pos: new THREE.Vector3(-240, 7, 88),
    target: new THREE.Vector3(-20, 2, 88),
  },
  gate: {
    pos: new THREE.Vector3(-5, 9, 39),
    target: new THREE.Vector3(-15, 3.5, 22),
  },
  ground: {
    pos: new THREE.Vector3(-8, 2.2, 34),
    target: new THREE.Vector3(-15, 3.8, 22),
  },
  aircraft: {
    pos: new THREE.Vector3(25, 24, 52),
    target: new THREE.Vector3(-15, 3, 22),
  },
  free: {
    pos: new THREE.Vector3(120, 80, 140),
    target: new THREE.Vector3(0, 4, 30),
  },
  terminal: {
    pos: new THREE.Vector3(55, 42, 65),
    target: new THREE.Vector3(0, 8, 6),
  },
  taxi: {
    pos: new THREE.Vector3(92, 14, -42),
    target: new THREE.Vector3(70, 2, -64),
  },
  helipad: {
    pos: new THREE.Vector3(-102, 14, 68),
    target: new THREE.Vector3(-135, 3, 48),
  },
  cockpit: {
    pos: new THREE.Vector3(-160, 9, -72),
    target: new THREE.Vector3(80, 2, -72),
  },
};

function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const cameraPreset = useWT((s) => s.cameraPreset);
  const selection = useWT((s) => s.selection);
  const activeSiteId = useWT((s) => s.activeSiteId);
  const site = useWT((s) => s.sites[activeSiteId]);

  const keysDown = useRef<Record<string, boolean>>({});

  // Active keyboard pan & fly listeners (WASD, Arrow keys, Q/E, R/F)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysDown.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysDown.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Handle Preset Switching
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const p = PRESETS[cameraPreset];
    c.setLookAt(p.pos.x, p.pos.y, p.pos.z, p.target.x, p.target.y, p.target.z, true);
  }, [cameraPreset]);

  // Handle Free Camera & Keyboard / API Bindings
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const init = PRESETS.overview;
    c.setLookAt(init.pos.x, init.pos.y, init.pos.z, init.target.x, init.target.y, init.target.z, false);

    cameraApi.zoomIn = () => c.dolly(15, true);
    cameraApi.zoomOut = () => c.dolly(-15, true);
    cameraApi.rotate = (dir) => c.rotate((dir * Math.PI) / 4, 0, true);
    cameraApi.panForward = (dist = 22) => c.forward(dist, true);
    cameraApi.panBackward = (dist = 22) => c.forward(-dist, true);
    cameraApi.panLeft = (dist = 22) => c.truck(-dist, 0, true);
    cameraApi.panRight = (dist = 22) => c.truck(dist, 0, true);
    cameraApi.panUp = (dist = 16) => c.elevate(dist, true);
    cameraApi.panDown = (dist = 16) => c.elevate(-dist, true);
    cameraApi.reset = () => {
      const p = PRESETS.overview;
      c.setLookAt(p.pos.x, p.pos.y, p.pos.z, p.target.x, p.target.y, p.target.z, true);
    };
    cameraApi.focus = (x, z) => {
      c.setLookAt(x + 25, 18, z + 25, x, 3, z, true);
    };
  }, []);

  // Glide Camera to Selected Entity
  useEffect(() => {
    if (selection.kind === 'site') return;
    const p = entityPosition(site, selection);
    if (p && ref.current) {
      if (selection.kind === 'gate') {
        ref.current.setLookAt(p.x + 12, 11, p.z + 18, p.x, 3.5, p.z, true);
      } else if (selection.kind === 'vehicle') {
        ref.current.setLookAt(p.x + 8, 7, p.z + 10, p.x, 1.5, p.z, true);
      } else if (selection.kind === 'flight') {
        ref.current.setLookAt(p.x + 22, 14, p.z + 24, p.x, 3, p.z, true);
      }
    }
  }, [selection, site]);

  // Frame Loop: Smooth Aircraft Tracking & WASD Continuous Flight
  useFrame((_, delta) => {
    const c = ref.current;
    if (!c) return;

    // Smooth WASD / Arrow Key Camera Flight (Fly in any direction)
    const dt = Math.min(0.08, delta);
    const moveSpeed = 48.0 * dt;
    const k = keysDown.current;

    if (k['w'] || k['arrowup']) c.forward(moveSpeed, false);
    if (k['s'] || k['arrowdown']) c.forward(-moveSpeed, false);
    if (k['a'] || k['arrowleft']) c.truck(-moveSpeed, 0, false);
    if (k['d'] || k['arrowright']) c.truck(moveSpeed, 0, false);
    if (k['q']) c.rotate(0.9 * dt, 0, false);
    if (k['e']) c.rotate(-0.9 * dt, 0, false);
    if (k['r'] || k[' ']) c.elevate(moveSpeed * 0.75, false);
    if (k['f'] || k['shift']) c.elevate(-moveSpeed * 0.75, false);

    if (cameraPreset !== 'aircraft') return;
    // Follow selected flight or active moving flight
    const targetFlight =
      selection.kind === 'flight'
        ? site.flights.find((f) => f.id === selection.id)
        : site.flights[0];
    if (!targetFlight) return;

    const simAc = simEngine.aircraft.find((a) => a.id === targetFlight.id);
    let posX = 0;
    let posY = 0;
    let posZ = 0;
    let heading = 0;

    if (simAc) {
      posX = simAc.pos.x;
      posY = simAc.pos.y;
      posZ = simAc.pos.z;
      heading = simAc.heading;
    } else {
      const gx = gateX(targetFlight.gate ?? 0, site.gates.length);
      let pose = { x: gx, y: 0, z: GATE_STAND_Z, heading: Math.PI };
      if (targetFlight.phase !== 'parked' && targetFlight.phase !== 'disembarking' && targetFlight.phase !== 'unloading' && targetFlight.phase !== 'servicing' && targetFlight.phase !== 'boarding') {
        const pathKind =
          targetFlight.phase === 'approaching'
            ? 'approach'
            : targetFlight.phase === 'landing'
            ? 'landing'
            : targetFlight.phase === 'taxi_in'
            ? 'taxi_in'
            : targetFlight.phase === 'pushback'
            ? 'pushback'
            : targetFlight.phase === 'taxi_out' || targetFlight.phase === 'runway_entry'
            ? 'taxi_out'
            : 'takeoff';
        pose = aircraftPose(pathKind, gx, targetFlight.t);
      }
      posX = pose.x;
      posY = pose.y;
      posZ = pose.z;
      heading = pose.heading;
    }

    // Camera trails 28m behind aircraft heading and 12m elevated
    const backX = -Math.sin(heading) * 28;
    const backZ = -Math.cos(heading) * 28;
    c.moveTo(posX + backX, posY + 12, posZ + backZ, true);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={3}
      maxDistance={850}
      smoothTime={0.25}
      draggingSmoothTime={0.05}
      dollyToCursor
      mouseButtons={{
        left: 1, // ACTION.ROTATE
        middle: 8, // ACTION.DOLLY
        right: 2, // ACTION.TRUCK
        wheel: 8, // ACTION.DOLLY
      }}
    />
  );
}

function AirportLighting({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  if (timeOfDay === 'sunset') {
    return (
      <group>
        <ambientLight intensity={0.45} color="#fed7aa" />
        <hemisphereLight args={['#ffedd5', '#9a3412', 1.2]} />
        <directionalLight
          position={[140, 55, 90]}
          intensity={3.2}
          color="#f97316"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0003}
          shadow-normalBias={0.05}
          shadow-radius={4}
          shadow-camera-left={-240}
          shadow-camera-right={240}
          shadow-camera-top={240}
          shadow-camera-bottom={-240}
          shadow-camera-near={1}
          shadow-camera-far={750}
        />
        <directionalLight position={[-120, 35, -60]} intensity={0.8} color="#fdba74" />
      </group>
    );
  }

  if (timeOfDay === 'night') {
    return (
      <group>
        <ambientLight intensity={0.2} color="#1e293b" />
        <hemisphereLight args={['#0f172a', '#020617', 0.6]} />
        <directionalLight
          position={[90, 110, 70]}
          intensity={0.5}
          color="#60a5fa"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-240}
          shadow-camera-right={240}
          shadow-camera-top={240}
          shadow-camera-bottom={-240}
          shadow-camera-near={1}
          shadow-camera-far={750}
        />
        {/* High-Mast Apron Floodlights casting warm pools across Gates 201-204 */}
        <pointLight position={[-45, 19, 18]} intensity={4.5} distance={85} color="#fef08a" />
        <pointLight position={[15, 19, 18]} intensity={4.5} distance={85} color="#fef08a" />
        <pointLight position={[45, 19, 18]} intensity={4.5} distance={85} color="#fef08a" />
      </group>
    );
  }

  // Default: Crisp Natural Daylight
  return (
    <group>
      <ambientLight intensity={0.4} color="#f8fafc" />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 1.4]} />
      <directionalLight
        position={[125, 150, 95]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-radius={3}
        shadow-camera-left={-250}
        shadow-camera-right={250}
        shadow-camera-top={250}
        shadow-camera-bottom={-250}
        shadow-camera-near={1}
        shadow-camera-far={800}
      />
      <directionalLight position={[-100, 70, -60]} intensity={0.5} color="#e2e8f0" />
    </group>
  );
}

function SimulationLoop() {
  const isPaused = useWT((s) => s.isPaused);
  const simSpeed = useWT((s) => s.simSpeed);

  useFrame((_, delta) => {
    simEngine.isPaused = isPaused;
    simEngine.simSpeed = simSpeed;
    const dt = Math.min(0.08, delta);
    simEngine.tick(dt);
  });

  return null;
}

export default function Scene() {
  const gates = useWT((s) => s.sites[s.activeSiteId].gates.length);
  const timeOfDay = useWT((s) => s.timeOfDay);
  const select = useWT((s) => s.select);
  const debugOverlay = useWT((s) => s.debugOverlay);

  const gateStates = useWT((s) => {
    const site = s.sites[s.activeSiteId];
    return site.gates
      .map((g): GateVisual => {
        if (g.maintenance) return 'maintenance';
        const f = site.flights.find((x) => x.id === g.flightId);
        if (!f) return 'free';
        if (f.phase === 'disembarking' || f.phase === 'unloading') return 'unloading';
        if (f.phase === 'boarding') return 'boarding';
        return 'docking';
      })
      .join(',');
  });

  const bgColor = timeOfDay === 'night' ? C.skyNight : timeOfDay === 'sunset' ? C.skySunset : C.skyDay;
  const fogColor = timeOfDay === 'night' ? C.fogNight : timeOfDay === 'sunset' ? C.fogSunset : C.fogDay;

  return (
    <Canvas
      shadows
      dpr={1}
      camera={{ position: [PRESETS.overview.pos.x, PRESETS.overview.pos.y, PRESETS.overview.pos.z], fov: 42, near: 0.5, far: 2000 }}
      onPointerMissed={() => select({ kind: 'site' })}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 320, 1100]} />

      <AirportLighting timeOfDay={timeOfDay} />
      <SimulationLoop />

      {/* 3D Kempegowda Airport Environment */}
      <React.Suspense fallback={null}>
        <Grounds gates={gates} />
        <LandsideRoads />
        <HelipadZone />
        <WeatherEffects />
        <ApproachLights />
        <FuelFarm />
        <FireStation />
        <PerimeterSecurity />
        <SurfaceDetails />
        <GateFids />
        <Warehouse docks={gates} dockStates={gateStates.split(',') as GateVisual[]} />
        <AircraftFleet />
        <GroundFleet />
        <RoadFleet />
        <PassengerFleet />
        <AirportDebugVisualizer visible={debugOverlay} />
      </React.Suspense>

      <CameraRig />
    </Canvas>
  );
}
