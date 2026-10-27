'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { simEngine } from '@/lib/sim/engine';

export function AirportDebugVisualizer({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const { graph } = simEngine;

  // Build edge line geometry
  const linePositions = useMemo(() => {
    const points: number[] = [];
    for (const edge of graph.edges.values()) {
      const from = graph.nodes.get(edge.from);
      const to = graph.nodes.get(edge.to);
      if (from && to) {
        points.push(from.pos.x, from.pos.y + 0.4, from.pos.z);
        points.push(to.pos.x, to.pos.y + 0.4, to.pos.z);
      }
    }
    return new Float32Array(points);
  }, [graph]);

  return (
    <group>
      {/* 1. Navigable Airfield & Road Graph Edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.65} linewidth={2} />
      </lineSegments>

      {/* 2. Graph Nodes */}
      {Array.from(graph.nodes.values()).map((node) => {
        const color =
          node.type === 'runway'
            ? '#ef4444'
            : node.type === 'holding'
            ? '#f59e0b'
            : node.type === 'gate'
            ? '#eab308'
            : node.type === 'taxiway'
            ? '#06b6d4'
            : node.type === 'landside_road'
            ? '#3b82f6'
            : '#a855f7';

        return (
          <mesh key={node.id} position={[node.pos.x, node.pos.y + 0.45, node.pos.z]}>
            <sphereGeometry args={[0.7, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}

      {/* 3. Aircraft Collision Separation Bubbles */}
      {simEngine.aircraft.map((ac) => (
        <group key={`bubble-${ac.id}`} position={[ac.pos.x, ac.pos.y + 1, ac.pos.z]}>
          <mesh>
            <sphereGeometry args={[ac.collisionRadius, 16, 16]} />
            <meshBasicMaterial
              color={ac.waitReason ? '#ef4444' : '#22c55e'}
              wireframe
              transparent
              opacity={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
