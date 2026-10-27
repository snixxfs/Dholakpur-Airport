import * as THREE from 'three';

/**
 * World Layout for Kempegowda International Airport Terminal 2 (BLR / VOBL).
 * Coordinates:
 * +X = East (Runway 09L heading)
 * -X = West (Runway 27R heading)
 * +Z = South (towards Runway 09L)
 * -Z = North (Landside terminal forecourt & gardens)
 * +Y = Altitude (Metres)
 */

export const TERMINAL_T2 = {
  width: 140,
  depth: 36,
  height: 16,
  centerZ: -12,
  frontAirsideZ: 6, // Apron facade where jetbridge rotundas mount
  backLandsideZ: -30, // Landside departures drop-off facade
  roofOverhang: 6,
};

export const ATC_TOWER = {
  x: -68,
  z: -38,
  baseRadius: 4.5,
  shaftHeight: 38,
  cabRadius: 6.2,
  totalHeight: 48,
};

export const RUNWAY_09L = {
  xMin: -240,
  xMax: 240,
  z: 88,
  width: 22,
  touchdownX: -110,
  exitX: 45,
  holdingPointX: -165,
};

export const TAXIWAY_ALPHA = {
  z: 52,
  width: 13,
  xMin: -180,
  xMax: 160,
};

export const APRON_ZONE = {
  zMin: 6,
  zMax: 44,
  xMin: -80,
  xMax: 80,
};

export const GATE_COUNT = 4;
export const GATE_SPACING = 30;
export const GATE_STAND_Z = 22.5; // Aircraft center when parked at stand

export function gateX(index: number, count: number = GATE_COUNT): number {
  return (index - (count - 1) / 2) * GATE_SPACING;
}

export const AIRCRAFT_DIMS = {
  length: 19.5,
  wingspan: 17.8,
  fuselageRadius: 1.85,
  tailHeight: 6.2,
};

export type FlightPathKind = 'approach' | 'landing' | 'taxi_in' | 'pushback' | 'taxi_out' | 'takeoff';

const curveCache = new Map<string, THREE.Curve<THREE.Vector3>>();
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function getFlightCurve(kind: FlightPathKind, gx: number): THREE.Curve<THREE.Vector3> {
  const key = `${kind}:${gx.toFixed(1)}`;
  const cached = curveCache.get(key);
  if (cached) return cached;

  let curve: THREE.Curve<THREE.Vector3>;

  switch (kind) {
    case 'approach':
      // Realistic 3-degree ILS Cat-III approach from 1.5km out
      curve = new THREE.CatmullRomCurve3(
        [
          v3(-280, 58, RUNWAY_09L.z),
          v3(-210, 34, RUNWAY_09L.z),
          v3(-155, 14, RUNWAY_09L.z),
          v3(RUNWAY_09L.touchdownX, 1.0, RUNWAY_09L.z),
        ],
        false,
        'catmullrom',
      );
      break;

    case 'landing':
      // Decelerating rollout on Runway 09L with thrust reversers
      curve = new THREE.CatmullRomCurve3(
        [
          v3(RUNWAY_09L.touchdownX, 1.0, RUNWAY_09L.z),
          v3(-40, 1.0, RUNWAY_09L.z),
          v3(15, 1.0, RUNWAY_09L.z),
          v3(RUNWAY_09L.exitX, 1.0, RUNWAY_09L.z),
        ],
        false,
        'catmullrom',
      );
      break;

    case 'taxi_in':
      // Rapid-exit taxiway curve onto parallel Taxiway Alpha, taxiing to Gate Stand
      curve = new THREE.CatmullRomCurve3(
        [
          v3(RUNWAY_09L.exitX, 1.0, RUNWAY_09L.z),
          v3(RUNWAY_09L.exitX + 8, 1.0, 74),
          v3(RUNWAY_09L.exitX + 4, 1.0, 62),
          v3(RUNWAY_09L.exitX - 8, 1.0, TAXIWAY_ALPHA.z),
          v3((RUNWAY_09L.exitX + gx) / 2, 1.0, TAXIWAY_ALPHA.z),
          v3(gx + (gx > 0 ? 6 : -6), 1.0, TAXIWAY_ALPHA.z),
          v3(gx, 1.0, 36),
          v3(gx, 1.0, GATE_STAND_Z),
        ],
        false,
        'centripetal',
      );
      break;

    case 'pushback':
      // Pushback tug pushes aircraft straight back out of stand and swings tail east, nose west
      curve = new THREE.CatmullRomCurve3(
        [
          v3(gx, 1.0, GATE_STAND_Z),
          v3(gx, 1.0, 32),
          v3(gx, 1.0, 42),
          v3(gx - 6, 1.0, TAXIWAY_ALPHA.z),
          v3(gx - 14, 1.0, TAXIWAY_ALPHA.z),
        ],
        false,
        'centripetal',
      );
      break;

    case 'taxi_out':
      // Taxi along Taxiway Alpha to Runway 09L holding point, then line up on runway centerline
      curve = new THREE.CatmullRomCurve3(
        [
          v3(gx - 14, 1.0, TAXIWAY_ALPHA.z),
          v3((gx - 14 + RUNWAY_09L.holdingPointX) / 2, 1.0, TAXIWAY_ALPHA.z),
          v3(RUNWAY_09L.holdingPointX + 16, 1.0, TAXIWAY_ALPHA.z),
          v3(RUNWAY_09L.holdingPointX, 1.0, TAXIWAY_ALPHA.z),
          v3(RUNWAY_09L.holdingPointX - 8, 1.0, 68),
          v3(RUNWAY_09L.holdingPointX - 4, 1.0, 80),
          v3(RUNWAY_09L.holdingPointX + 8, 1.0, RUNWAY_09L.z),
        ],
        false,
        'centripetal',
      );
      break;

    case 'takeoff':
      // Full power takeoff roll down Runway 09L, V1/Rotate, positive climbout
      curve = new THREE.CatmullRomCurve3(
        [
          v3(RUNWAY_09L.holdingPointX + 8, 1.0, RUNWAY_09L.z),
          v3(-60, 1.0, RUNWAY_09L.z),
          v3(20, 1.0, RUNWAY_09L.z),
          v3(70, 5.0, RUNWAY_09L.z), // Liftoff rotation
          v3(140, 24, RUNWAY_09L.z),
          v3(240, 68, RUNWAY_09L.z),
        ],
        false,
        'catmullrom',
      );
      break;
  }

  curveCache.set(key, curve);
  return curve;
}

const tmpPos = new THREE.Vector3();
const tmpTan = new THREE.Vector3();

export interface AircraftPose {
  x: number;
  y: number;
  z: number;
  heading: number; // yaw in radians
  pitch: number;   // pitch in radians
  roll: number;    // roll in radians
}

export function aircraftPose(kind: FlightPathKind, gx: number, t: number): AircraftPose {
  const curve = getFlightCurve(kind, gx);
  const clamped = Math.min(1, Math.max(0, t));

  let u = clamped;
  if (kind === 'approach') {
    u = clamped;
  } else if (kind === 'landing') {
    u = 1 - Math.pow(1 - clamped, 1.7);
  } else if (kind === 'pushback') {
    u = clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  } else if (kind === 'takeoff') {
    u = clamped * clamped * 0.45 + clamped * 0.55;
  }

  curve.getPointAt(u, tmpPos);
  curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)), tmpTan);

  let heading = Math.atan2(tmpTan.x, tmpTan.z);

  if (kind === 'pushback') {
    const turnFraction = Math.max(0, (clamped - 0.45) / 0.55);
    heading = Math.PI - turnFraction * (Math.PI / 2);
  }

  let pitch = 0;
  let roll = 0;

  if (kind === 'approach') {
    pitch = -0.05;
    if (clamped > 0.82) pitch = 0.05; // Flare
  } else if (kind === 'takeoff') {
    if (clamped > 0.38) {
      pitch = 0.22; // Rotation & climb
    }
  }

  // Slight realistic banking on taxi turns
  if ((kind === 'taxi_in' || kind === 'taxi_out') && Math.abs(tmpTan.x) > 0.3 && Math.abs(tmpTan.z) > 0.3) {
    roll = tmpTan.x > 0 ? 0.02 : -0.02;
  }

  return {
    x: tmpPos.x,
    y: tmpPos.y,
    z: tmpPos.z,
    heading,
    pitch,
    roll,
  };
}
