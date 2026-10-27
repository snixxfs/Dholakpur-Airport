'use client';

import React from 'react';
import * as THREE from 'three';
import { C } from './palette';
import { useWT } from '@/lib/store';

type V3 = [number, number, number];

function RoadSlab({
  pos,
  size,
  color = '#1e242c',
  roughness = 0.88,
  receive = true,
}: {
  pos: V3;
  size: V3;
  color?: string;
  roughness?: number;
  receive?: boolean;
}) {
  return (
    <mesh position={pos} receiveShadow={receive}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.1} />
    </mesh>
  );
}

/* ------------------------------------------------------------- Highway Streetlight */

function HighwayStreetlight({ pos, doubleArm = true }: { pos: V3; doubleArm?: boolean }) {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  return (
    <group position={pos}>
      {/* Concrete Base Plinth */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.8, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      {/* Steel Light Pole */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 9.2, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Mast Arms & LED Luminaire Heads */}
      {doubleArm ? (
        <>
          {/* Inbound Arm (pointing left towards inbound lanes) */}
          <mesh position={[-1.2, 9.4, 0]} rotation={[0, 0, 0.25]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 2.5, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          <mesh position={[-2.4, 9.8, 0]}>
            <boxGeometry args={[0.8, 0.15, 0.35]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={isNight ? '#fef08a' : '#000000'}
              emissiveIntensity={isNight ? 3.0 : 0}
            />
          </mesh>

          {/* Outbound Arm (pointing right towards outbound lanes) */}
          <mesh position={[1.2, 9.4, 0]} rotation={[0, 0, -0.25]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 2.5, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          <mesh position={[2.4, 9.8, 0]}>
            <boxGeometry args={[0.8, 0.15, 0.35]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={isNight ? '#fef08a' : '#000000'}
              emissiveIntensity={isNight ? 3.0 : 0}
            />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[1.2, 9.4, 0]} rotation={[0, 0, -0.25]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 2.5, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} />
          </mesh>
          <mesh position={[2.4, 9.8, 0]}>
            <boxGeometry args={[0.8, 0.15, 0.35]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={isNight ? '#fef08a' : '#000000'}
              emissiveIntensity={isNight ? 3.0 : 0}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------------- Zebra Crosswalk with Amber Flashing Beacons */

function ZebraCrosswalk({
  x,
  z,
  width = 6,
  length = 12,
}: {
  x: number;
  z: number;
  width?: number;
  length?: number;
}) {
  const stripeWidth = 0.6;
  const numStripes = Math.floor(length / (stripeWidth * 2));

  return (
    <group position={[x, 0.26, z]}>
      {/* White reflective thermo-plastic stripes */}
      {Array.from({ length: numStripes }, (_, i) => {
        const offsetZ = -length / 2 + (i + 0.5) * (stripeWidth * 2);
        return (
          <mesh key={i} position={[0, 0.005, offsetZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, stripeWidth]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        );
      })}

      {/* Amber Pedestrian Warning Beacon Posts on both ends of the crosswalk */}
      {[-width / 2 - 0.6, width / 2 + 0.6].map((bx) =>
        [-length / 2 - 0.5, length / 2 + 0.5].map((bz) => (
          <group key={`${bx}-${bz}`} position={[bx, 0, bz]}>
            {/* Striped Post */}
            <mesh position={[0, 1.4, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 2.8, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Amber Flashing Belisha Globe */}
            <mesh position={[0, 2.9, 0]}>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

/* ------------------------------------------------------------- Dedicated Kempegowda Taxi Stand */

function KempegowdaTaxiStand() {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  return (
    <group position={[70, 0, -64]}>
      {/* 1. Heavy Bitumen Concourse Slab */}
      <RoadSlab pos={[0, 0.12, 0]} size={[36, 0.24, 22]} color="#181e26" />

      {/* Concrete Curbs surrounding the Taxi Stand */}
      <mesh position={[-18.2, 0.24, 0]}>
        <boxGeometry args={[0.4, 0.48, 22]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>
      <mesh position={[18.2, 0.24, 0]}>
        <boxGeometry args={[0.4, 0.48, 22]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.24, 11.2]}>
        <boxGeometry args={[36.8, 0.48, 0.4]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* 2. Three Dedicated Taxi Pickup Bays (Bay 1 Uber, Bay 2 Ola, Bay 3 KSTDC) */}
      {[
        { id: '1', name: 'UBER APP CABS', color: '#000000', badgeColor: '#ffffff', x: -10, z: 2 },
        { id: '2', name: 'OLA APP CABS', color: '#059669', badgeColor: '#facc15', x: 2, z: -1 },
        { id: '3', name: 'KSTDC PREPAID', color: '#d97706', badgeColor: '#facc15', x: 12, z: -4 },
      ].map((bay) => (
        <group key={bay.id} position={[bay.x, 0.26, bay.z]}>
          {/* Yellow Chevron Outline Box */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[7.2, 4.2]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.6, 3.6]} />
            <meshStandardMaterial color="#181e26" />
          </mesh>

          {/* Large Bay Identification Badge on Asphalt */}
          <mesh position={[0, 0.01, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.8, 0.9]} />
            <meshStandardMaterial color={bay.badgeColor} />
          </mesh>

          {/* Yellow Hazard Diagonal Hatching Strip */}
          <mesh position={[0, 0.01, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.2, 0.35]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
        </group>
      ))}

      {/* 3. Modern Passenger Taxi Shelter Canopy & Waiting Pavilion */}
      <group position={[0, 0, 7.5]}>
        {/* Concrete Passenger Boarding Sidewalk */}
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <boxGeometry args={[35.6, 0.45, 5.5]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
        </mesh>

        {/* Structural Steel Portal Columns */}
        {[-14, -7, 0, 7, 14].map((colX) => (
          <group key={colX} position={[colX, 0, -1.8]}>
            <mesh position={[0, 2.5, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.22, 5.0, 12]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Capital bracket */}
            <mesh position={[0, 4.9, 0.6]} castShadow>
              <boxGeometry args={[0.3, 0.4, 1.6]} />
              <meshStandardMaterial color="#b45309" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        ))}

        {/* Cantilevered Curved Timber/Bamboo Roof Canopy */}
        <mesh position={[0, 5.2, 0]} castShadow>
          <boxGeometry args={[36.5, 0.45, 7.8]} />
          <meshStandardMaterial color={C.timberRoofCanopy} roughness={0.4} />
        </mesh>
        {/* Warm Underside Slats */}
        <mesh position={[0, 4.95, 0]}>
          <boxGeometry args={[36.0, 0.1, 7.4]} />
          <meshStandardMaterial color={C.timberRoofUnderside} roughness={0.5} />
        </mesh>
        {/* Translucent Skylight Glazing Rib */}
        <mesh position={[0, 5.4, 0]}>
          <boxGeometry args={[34.0, 0.15, 2.2]} />
          <meshStandardMaterial color="#7dd3fc" transparent opacity={0.6} roughness={0.1} />
        </mesh>

        {/* Overhead Prominent Illuminated Signboards */}
        {/* Main Header Signboard */}
        <mesh position={[-6, 4.7, -3.95]} castShadow>
          <boxGeometry args={[14, 0.9, 0.2]} />
          <meshStandardMaterial color="#059669" />
        </mesh>
        <mesh position={[-6, 4.7, -4.06]}>
          <planeGeometry args={[13.6, 0.75]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isNight ? '#34d399' : '#059669'}
            emissiveIntensity={isNight ? 1.5 : 0.8}
          />
        </mesh>

        {/* KSTDC Prepaid Taxi Header Signboard */}
        <mesh position={[9, 4.7, -3.95]} castShadow>
          <boxGeometry args={[12, 0.9, 0.2]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
        <mesh position={[9, 4.7, -4.06]}>
          <planeGeometry args={[11.6, 0.75]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive={isNight ? '#facc15' : '#b45309'}
            emissiveIntensity={isNight ? 1.5 : 0.8}
          />
        </mesh>

        {/* Overhead Individual Bay Pointers */}
        {[-10, 2, 12].map((bx, idx) => (
          <group key={bx} position={[bx, 3.8, -3.8]}>
            <mesh castShadow>
              <boxGeometry args={[3.2, 0.6, 0.15]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, -0.09]}>
              <planeGeometry args={[3.0, 0.48]} />
              <meshStandardMaterial
                color={idx === 2 ? '#facc15' : '#38bdf8'}
                emissive={idx === 2 ? '#facc15' : '#38bdf8'}
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        ))}

        {/* Stainless Steel Passenger Queue Stanchions & Benches */}
        {[-12, -4, 4, 12].map((sx) => (
          <group key={sx} position={[sx, 0.48, 1.2]}>
            {/* Wooden Waiting Bench */}
            <mesh position={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[3.0, 0.1, 0.6]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
            {[-1.2, 1.2].map((lx) => (
              <mesh key={lx} position={[lx, 0.2, 0]} castShadow>
                <boxGeometry args={[0.08, 0.4, 0.55]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
            ))}
          </group>
        ))}

        {/* Airport Luggage Trolleys (Stacked Carts Park) */}
        <group position={[-15.5, 0.48, -0.5]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.8, 0.9, 0.9]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.85, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- NH 44 Expressway & Roundabout */

export function LandsideRoads() {
  const timeOfDay = useWT((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  return (
    <group>
      {/* ================= 1. NH 44 AIRPORT 6-LANE EXPRESSWAY (Z = -75 to -170) ================= */}
      {/* Inbound & Outbound Continuous Asphalt Slab */}
      <RoadSlab pos={[0, 0.12, -125]} size={[28, 0.24, 96]} color="#181e26" roughness={0.86} />

      {/* Central Landscaped Median Strip */}
      <group position={[0, 0.24, -125]}>
        {/* Concrete Curb */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[2.2, 0.35, 96]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        {/* Green Turf & Landscaping Top */}
        <mesh position={[0, 0.33, 0]}>
          <boxGeometry args={[1.9, 0.05, 95.8]} />
          <meshStandardMaterial color="#4b543c" roughness={0.9} />
        </mesh>
        {/* Low Shrubbery along the median */}
        {Array.from({ length: 8 }, (_, i) => {
          const sz = -42 + i * 12;
          return (
            <mesh key={i} position={[0, 0.6, sz]} castShadow>
              <sphereGeometry args={[0.6, 8, 8]} />
              <meshStandardMaterial color="#3f4e30" roughness={0.8} />
            </mesh>
          );
        })}
      </group>

      {/* Highway Streetlights along Median */}
      {[-95, -120, -145, -168].map((lz) => (
        <HighwayStreetlight key={lz} pos={[0, 0.24, lz]} doubleArm />
      ))}

      {/* Inbound Carriageway Markings (Lanes from X = -13 to -1.2, heading North towards Airport) */}
      {/* Yellow Outer Shoulder Line */}
      <mesh position={[-13, 0.26, -125]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 96]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Dashed Lane Divider 1 */}
      {Array.from({ length: 14 }, (_, i) => {
        const lz = -168 + i * 7;
        return (
          <mesh key={`in-l1-${i}`} position={[-9, 0.26, lz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 4]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
      {/* Dashed Lane Divider 2 */}
      {Array.from({ length: 14 }, (_, i) => {
        const lz = -168 + i * 7;
        return (
          <mesh key={`in-l2-${i}`} position={[-5, 0.26, lz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 4]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
      {/* Solid White Inner Median Edge Line */}
      <mesh position={[-1.2, 0.26, -125]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, 96]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Outbound Carriageway Markings (Lanes from X = 1.2 to 13, heading South towards Bangalore) */}
      {/* Solid White Inner Median Edge Line */}
      <mesh position={[1.2, 0.26, -125]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.25, 96]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Dashed Lane Divider 1 */}
      {Array.from({ length: 14 }, (_, i) => {
        const lz = -168 + i * 7;
        return (
          <mesh key={`out-l1-${i}`} position={[5, 0.26, lz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 4]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
      {/* Dashed Lane Divider 2 */}
      {Array.from({ length: 14 }, (_, i) => {
        const lz = -168 + i * 7;
        return (
          <mesh key={`out-l2-${i}`} position={[9, 0.26, lz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, 4]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        );
      })}
      {/* Yellow Outer Shoulder Line */}
      <mesh position={[13, 0.26, -125]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 96]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>

      {/* Overhead Directional Highway Sign Gantry at Approach (Z = -108) */}
      <group position={[0, 0, -108]}>
        {/* Support Steel Portal Columns */}
        {[-14.5, 14.5].map((cx) => (
          <mesh key={cx} position={[cx, 5, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 10, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
        ))}
        {/* Overhead Space Truss */}
        <mesh position={[0, 9.8, 0]} castShadow>
          <boxGeometry args={[30, 0.6, 0.6]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
        {/* Green Kempegowda Destination Signs */}
        <mesh position={[-7.5, 8.8, -0.35]} castShadow>
          <boxGeometry args={[11, 2.6, 0.2]} />
          <meshStandardMaterial color="#047857" roughness={0.4} />
        </mesh>
        <mesh position={[-7.5, 8.8, -0.47]}>
          <planeGeometry args={[10.6, 2.2]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isNight ? '#10b981' : '#047857'}
            emissiveIntensity={isNight ? 1.4 : 0.8}
          />
        </mesh>

        <mesh position={[7.5, 8.8, -0.35]} castShadow>
          <boxGeometry args={[11, 2.6, 0.2]} />
          <meshStandardMaterial color="#047857" roughness={0.4} />
        </mesh>
        <mesh position={[7.5, 8.8, -0.47]}>
          <planeGeometry args={[10.6, 2.2]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isNight ? '#10b981' : '#047857'}
            emissiveIntensity={isNight ? 1.4 : 0.8}
          />
        </mesh>
      </group>

      {/* ================= 2. MAIN AIRPORT ROUNDABOUT ROADWAY RING (Z = -75, X = 0) ================= */}
      <group position={[0, 0, -75]}>
        {/* Circulating Asphalt Ring (Radius 19m to 33m, width 14m) */}
        <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[19.5, 33.5, 48]} />
          <meshStandardMaterial color="#181e26" roughness={0.88} />
        </mesh>
        {/* Concentric Circulating Dashed Lane Line */}
        <mesh position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[26.4, 26.7, 48]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        {/* Outer Concrete Curb Perimeter Ring */}
        <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[33.5, 34.2, 48]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
        </mesh>
      </group>

      {/* South Connector from Expressway to Roundabout (Z = -95 to -105) */}
      <mesh position={[0, 0.12, -101]} receiveShadow>
        <boxGeometry args={[28, 0.24, 14]} />
        <meshStandardMaterial color="#181e26" roughness={0.88} />
      </mesh>

      {/* North Connector from Roundabout to T2 Arrivals Boulevard (Z = -44 to -58) */}
      <mesh position={[0, 0.12, -50]} receiveShadow>
        <boxGeometry args={[22, 0.24, 16]} />
        <meshStandardMaterial color="#181e26" roughness={0.88} />
      </mesh>

      {/* East Spur Entry Connector to Taxi Stand (X = 26 to 52, Z = -62) */}
      <mesh position={[38, 0.12, -62]} receiveShadow>
        <boxGeometry args={[24, 0.24, 14]} />
        <meshStandardMaterial color="#181e26" roughness={0.88} />
      </mesh>

      {/* East Spur Exit Connector from Taxi Stand back to Roundabout (X = 26 to 55, Z = -74) */}
      <mesh position={[42, 0.12, -74]} receiveShadow>
        <boxGeometry args={[24, 0.24, 12]} />
        <meshStandardMaterial color="#181e26" roughness={0.88} />
      </mesh>

      {/* West Spur Connector to Terminal 1 Loop (X = -26 to -65, Z = -55) */}
      <mesh position={[-46, 0.12, -55]} receiveShadow>
        <boxGeometry args={[30, 0.24, 14]} />
        <meshStandardMaterial color="#181e26" roughness={0.88} />
      </mesh>

      {/* ================= 3. TERMINAL 2 GROUND ARRIVALS BOULEVARD & FORECOURT ================= */}
      {/* 4-Lane Paved Roadway passing in front of T2 Arrivals (Z = -38) */}
      <RoadSlab pos={[0, 0.12, -38]} size={[95, 0.24, 14]} color="#181e26" roughness={0.86} />

      {/* Wide Passenger Curbside Concrete Sidewalk (Z = -30.5) */}
      <mesh position={[0, 0.25, -30.5]} receiveShadow>
        <boxGeometry args={[102, 0.45, 5.5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.6} />
      </mesh>

      {/* Stainless Steel Curbside Pedestrian Safety Bollards */}
      {Array.from({ length: 26 }, (_, i) => {
        const bx = -48 + i * 3.8;
        return (
          <mesh key={`bollard-${i}`} position={[bx, 0.65, -33]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
        );
      })}

      {/* High-Visibility White Striped Zebra Crosswalks */}
      {/* Zebra Crosswalk 1 (Main Central Exit from Arrivals) */}
      <ZebraCrosswalk x={-15} z={-38} width={6} length={13} />

      {/* Zebra Crosswalk 2 (Direct path to Ola / Uber Taxi Stand Pavilion) */}
      <ZebraCrosswalk x={25} z={-38} width={6} length={13} />

      {/* ================= 4. DEDICATED KEMPEGOWDA TAXI STAND & WAITING PAVILION ================= */}
      <KempegowdaTaxiStand />

      {/* ================= 5. ELEVATED FLYOVER RAMPS (Departures Level 2) ================= */}
      {/* East Flyover Ascent Ramp (Ascends from Y=0.28 to Y=4.8) */}
      <mesh position={[38, 2.5, -47]} rotation={[0.15, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 0.8, 26]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Concrete Support Piers for Ascent Ramp */}
      {[-4, 4].map((px) => (
        <mesh key={px} position={[38 + px, 1.25, -47]} castShadow>
          <cylinderGeometry args={[0.9, 1.1, 2.5, 12]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
      ))}

      {/* West Flyover Descent Ramp (Descends from Y=4.8 to Y=0.28) */}
      <mesh position={[-42, 2.5, -47]} rotation={[-0.15, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 0.8, 26]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Concrete Support Piers for Descent Ramp */}
      {[-4, 4].map((px) => (
        <mesh key={px} position={[-42 + px, 1.25, -47]} castShadow>
          <cylinderGeometry args={[0.9, 1.1, 2.5, 12]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
