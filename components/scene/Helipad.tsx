'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useWT } from '@/lib/store';
import { simEngine } from '@/lib/sim/engine';

useGLTF.preload('/models/helicopter.glb');

type V3 = [number, number, number];

/* ------------------------------------------------------------- Helipad Inset Lights & Windsock */

function HelipadBoundaryLights({ center, isNight }: { center: V3; isNight: boolean }) {
  const lightCount = 16;
  const radius = 12.4;

  const positions = useMemo(() => {
    return Array.from({ length: lightCount }, (_, i) => {
      const angle = (i * Math.PI * 2) / lightCount;
      return [
        center[0] + Math.sin(angle) * radius,
        center[1] + 0.34,
        center[2] + Math.cos(angle) * radius,
      ] as V3;
    });
  }, [center]);

  return (
    <group>
      {positions.map((pos, idx) => (
        <group key={idx} position={pos}>
          {/* Metal Inset Can */}
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.08, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          {/* Inset LED Lens (Alternating Aviation Green & Crisp White) */}
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#10b981' : '#ffffff'}
              emissive={idx % 2 === 0 ? '#10b981' : '#ffffff'}
              emissiveIntensity={isNight ? 3.5 : 1.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HelipadWindsock({ pos }: { pos: V3 }) {
  const sockRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (sockRef.current) {
      // Wind oscillation and trailing heading
      sockRef.current.rotation.y = Math.PI * 0.45 + Math.sin(clock.elapsedTime * 1.5) * 0.08;
    }
  });

  return (
    <group position={pos}>
      {/* Mast Pole */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 7.0, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} />
      </mesh>
      {/* Top Swivel Ring */}
      <group ref={sockRef} position={[0, 7.0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.45, 0.05, 8, 16]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        {/* Striped Nylon Fabric Windsock Cone */}
        <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.15, 3.6, 12, 1, true]} />
          <meshStandardMaterial color="#f97316" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- Dynamic Rotor Wash Dust Particle System */

function RotorWashDustRing() {
  const count = 48;
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Internal persistent particle states
  const particleData = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.2,
      radius: 2.0 + (i % 6) * 2.2,
      height: 0.28 + Math.random() * 0.8,
      speed: 12.0 + Math.random() * 8.0,
      baseScale: 0.5 + Math.random() * 0.9,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const h = simEngine.helicopter;
    if (!h) return;

    // Downwash intensity scales inversely with height above ground and directly with rotor RPM
    const heightAboveDeck = Math.max(0, h.pos.y - 0.35);
    const downwash = Math.max(0, 1.0 - heightAboveDeck / 18.0) * h.rotorRpmFraction;
    const isDustActive = downwash > 0.06;

    particlesRef.current.visible = isDustActive;
    if (!isDustActive) return;

    for (let i = 0; i < count; i++) {
      const p = particleData[i];

      // Radial expansion outward from helicopter center
      p.radius += (p.speed * (0.8 + downwash * 0.6)) * delta;
      // Cyclonic rotational swirl from rotor rotation
      p.angle += (7.5 * (0.5 + downwash * 0.5)) * delta;

      // Reset when particle reaches outer edge of helipad
      if (p.radius > 16.5) {
        p.radius = 2.2 + Math.random() * 2.0;
        p.height = 0.28 + Math.random() * 0.6;
      }

      // Height bobs turbulently as dust lifts off ground
      p.height = Math.min(2.4, p.height + (1.2 * downwash) * delta);

      const px = h.pos.x + Math.sin(p.angle) * p.radius;
      const pz = h.pos.z + Math.cos(p.angle) * p.radius;
      const py = p.height;

      // Particle scale grows as dust disperses
      const scaleProgression = (p.radius / 16.5);
      const s = p.baseScale * (0.8 + scaleProgression * 1.6) * Math.min(1.5, downwash * 1.4);

      dummy.position.set(px, py, pz);
      dummy.scale.set(s, s * 0.6, s);
      dummy.rotation.set(p.angle, p.angle * 2, 0);
      dummy.updateMatrix();

      particlesRef.current.setMatrixAt(i, dummy.matrix);
    }
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <dodecahedronGeometry args={[0.7, 1]} />
      <meshStandardMaterial
        color="#d7c4a3"
        roughness={0.9}
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------- Real 3D Helicopter Model */

function HelicopterModel() {
  const gltf = useGLTF('/models/helicopter.glb');
  const groupRef = useRef<THREE.Group>(null);
  const mainRotorRef = useRef<THREE.Object3D | null>(null);
  const tailRotorRef = useRef<THREE.Object3D | null>(null);

  // Clone scene and locate rotor nodes
  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.name === 'AW101_propellar') {
        mainRotorRef.current = child;
      }
      if (child.name === 'AW101_backrotor') {
        tailRotorRef.current = child;
      }
    });
    return clone;
  }, [gltf.scene]);

  useFrame((_, delta) => {
    const h = simEngine.helicopter;
    if (!h || !groupRef.current) return;

    // Direct Object3D updates at 60 FPS
    groupRef.current.position.set(h.pos.x, h.pos.y, h.pos.z);
    groupRef.current.rotation.set(h.pitch, h.heading, h.roll);

    // High-speed rotor spin animations
    if (mainRotorRef.current) {
      mainRotorRef.current.rotation.y += (h.rotorRpmFraction * 36.0) * delta;
    }
    if (tailRotorRef.current) {
      tailRotorRef.current.rotation.x += (h.rotorRpmFraction * 125.0) * delta;
    }
  });

  return (
    <group ref={groupRef} position={[-135, 0.35, 48]}>
      {/* 1:1 Scale AgustaWestland AW101 VIP Helicopter */}
      <primitive object={sceneClone} />

      {/* Aerodynamic Rotor Blur Motion Disc when RPM > 40% */}
      <mesh position={[0, 2.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9.2, 32]} />
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={0.35}
          roughness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------- Complete Kempegowda VIP Helipad */

export function HelipadZone() {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const center: V3 = [-135, 0, 48];

  return (
    <group>
      {/* 1. Main Non-Slip Concrete Helipad Deck (Diameter 26m, Height 0.32m) */}
      <mesh position={[-135, 0.16, 48]} receiveShadow castShadow>
        <cylinderGeometry args={[13, 13, 0.32, 48]} />
        <meshStandardMaterial color="#282e37" roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Outer Safety Yellow Perimeter Border Ring (Diameter 25m) */}
      <mesh position={[-135, 0.33, 48]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12.2, 12.8, 48]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} />
      </mesh>

      {/* Inner White Touchdown / Lift-off (TLOF) Aiming Ring (Diameter 18m) */}
      <mesh position={[-135, 0.332, 48]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.6, 9.4, 48]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      {/* Bold Yellow 'H' Identification Symbol in Center of Helipad */}
      <group position={[-135, 0.335, 48]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Left Vertical Bar */}
        <mesh position={[-2.2, 0, 0]}>
          <planeGeometry args={[1.2, 6.2]} />
          <meshStandardMaterial color="#facc15" roughness={0.3} />
        </mesh>
        {/* Right Vertical Bar */}
        <mesh position={[2.2, 0, 0]}>
          <planeGeometry args={[1.2, 6.2]} />
          <meshStandardMaterial color="#facc15" roughness={0.3} />
        </mesh>
        {/* Center Horizontal Crossbar */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[3.4, 1.2]} />
          <meshStandardMaterial color="#facc15" roughness={0.3} />
        </mesh>
        {/* White Orientation Line across helipad heading */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[0.5, 17.0]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* Red Safety Perimeter Border Arc */}
      <mesh position={[-135, 0.328, 48]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12.8, 13.0, 48]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Inset Helipad Boundary LED Lights */}
      <HelipadBoundaryLights center={center} isNight={isNight} />

      {/* Four Elevated Corner Floodlight Masts (Night / Sunset Operations) */}
      {[
        [-150, 48 - 14],
        [-150, 48 + 14],
        [-120, 48 - 14],
        [-120, 48 + 14],
      ].map(([fx, fz], idx) => (
        <group key={idx} position={[fx, 0, fz]}>
          {/* Mast Pole */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.16, 7.0, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          {/* Angled High-Intensity Floodlight Luminaire */}
          <mesh position={[0, 7.1, 0]} rotation={[0.4, idx % 2 === 0 ? 0.3 : -0.3, 0]}>
            <boxGeometry args={[0.8, 0.5, 0.3]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={isNight ? '#ffffff' : '#000000'}
              emissiveIntensity={isNight ? 4.5 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Airport Windsock */}
      <HelipadWindsock pos={[-120, 0, 35]} />

      {/* 2. Painted Passenger Safety Walkway from Helipad to Terminal (X = -135 to -112, Z = 48) */}
      <mesh position={[-123.5, 0.28, 48]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[23, 2.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Yellow Safety Boundary Stripes on Walkway */}
      {[-1.3, 1.3].map((sy) => (
        <mesh key={sy} position={[-123.5, 0.285, 48 + sy]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[23, 0.2]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}

      {/* 3. VIP Passenger Waiting Shelter & Pavilion */}
      <group position={[-112, 0, 48]}>
        {/* Concrete Foundation Plinth */}
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <boxGeometry args={[4.5, 0.45, 5.0]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>
        {/* Steel Support Posts */}
        {[-1.8, 1.8].map((px) =>
          [-2.0, 2.0].map((pz) => (
            <mesh key={`${px}-${pz}`} position={[px, 1.7, pz]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 3.0, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.7} />
            </mesh>
          ))
        )}
        {/* Modern Glass / Polycarbonate Canopy Roof */}
        <mesh position={[0, 3.25, 0]} castShadow>
          <boxGeometry args={[4.8, 0.15, 5.4]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} roughness={0.1} />
        </mesh>
        {/* Waiting Bench */}
        <mesh position={[0, 0.65, -1.2]} castShadow>
          <boxGeometry args={[3.2, 0.1, 0.6]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
        {/* Helipad Information Signboard */}
        <mesh position={[0, 2.5, -2.4]} castShadow>
          <boxGeometry args={[2.8, 0.8, 0.1]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[0, 2.5, -2.46]}>
          <planeGeometry args={[2.6, 0.65]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isNight ? '#38bdf8' : '#0284c7'}
            emissiveIntensity={isNight ? 1.4 : 0.8}
          />
        </mesh>
      </group>

      {/* 4. 3D Helicopter Model & Spinning Rotors */}
      <HelicopterModel />

      {/* 5. Dynamic Rotor Wash Dust Blowing Ring */}
      <RotorWashDustRing />
    </group>
  );
}
