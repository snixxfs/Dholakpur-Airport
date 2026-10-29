'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWT } from '@/lib/store';

export function WeatherEffects() {
  const weatherType = useWT((s) => s.weatherType);
  const weatherCondition = useWT((s) => s.weatherCondition);

  const rainCount = 1200;
  const rainGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = Math.random() * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [rainCount]);

  const rainRef = useRef<THREE.Points>(null);

  useFrame((_, dt) => {
    if (!rainRef.current || weatherCondition.precipitationIntensity <= 0) return;
    const pos = rainRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const speed = 95 * weatherCondition.precipitationIntensity;

    for (let i = 0; i < rainCount; i++) {
      arr[i * 3 + 1] -= speed * dt;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 100 + Math.random() * 20;
      }
    }
    pos.needsUpdate = true;
  });

  if (weatherCondition.precipitationIntensity <= 0) return null;

  return (
    <points ref={rainRef} geometry={rainGeo}>
      <pointsMaterial
        color={weatherType === 'thunderstorm' ? '#93c5fd' : '#bfdbfe'}
        size={0.65}
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}
