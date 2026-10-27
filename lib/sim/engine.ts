import * as THREE from 'three';
import { AirportGraph, createKempegowdaGraph, type GraphNode } from './graph';
import { AIRLINES, AIRCRAFT_MODELS, DESTINATIONS, type AirlineSeed, type AircraftModelSeed } from '../data';

export type SimPhase =
  | 'scheduled'
  | 'approaching'
  | 'holding_stack'
  | 'cleared_to_land'
  | 'touchdown_roll'
  | 'runway_exit'
  | 'taxi_in'
  | 'holding_for_traffic'
  | 'gate_entry'
  | 'parked_at_gate'
  | 'disembarking'
  | 'unloading'
  | 'servicing'
  | 'boarding'
  | 'pushback_prep'
  | 'pushback_active'
  | 'taxi_out'
  | 'holding_short_09L'
  | 'cleared_lineup'
  | 'takeoff_roll'
  | 'rotation_climb'
  | 'departed';

export interface SimAircraft {
  id: string;
  flightNumber: string;
  callsign: string;
  airline: string;
  airlineColor: string;
  airlineAccent: string;
  finDesign: AirlineSeed['finDesign'];
  model: string;
  category: 'narrowbody' | 'widebody' | 'super';
  registration: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  assignedGate: number; // 0..3 (T2), 4..6 (T1), 7 (Cargo)
  assignedGateId: string;
  
  // Physical Pose & Kinematics
  pos: THREE.Vector3;
  heading: number; // radians
  pitch: number;
  roll: number;
  speedKts: number;
  targetSpeedKts: number;
  collisionRadius: number; // meters

  // State Machine
  phase: SimPhase;
  phaseTimer: number;
  waitReason: string | null;

  // Navigation
  pathNodeIds: string[];
  currentPathIndex: number;
  reservedEdgeId: string | null;

  // Turnaround Ops
  paxTotal: number;
  paxOnboard: number;
  paxDepartingTotal: number;
  bagsTotal: number;
  bagsUnloaded: number;
  fuelPercent: number;
  cateringComplete: boolean;
  cleanComplete: boolean;
  pushbackComplete: boolean;
}

export type SimHelicopterPhase =
  | 'approaching'
  | 'hover_descent'
  | 'touchdown'
  | 'spool_down'
  | 'disembarking'
  | 'boarding'
  | 'spool_up'
  | 'hover_liftoff'
  | 'departure_climb';

export interface SimHelicopter {
  id: string;
  callsign: string;
  registration: string;
  model: string;
  pos: THREE.Vector3;
  heading: number;
  pitch: number;
  roll: number;
  speedKts: number;
  rotorRpmFraction: number; // 0.0 to 1.0 (for blade spin & dust intensity)
  phase: SimHelicopterPhase;
  phaseTimer: number;
  paxOnboard: number;
  maxPax: number;
  helipadPos: THREE.Vector3;
}

export interface SimRoadVehicle {
  id: string;
  type: 'taxi' | 'rideshare' | 'bus' | 'private_car';
  color: string;
  pos: THREE.Vector3;
  heading: number;
  speedKts: number;
  targetSpeedKts: number;
  steeringAngle: number;
  pathNodeIds: string[];
  currentPathIndex: number;
  stopTimer: number;
  isHazardsOn: boolean;
  assignedBayId?: string;
  waitReason: string | null;
  brand?: 'uber' | 'ola' | 'kstdc' | 'bmtc' | 'private';
}

export interface SimPassenger {
  id: string;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
  heading: number;
  hasLuggage: boolean;
  state: 'arriving_dropoff' | 'walking_checkin' | 'queuing_security' | 'walking_gate' | 'waiting_gate' | 'boarding_jetbridge' | 'deplaning' | 'exiting' | 'landside_arrivals' | 'crossing_zebra' | 'waiting_taxi' | 'boarding_taxi';
  assignedGateId: string;
  clothesColor: string;
  pathNodeIds?: string[];
  currentPathIndex?: number;
  waitTimer?: number;
}

export interface SimATC {
  runwayOccupiedBy: string | null;
  runwayReservationLock: string | null;
  approachStack: string[];
  departureQueue: string[];
  gateOccupancy: Map<string, string>; // gateId -> flightId
}

export interface SimDiagnostics {
  fps: number;
  activeAircraft: number;
  activeVehicles: number;
  activePassengers: number;
  tickDurationMs: number;
  runwayStatus: string;
  atcClearanceCount: number;
  collisionCheckCount: number;
}

export class SimulationEngine {
  graph: AirportGraph;
  aircraft: SimAircraft[] = [];
  vehicles: SimRoadVehicle[] = [];
  passengers: SimPassenger[] = [];
  helicopter!: SimHelicopter;
  atc: SimATC = {
    runwayOccupiedBy: null,
    runwayReservationLock: null,
    approachStack: [],
    departureQueue: [],
    gateOccupancy: new Map(),
  };

  clock = 0;
  isPaused = false;
  simSpeed = 1;
  diagnostics: SimDiagnostics = {
    fps: 60,
    activeAircraft: 0,
    activeVehicles: 0,
    activePassengers: 0,
    tickDurationMs: 0,
    runwayStatus: 'CLEAR',
    atcClearanceCount: 0,
    collisionCheckCount: 0,
  };

  private lastFpsTime = performance.now();
  private frameCount = 0;
  private flightCounter = 501;

  constructor() {
    this.graph = createKempegowdaGraph();
    this.seedInitialWorld();
  }

  seedInitialWorld() {
    // 1. Seed Gate 201: Emirates Airbus A380-800 (Deplaning)
    this.spawnAircraft({
      airlineIndex: 0, // Emirates
      modelName: 'Airbus A380-800',
      gateId: 'GATE_201',
      gateIndex: 0,
      initialPhase: 'disembarking',
      paxFraction: 0.35,
    });

    // 2. Seed Gate 202: Air India Airbus A350-900 (Boarding)
    this.spawnAircraft({
      airlineIndex: 6, // Air India
      modelName: 'Airbus A350-900',
      gateId: 'GATE_202',
      gateIndex: 1,
      initialPhase: 'boarding',
      paxFraction: 0.85,
    });

    // 3. Seed Gate 204: Singapore Airlines Boeing 787-9 Dreamliner (Servicing)
    this.spawnAircraft({
      airlineIndex: 3, // Singapore Airlines
      modelName: 'Boeing 787-9 Dreamliner',
      gateId: 'GATE_204',
      gateIndex: 3,
      initialPhase: 'servicing',
      paxFraction: 0,
    });

    // 4. Seed Inbound Flight: IndiGo Airbus A321neo on ILS Approach (Sequenced for 09L)
    this.spawnAircraft({
      airlineIndex: 7, // IndiGo
      modelName: 'Airbus A321neo',
      gateId: 'GATE_203',
      gateIndex: 2,
      initialPhase: 'approaching',
      paxFraction: 1.0,
    });

    // Seed Landside Road Traffic (Taxis, Shuttles, Cars)
    this.seedLandsideVehicles();

    // Seed Passengers in Terminal 2 Concourse & VIP Helipad
    this.seedPassengers();

    // Seed VIP Heli-Taxi System (Helipad at X = -135, Z = 48)
    this.seedHelicopter();
  }

  seedHelicopter() {
    this.helicopter = {
      id: 'HELI-01',
      callsign: 'BLADE 1',
      registration: 'VT-BLR',
      model: 'AgustaWestland AW101 VIP',
      pos: new THREE.Vector3(-240, 52, 120),
      heading: 0.78, // ~45 degrees inbound
      pitch: -0.12,
      roll: -0.15,
      speedKts: 75,
      rotorRpmFraction: 1.0,
      phase: 'approaching',
      phaseTimer: 0,
      paxOnboard: 4,
      maxPax: 8,
      helipadPos: new THREE.Vector3(-135, 0.35, 48),
    };
  }

  spawnAircraft(params: {
    airlineIndex: number;
    modelName: string;
    gateId: string;
    gateIndex: number;
    initialPhase: SimPhase;
    paxFraction: number;
  }) {
    const airline = AIRLINES[params.airlineIndex % AIRLINES.length];
    const model = AIRCRAFT_MODELS.find((m) => m.model === params.modelName) ?? AIRCRAFT_MODELS[3];
    const flightNum = `${airline.code}-${this.flightCounter++}`;

    const gateNode = this.graph.nodes.get(params.gateId);
    const startPos = gateNode ? gateNode.pos.clone() : new THREE.Vector3(0, 0.28, 22.5);
    let heading = Math.PI; // default facing terminal at -Z

    if (params.initialPhase === 'approaching') {
      const appNode = this.graph.nodes.get('RWY_APP_09L');
      if (appNode) {
        startPos.copy(appNode.pos);
        heading = Math.PI / 2; // facing East down Runway 09L
      }
    }

    const paxTotal = Math.round(model.paxCapacity * (0.8 + Math.random() * 0.2));
    const paxDepartingTotal = Math.round(model.paxCapacity * (0.85 + Math.random() * 0.15));

    // Collision radius based on wingspan & fuselage length
    const collisionRadius = Math.max(14, model.wingspanM * 0.42);

    const aircraft: SimAircraft = {
      id: flightNum,
      flightNumber: flightNum,
      callsign: `${airline.callsign} ${flightNum.split('-')[1]}`,
      airline: airline.name,
      airlineColor: airline.primaryColor,
      airlineAccent: airline.accentColor,
      finDesign: airline.finDesign,
      model: model.model,
      category: model.category,
      registration: `VT-${airline.code}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      origin: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)].city,
      originCode: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)].code,
      destination: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)].city,
      destinationCode: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)].code,
      assignedGate: params.gateIndex,
      assignedGateId: params.gateId,
      pos: startPos,
      heading,
      pitch: 0,
      roll: 0,
      speedKts: params.initialPhase === 'approaching' ? 140 : 0,
      targetSpeedKts: params.initialPhase === 'approaching' ? 135 : 0,
      collisionRadius,
      phase: params.initialPhase,
      phaseTimer: 0,
      waitReason: null,
      pathNodeIds: [],
      currentPathIndex: 0,
      reservedEdgeId: null,
      paxTotal,
      paxOnboard: Math.round(paxTotal * params.paxFraction),
      paxDepartingTotal,
      bagsTotal: Math.round(paxTotal * 1.25),
      bagsUnloaded: params.initialPhase === 'boarding' || params.initialPhase === 'servicing' ? Math.round(paxTotal * 1.25) : 0,
      fuelPercent: params.initialPhase === 'boarding' ? 100 : params.initialPhase === 'servicing' ? 65 : 32,
      cateringComplete: params.initialPhase === 'boarding',
      cleanComplete: params.initialPhase === 'boarding',
      pushbackComplete: false,
    };

    // Lock gate occupancy only if parked/docked at gate
    if (params.initialPhase !== 'approaching' && params.initialPhase !== 'runway_exit') {
      this.atc.gateOccupancy.set(params.gateId, aircraft.id);
    }

    // Initial Path setup
    if (params.initialPhase === 'approaching') {
      aircraft.pathNodeIds = ['RWY_APP_09L', 'RWY_THR_09L', 'RWY_TDZ_09L', 'RWY_MID', 'RWY_EXIT_B'];
      aircraft.currentPathIndex = 0;
    }

    this.aircraft.push(aircraft);
    return aircraft;
  }

  seedLandsideVehicles() {
    // 10 Vehicles active across the highway, roundabout, flyover, and taxi stand
    const taxiBay1Path = [
      'ROAD_ENTRY',
      'ROAD_HWY_MID_IN',
      'ROAD_HWY_APP_IN',
      'ROAD_RND_S',
      'ROAD_RND_SW',
      'ROAD_RND_W',
      'ROAD_RND_NW',
      'ROAD_RND_N',
      'ROAD_RND_NE',
      'ROAD_TAXI_ENTRY',
      'ROAD_TAXI_BAY_1',
      'ROAD_TAXI_EXIT',
      'ROAD_TAXI_MERGE_RND',
      'ROAD_RND_E',
      'ROAD_RND_SE',
      'ROAD_HWY_APP_OUT',
      'ROAD_HWY_MID_OUT',
      'ROAD_EXIT',
    ];

    const taxiBay2Path = [
      'ROAD_ENTRY',
      'ROAD_HWY_MID_IN',
      'ROAD_HWY_APP_IN',
      'ROAD_RND_S',
      'ROAD_RND_SW',
      'ROAD_RND_W',
      'ROAD_RND_NW',
      'ROAD_RND_N',
      'ROAD_RND_NE',
      'ROAD_TAXI_ENTRY',
      'ROAD_TAXI_BAY_2',
      'ROAD_TAXI_EXIT',
      'ROAD_TAXI_MERGE_RND',
      'ROAD_RND_E',
      'ROAD_RND_SE',
      'ROAD_HWY_APP_OUT',
      'ROAD_HWY_MID_OUT',
      'ROAD_EXIT',
    ];

    const taxiBay3Path = [
      'ROAD_ENTRY',
      'ROAD_HWY_MID_IN',
      'ROAD_HWY_APP_IN',
      'ROAD_RND_S',
      'ROAD_RND_SW',
      'ROAD_RND_W',
      'ROAD_RND_NW',
      'ROAD_RND_N',
      'ROAD_RND_NE',
      'ROAD_TAXI_ENTRY',
      'ROAD_TAXI_BAY_3',
      'ROAD_TAXI_EXIT',
      'ROAD_TAXI_MERGE_RND',
      'ROAD_RND_E',
      'ROAD_RND_SE',
      'ROAD_HWY_APP_OUT',
      'ROAD_HWY_MID_OUT',
      'ROAD_EXIT',
    ];

    const viaductPath = [
      'ROAD_ENTRY',
      'ROAD_HWY_MID_IN',
      'ROAD_HWY_APP_IN',
      'ROAD_RND_S',
      'ROAD_RND_SW',
      'ROAD_RND_W',
      'ROAD_RND_NW',
      'ROAD_RND_N',
      'ROAD_RND_NE',
      'ROAD_T2_RAMP_UP',
      'ROAD_T2_DROP_1',
      'ROAD_T2_DROP_2',
      'ROAD_T2_RAMP_DN',
      'ROAD_RND_W',
      'ROAD_RND_SW',
      'ROAD_RND_S',
      'ROAD_RND_SE',
      'ROAD_HWY_APP_OUT',
      'ROAD_HWY_MID_OUT',
      'ROAD_EXIT',
    ];

    const busPath = [
      'ROAD_ENTRY',
      'ROAD_HWY_MID_IN',
      'ROAD_HWY_APP_IN',
      'ROAD_RND_S',
      'ROAD_RND_SW',
      'ROAD_RND_W',
      'ROAD_RND_NW',
      'ROAD_T1_LOOP_1',
      'ROAD_T1_LOOP_2',
      'ROAD_RND_SW',
      'ROAD_RND_S',
      'ROAD_RND_SE',
      'ROAD_HWY_APP_OUT',
      'ROAD_HWY_MID_OUT',
      'ROAD_EXIT',
    ];

    const vehicleConfigs: Array<{
      id: string;
      type: SimRoadVehicle['type'];
      brand: SimRoadVehicle['brand'];
      color: string;
      path: string[];
      startIndex: number;
      assignedBayId?: string;
    }> = [
      { id: 'VEH-1', type: 'taxi', brand: 'uber', color: '#ffffff', path: taxiBay1Path, startIndex: 1, assignedBayId: 'ROAD_TAXI_BAY_1' },
      { id: 'VEH-2', type: 'taxi', brand: 'ola', color: '#ffffff', path: taxiBay2Path, startIndex: 8, assignedBayId: 'ROAD_TAXI_BAY_2' },
      { id: 'VEH-3', type: 'taxi', brand: 'kstdc', color: '#ffffff', path: taxiBay3Path, startIndex: 3, assignedBayId: 'ROAD_TAXI_BAY_3' },
      { id: 'VEH-4', type: 'bus', brand: 'bmtc', color: '#0284c7', path: busPath, startIndex: 5 },
      { id: 'VEH-5', type: 'bus', brand: 'bmtc', color: '#0369a1', path: busPath, startIndex: 0 },
      { id: 'VEH-6', type: 'private_car', brand: 'private', color: '#0f172a', path: viaductPath, startIndex: 6 },
      { id: 'VEH-7', type: 'rideshare', brand: 'uber', color: '#1e293b', path: viaductPath, startIndex: 4 },
      { id: 'VEH-8', type: 'private_car', brand: 'private', color: '#f8fafc', path: viaductPath, startIndex: 1 },
      { id: 'VEH-9', type: 'taxi', brand: 'ola', color: '#ffffff', path: taxiBay2Path, startIndex: 8, assignedBayId: 'ROAD_TAXI_BAY_2' },
      { id: 'VEH-10', type: 'private_car', brand: 'private', color: '#dc2626', path: viaductPath, startIndex: 10 },
    ];

    for (const cfg of vehicleConfigs) {
      const startNode = this.graph.nodes.get(cfg.path[cfg.startIndex])!;
      this.vehicles.push({
        id: cfg.id,
        type: cfg.type,
        brand: cfg.brand,
        color: cfg.color,
        pos: startNode.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8)),
        heading: 0,
        speedKts: 22,
        targetSpeedKts: 22,
        steeringAngle: 0,
        pathNodeIds: cfg.path,
        currentPathIndex: cfg.startIndex,
        stopTimer: cfg.startIndex === 8 ? 4.0 : 0,
        isHazardsOn: cfg.startIndex === 8,
        assignedBayId: cfg.assignedBayId,
        waitReason: null,
      });
    }
  }

  seedPassengers() {
    const clothes = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#475569', '#f8fafc', '#0f172a', '#d97706', '#0284c7'];

    // 1. Terminal 2 Concourse Level 2 (14 Passengers)
    for (let i = 0; i < 14; i++) {
      const gIdx = i % 4;
      const targetGateId = `PED_GATE_20${gIdx + 1}`;
      const startX = (Math.random() - 0.5) * 20;
      const startZ = -30 + Math.random() * 40;

      this.passengers.push({
        id: `PAX-${i + 1}`,
        pos: new THREE.Vector3(startX, 4.8, startZ),
        targetPos: this.graph.nodes.get(targetGateId)?.pos.clone() ?? new THREE.Vector3(0, 4.8, 12),
        speed: 1.1 + Math.random() * 0.4,
        heading: 0,
        hasLuggage: Math.random() > 0.35,
        state: 'walking_gate',
        assignedGateId: targetGateId,
        clothesColor: clothes[i % clothes.length],
      });
    }

    // 2. Ground Level Arrivals & Zebra Crosswalks (10 Passengers walking out of T2 towards Taxi Stand)
    for (let i = 0; i < 10; i++) {
      const startX = (Math.random() - 0.5) * 12;
      const startZ = -32 - Math.random() * 4;

      this.passengers.push({
        id: `PAX-ARR-${i + 1}`,
        pos: new THREE.Vector3(startX, 0.28, startZ),
        targetPos: new THREE.Vector3(20 + (Math.random() - 0.5) * 6, 0.28, -46),
        speed: 1.0 + Math.random() * 0.3,
        heading: Math.PI / 4,
        hasLuggage: true,
        state: 'landside_arrivals',
        assignedGateId: 'PED_T2_ARR_DOOR',
        clothesColor: clothes[(i + 3) % clothes.length],
      });
    }

    // 3. Ground Level Taxi Stand Pavilion & Queue (8 Passengers waiting in line with luggage)
    const taxiBayCoords = [
      { x: 60, z: -60 },
      { x: 72, z: -63 },
      { x: 82, z: -66 },
    ];
    for (let i = 0; i < 8; i++) {
      const bay = taxiBayCoords[i % taxiBayCoords.length];
      const posX = bay.x + (Math.random() - 0.5) * 4;
      const posZ = bay.z + (Math.random() - 0.5) * 3;

      this.passengers.push({
        id: `PAX-TAXI-${i + 1}`,
        pos: new THREE.Vector3(posX, 0.28, posZ),
        targetPos: new THREE.Vector3(posX + (Math.random() - 0.5) * 1.5, 0.28, posZ + (Math.random() - 0.5) * 1.5),
        speed: 0.6,
        heading: -Math.PI / 2,
        hasLuggage: true,
        state: 'waiting_taxi',
        assignedGateId: 'PED_TAXI_SHELTER',
        clothesColor: clothes[(i + 5) % clothes.length],
        waitTimer: 5 + Math.random() * 15,
      });
    }

    // 4. Departures Viaduct Sidewalk Level 2 (6 Passengers walking into Departures)
    for (let i = 0; i < 6; i++) {
      const startX = -25 + i * 10;
      this.passengers.push({
        id: `PAX-DEP-${i + 1}`,
        pos: new THREE.Vector3(startX, 4.8, -41),
        targetPos: new THREE.Vector3(startX * 0.5, 4.8, -36),
        speed: 0.9 + Math.random() * 0.3,
        heading: 0,
        hasLuggage: true,
        state: 'arriving_dropoff',
        assignedGateId: 'PED_T2_CURB',
        clothesColor: clothes[(i + 7) % clothes.length],
      });
    }

    // 5. VIP Heli-Taxi Passengers on Helipad Walkway (4 Passengers)
    const vipClothes = ['#0f172a', '#1e293b', '#334155', '#475569'];
    for (let i = 0; i < 4; i++) {
      const isBoarding = i >= 2;
      const startX = isBoarding ? -118 - i * 3 : -135 + i * 4;
      this.passengers.push({
        id: `PAX-VIP-${i + 1}`,
        pos: new THREE.Vector3(startX, 0.32, 48),
        targetPos: isBoarding ? new THREE.Vector3(-134, 0.35, 48) : new THREE.Vector3(-114, 0.28, 48),
        speed: 0.85,
        heading: isBoarding ? -Math.PI / 2 : Math.PI / 2,
        hasLuggage: true,
        state: 'boarding_taxi',
        assignedGateId: 'HELIPAD_BLR',
        clothesColor: vipClothes[i],
      });
    }
  }

  // Authoritative Central Simulation Tick
  tick(rawDt: number) {
    if (this.isPaused) return;

    const tStart = performance.now();
    const effectiveDt = rawDt * this.simSpeed;
    this.clock += effectiveDt;

    // Fixed-step substepping (dt = 0.05s max per substep) to prevent collision tunneling
    const maxSubstep = 0.05;
    let remainingDt = effectiveDt;
    while (remainingDt > 0) {
      const step = Math.min(remainingDt, maxSubstep);
      this.substep(step);
      remainingDt -= step;
    }

    // Diagnostics calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.diagnostics.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    this.diagnostics.activeAircraft = this.aircraft.length;
    this.diagnostics.activeVehicles = this.vehicles.length;
    this.diagnostics.activePassengers = this.passengers.length;
    this.diagnostics.tickDurationMs = parseFloat((performance.now() - tStart).toFixed(2));
    this.diagnostics.runwayStatus = this.atc.runwayOccupiedBy ? `OCCUPIED (${this.atc.runwayOccupiedBy})` : 'CLEAR';
  }

  private substep(dt: number) {
    // 1. Process Air Traffic Control Clearances & Runway Locks
    this.processATC(dt);

    // 2. Process Aircraft State Machines, Pathfollowing & Separation
    this.processAircraft(dt);

    // 3. Process VIP Heli-Taxi Lifecycle, Rotor RPM & Downwash
    this.processHelicopter(dt);

    // 4. Process Road Traffic Kinematics & Collision Checks
    this.processRoadVehicles(dt);

    // 5. Process Terminal & VIP Passengers
    this.processPassengers(dt);

    // 6. Periodic Flight Spawn when gate becomes available
    this.processSpawnCycle(dt);
  }

  private processATC(dt: number) {
    // Check if runway lock needs clearing
    if (this.atc.runwayOccupiedBy) {
      const occupant = this.aircraft.find((a) => a.id === this.atc.runwayOccupiedBy);
      if (!occupant || occupant.phase === 'runway_exit' || occupant.phase === 'taxi_in' || occupant.phase === 'departed') {
        this.atc.runwayOccupiedBy = null;
        this.atc.runwayReservationLock = null;
      }
    }

    // Grant Runway clearance to Arrival or Departure
    if (!this.atc.runwayOccupiedBy && !this.atc.runwayReservationLock) {
      // Prioritize inbound aircraft on final approach
      const arriving = this.aircraft.find((a) => a.phase === 'approaching' && !a.waitReason);
      if (arriving) {
        this.atc.runwayOccupiedBy = arriving.id;
        this.atc.runwayReservationLock = arriving.id;
        arriving.phase = 'cleared_to_land';
        this.diagnostics.atcClearanceCount++;
      } else {
        // Next, check departing aircraft holding short of 09L
        const departing = this.aircraft.find((a) => a.phase === 'holding_short_09L');
        if (departing) {
          this.atc.runwayOccupiedBy = departing.id;
          this.atc.runwayReservationLock = departing.id;
          departing.phase = 'cleared_lineup';
          departing.pathNodeIds = ['HOLD_09L', 'TAX_ECHO', 'RWY_THR_09L', 'RWY_MID', 'RWY_EXIT_C'];
          departing.currentPathIndex = 0;
          this.diagnostics.atcClearanceCount++;
        }
      }
    }
  }

  private processAircraft(dt: number) {
    for (let i = 0; i < this.aircraft.length; i++) {
      const ac = this.aircraft[i];
      ac.phaseTimer += dt;

      switch (ac.phase) {
        case 'approaching':
          this.updateApproaching(ac, dt);
          break;

        case 'holding_stack':
          this.updateHoldingStack(ac, dt);
          break;

        case 'cleared_to_land':
          this.updateLanding(ac, dt);
          break;

        case 'touchdown_roll':
          this.updateTouchdownRoll(ac, dt);
          break;

        case 'runway_exit':
          this.updateRunwayExit(ac, dt);
          break;

        case 'taxi_in':
        case 'holding_for_traffic':
          this.updateTaxiIn(ac, dt);
          break;

        case 'gate_entry':
          this.updateGateEntry(ac, dt);
          break;

        case 'parked_at_gate':
          if (ac.phaseTimer > 4.0) {
            ac.phase = 'disembarking';
            ac.phaseTimer = 0;
          }
          break;

        case 'disembarking':
          this.updateDisembarking(ac, dt);
          break;

        case 'unloading':
          this.updateUnloading(ac, dt);
          break;

        case 'servicing':
          this.updateServicing(ac, dt);
          break;

        case 'boarding':
          this.updateBoarding(ac, dt);
          break;

        case 'pushback_prep':
          this.updatePushbackPrep(ac, dt);
          break;

        case 'pushback_active':
          this.updatePushbackActive(ac, dt);
          break;

        case 'taxi_out':
          this.updateTaxiOut(ac, dt);
          break;

        case 'holding_short_09L':
          ac.speedKts = 0;
          ac.targetSpeedKts = 0;
          ac.waitReason = this.atc.runwayOccupiedBy
            ? `Holding short RWY 09L (Runway occupied by ${this.atc.runwayOccupiedBy})`
            : 'Holding short RWY 09L (Awaiting takeoff clearance)';
          break;

        case 'cleared_lineup':
          this.updateLineup(ac, dt);
          break;

        case 'takeoff_roll':
          this.updateTakeoffRoll(ac, dt);
          break;

        case 'rotation_climb':
          this.updateRotationClimb(ac, dt);
          break;

        case 'departed':
          // Clean up and recycle
          break;
      }

      // Smooth kinematic steering & acceleration
      if (ac.speedKts !== ac.targetSpeedKts) {
        const accel = ac.phase === 'takeoff_roll' ? 25 : 12;
        if (ac.speedKts < ac.targetSpeedKts) {
          ac.speedKts = Math.min(ac.targetSpeedKts, ac.speedKts + accel * dt);
        } else {
          ac.speedKts = Math.max(ac.targetSpeedKts, ac.speedKts - accel * 1.5 * dt);
        }
      }
    }
  }

  private updateApproaching(ac: SimAircraft, dt: number) {
    // Check if runway is blocked
    if (this.atc.runwayOccupiedBy && this.atc.runwayOccupiedBy !== ac.id) {
      ac.phase = 'holding_stack';
      ac.waitReason = `Runway 09L occupied by ${this.atc.runwayOccupiedBy}. Entering holding stack.`;
      return;
    }

    // Fly along glide slope
    const targetNode = this.graph.nodes.get('RWY_THR_09L')!;
    this.moveTowards(ac, targetNode.pos, 140, dt, 0.05);

    if (ac.pos.distanceTo(targetNode.pos) < 25) {
      ac.phase = 'touchdown_roll';
      ac.phaseTimer = 0;
      this.atc.runwayOccupiedBy = ac.id;
    }
  }

  private updateHoldingStack(ac: SimAircraft, dt: number) {
    // 360-degree orbit around holding point West
    ac.heading += dt * 0.4;
    ac.pos.x = -260 + Math.cos(ac.heading) * 45;
    ac.pos.z = 88 + Math.sin(ac.heading) * 45;
    ac.pos.y = 80; // Holding altitude
    ac.speedKts = 160;

    // Check if runway became clear
    if (!this.atc.runwayOccupiedBy && !this.atc.runwayReservationLock) {
      ac.phase = 'cleared_to_land';
      ac.waitReason = null;
      this.atc.runwayOccupiedBy = ac.id;
      this.atc.runwayReservationLock = ac.id;
    }
  }

  private updateLanding(ac: SimAircraft, dt: number) {
    const thrNode = this.graph.nodes.get('RWY_THR_09L')!;
    this.moveTowards(ac, thrNode.pos, 135, dt, 0.06);
    if (ac.pos.distanceTo(thrNode.pos) < 18) {
      ac.phase = 'touchdown_roll';
      ac.pos.y = 0.28; // Touchdown on runway pavement!
      ac.pitch = 0;
      ac.phaseTimer = 0;
    }
  }

  private updateTouchdownRoll(ac: SimAircraft, dt: number) {
    // Check if obstacle on runway ahead
    const conflict = this.checkForwardConflict(ac, 45);
    if (conflict) {
      ac.targetSpeedKts = 0;
      ac.waitReason = `Holding short for ${conflict.flightNumber} ahead`;
      return;
    }

    // Roll out along Runway 09L and decelerate from 130 kts to 25 kts
    const exitNode = this.graph.nodes.get('RWY_EXIT_B')!;
    ac.targetSpeedKts = 25;
    ac.waitReason = null;
    this.moveTowards(ac, exitNode.pos, ac.speedKts, dt, 0.1);

    if (ac.pos.distanceTo(exitNode.pos) < 22) {
      ac.phase = 'runway_exit';
      ac.phaseTimer = 0;
      ac.pathNodeIds = ['RWY_EXIT_B', 'TAX_BRAVO', 'TAX_A5'];
      ac.currentPathIndex = 0;
    }
  }

  private updateRunwayExit(ac: SimAircraft, dt: number) {
    if (ac.currentPathIndex >= ac.pathNodeIds.length - 1) {
      // Cleared the runway protected area!
      if (this.atc.runwayOccupiedBy === ac.id) {
        this.atc.runwayOccupiedBy = null;
        this.atc.runwayReservationLock = null;
      }

      // Check if assigned gate is free
      const gateOccupant = this.atc.gateOccupancy.get(ac.assignedGateId);
      if (gateOccupant && gateOccupant !== ac.id) {
        // Gate is still occupied! Hold short on Taxiway Alpha
        ac.phase = 'holding_for_traffic';
        ac.targetSpeedKts = 0;
        ac.waitReason = `Gate ${ac.assignedGateId} occupied by ${gateOccupant}. Holding on Taxiway Alpha.`;
        return;
      } else {
        // Plan path from Taxiway Alpha to Assigned Gate Stand
        const pushNodeId = `${ac.assignedGateId}_PUSH`;
        const path = this.graph.findPath('TAX_A5', pushNodeId, ac.id);
        if (path) {
          ac.pathNodeIds = [...path, ac.assignedGateId];
          ac.currentPathIndex = 0;
          ac.phase = 'taxi_in';
          ac.waitReason = null;
        }
      }
    }

    // Check forward conflict on exit turnoff
    const conflict = this.checkForwardConflict(ac, 32);
    if (conflict) {
      ac.targetSpeedKts = 0;
      ac.waitReason = `Holding short for ${conflict.flightNumber} ahead`;
      return;
    }

    ac.targetSpeedKts = 20;
    ac.waitReason = null;
    this.followPath(ac, dt, 20);
  }

  private updateTaxiIn(ac: SimAircraft, dt: number) {
    // If waiting for gate stand to clear, verify gate occupancy
    if (ac.waitReason && ac.waitReason.includes('occupied')) {
      const gateOccupant = this.atc.gateOccupancy.get(ac.assignedGateId);
      if (gateOccupant && gateOccupant !== ac.id) {
        ac.targetSpeedKts = 0;
        return;
      }
      ac.waitReason = null;
    }

    // Check forward separation before moving
    const conflict = this.checkForwardConflict(ac, 32);
    if (conflict) {
      ac.targetSpeedKts = 0;
      ac.phase = 'holding_for_traffic';
      ac.waitReason = `Holding short for ${conflict.flightNumber} (${conflict.phase})`;
      return;
    }

    ac.targetSpeedKts = 15;
    ac.waitReason = null;
    this.followPath(ac, dt, 15);

    // When reaching gate stand
    if (ac.currentPathIndex >= ac.pathNodeIds.length - 1) {
      ac.phase = 'parked_at_gate';
      ac.phaseTimer = 0;
      ac.speedKts = 0;
      ac.targetSpeedKts = 0;
      this.atc.gateOccupancy.set(ac.assignedGateId, ac.id);
    }
  }

  private updateGateEntry(ac: SimAircraft, dt: number) {
    this.followPath(ac, dt, 8);
    if (ac.currentPathIndex >= ac.pathNodeIds.length - 1) {
      ac.phase = 'parked_at_gate';
      ac.phaseTimer = 0;
      ac.speedKts = 0;
      ac.targetSpeedKts = 0;
    }
  }

  private updateDisembarking(ac: SimAircraft, dt: number) {
    // Disembark passengers down to 0
    if (ac.paxOnboard > 0) {
      ac.paxOnboard = Math.max(0, ac.paxOnboard - Math.round(18 * dt * this.simSpeed));
    } else {
      ac.phase = 'unloading';
      ac.phaseTimer = 0;
    }
  }

  private updateUnloading(ac: SimAircraft, dt: number) {
    // Offload baggage dollies
    if (ac.bagsUnloaded < ac.bagsTotal) {
      ac.bagsUnloaded = Math.min(ac.bagsTotal, ac.bagsUnloaded + Math.round(24 * dt * this.simSpeed));
    } else {
      ac.phase = 'servicing';
      ac.phaseTimer = 0;
    }
  }

  private updateServicing(ac: SimAircraft, dt: number) {
    // Bowser refueling & catering
    if (ac.fuelPercent < 100) {
      ac.fuelPercent = Math.min(100, ac.fuelPercent + Math.round(12 * dt * this.simSpeed));
    }
    if (ac.phaseTimer > 8.0 && ac.fuelPercent >= 100) {
      ac.cateringComplete = true;
      ac.cleanComplete = true;
      ac.phase = 'boarding';
      ac.phaseTimer = 0;
    }
  }

  private updateBoarding(ac: SimAircraft, dt: number) {
    // Board departing passengers up to capacity
    if (ac.paxOnboard < ac.paxDepartingTotal) {
      ac.paxOnboard = Math.min(ac.paxDepartingTotal, ac.paxOnboard + Math.round(20 * dt * this.simSpeed));
    } else {
      ac.phase = 'pushback_prep';
      ac.phaseTimer = 0;
    }
  }

  private updatePushbackPrep(ac: SimAircraft, dt: number) {
    // Request Pushback clearance from Ground Control
    // Verify that taxiway directly behind the gate is clear
    const pushNodeId = `${ac.assignedGateId}_PUSH`;
    const pushNode = this.graph.nodes.get(pushNodeId);

    if (pushNode) {
      const isBlocked = this.aircraft.some((other) => {
        if (other.id === ac.id) return false;
        // Parked or servicing aircraft in adjacent stands do not block pushback on the taxiway
        if (['parked_at_gate', 'disembarking', 'unloading', 'servicing', 'boarding', 'approaching', 'departed'].includes(other.phase)) return false;
        return other.pos.distanceTo(pushNode.pos) < 28;
      });

      if (isBlocked) {
        ac.waitReason = 'Pushback hold: Taxiway behind stand occupied by crossing traffic.';
        return;
      }
    }

    ac.waitReason = null;
    ac.phase = 'pushback_active';
    ac.phaseTimer = 0;
  }

  private updatePushbackActive(ac: SimAircraft, dt: number) {
    // Tug pushes aircraft back 18m and swings tail
    const gateNode = this.graph.nodes.get(ac.assignedGateId)!;
    const pushNode = this.graph.nodes.get(`${ac.assignedGateId}_PUSH`)!;
    const t = Math.min(1.0, ac.phaseTimer / 8.0);

    ac.pos.lerpVectors(gateNode.pos, pushNode.pos, t);
    // Rotate from -Z (heading PI) to West (heading -PI/2)
    ac.heading = Math.PI - t * (Math.PI / 2);

    if (t >= 1.0) {
      // Pushback complete, free gate occupancy!
      this.atc.gateOccupancy.delete(ac.assignedGateId);
      ac.pushbackComplete = true;
      ac.phase = 'taxi_out';
      ac.phaseTimer = 0;

      // Plan taxi route to Runway 09L holding point
      const route = this.graph.findPath(pushNode.id, 'HOLD_09L', ac.id);
      if (route) {
        ac.pathNodeIds = route;
        ac.currentPathIndex = 0;
      }
    }
  }

  private updateTaxiOut(ac: SimAircraft, dt: number) {
    const conflict = this.checkForwardConflict(ac, 35);
    if (conflict) {
      ac.targetSpeedKts = 0;
      ac.waitReason = `Holding for ${conflict.flightNumber} ahead on taxiway`;
      return;
    }

    ac.targetSpeedKts = 18;
    ac.waitReason = null;
    this.followPath(ac, dt, 18);

    if (ac.currentPathIndex >= ac.pathNodeIds.length - 1) {
      ac.phase = 'holding_short_09L';
      ac.speedKts = 0;
      ac.targetSpeedKts = 0;
    }
  }

  private updateLineup(ac: SimAircraft, dt: number) {
    this.followPath(ac, dt, 12);
    const thrNode = this.graph.nodes.get('RWY_THR_09L')!;
    if (ac.pos.distanceTo(thrNode.pos) < 15) {
      ac.phase = 'takeoff_roll';
      ac.phaseTimer = 0;
      ac.targetSpeedKts = 155;
      ac.heading = Math.PI / 2; // Aligned down Runway 09L
    }
  }

  private updateTakeoffRoll(ac: SimAircraft, dt: number) {
    // Full power acceleration along 09L centerline
    ac.pos.x += ac.speedKts * dt * 0.8;
    if (ac.speedKts > 130) {
      ac.pitch = 0.18; // Rotation!
      ac.phase = 'rotation_climb';
      ac.phaseTimer = 0;
    }
  }

  private updateRotationClimb(ac: SimAircraft, dt: number) {
    ac.pos.x += ac.speedKts * dt * 0.85;
    ac.pos.y += dt * 32; // Positive climb rate
    ac.pitch = 0.24;

    if (ac.pos.y > 150) {
      ac.phase = 'departed';
      // Handover to Bengaluru Area Control, free runway lock
      if (this.atc.runwayOccupiedBy === ac.id) {
        this.atc.runwayOccupiedBy = null;
        this.atc.runwayReservationLock = null;
      }
      // Remove departed flight
      const idx = this.aircraft.indexOf(ac);
      if (idx !== -1) {
        this.aircraft.splice(idx, 1);
      }
    }
  }

  // Conflict & Separation Detection (Mandatory Collision Prevention)
  private checkForwardConflict(ac: SimAircraft, lookaheadDist: number): SimAircraft | null {
    this.diagnostics.collisionCheckCount++;
    const forwardX = Math.sin(ac.heading);
    const forwardZ = Math.cos(ac.heading);

    for (const other of this.aircraft) {
      if (other.id === ac.id) continue;
      if (other.phase === 'approaching' || other.phase === 'departed') continue;

      // Parked aircraft on stands (Z < 35) do not block runway or taxiway alpha movement
      // unless this aircraft is entering that exact assigned gate stand
      const isParkedAtStand = ['parked_at_gate', 'disembarking', 'unloading', 'servicing', 'boarding'].includes(other.phase) && other.pos.z < 35;
      if (isParkedAtStand) {
        if (ac.phase !== 'taxi_in' && ac.phase !== 'gate_entry') continue;
        if (ac.assignedGateId !== other.assignedGateId) continue;
      }

      const toOther = other.pos.clone().sub(ac.pos);
      const dist = toOther.length();

      // Check distance against combined collision bubbles
      const safeBuffer = Math.min(26, (ac.collisionRadius + other.collisionRadius) * 0.45);
      if (dist < safeBuffer) {
        return other; // Direct proximity conflict!
      }

      // Check forward cone
      if (dist < lookaheadDist) {
        toOther.normalize();
        const dot = forwardX * toOther.x + forwardZ * toOther.z;
        if (dot > 0.65) {
          return other; // Target is directly ahead in our taxi path!
        }
      }
    }
    return null;
  }

  private followPath(ac: SimAircraft, dt: number, speedKts: number) {
    if (ac.currentPathIndex >= ac.pathNodeIds.length) return;
    const targetNodeId = ac.pathNodeIds[ac.currentPathIndex];
    const targetNode = this.graph.nodes.get(targetNodeId);
    if (!targetNode) return;

    this.moveTowards(ac, targetNode.pos, speedKts, dt, 1.6);

    const reachDist = ac.speedKts > 50 ? 18 : 8;
    if (ac.pos.distanceTo(targetNode.pos) < reachDist) {
      ac.currentPathIndex++;
    }
  }

  private moveTowards(ac: SimAircraft, targetPos: THREE.Vector3, speedKts: number, dt: number, turnRate: number) {
    const toTarget = targetPos.clone().sub(ac.pos);
    const dist = toTarget.length();
    if (dist < 0.1) return;

    // Desired heading
    const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
    let diff = desiredHeading - ac.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const inAir = ac.pos.y > 1.2;
    // Turn rate scaled smoothly by dt
    const effectiveTurnRate = (inAir ? 0.75 : 1.5) * dt;
    const turnDelta = Math.sign(diff) * Math.min(Math.abs(diff), effectiveTurnRate);
    ac.heading += turnDelta;

    // Aerodynamic Banking Physics (Roll) & Pitch Attitudes
    if (inAir) {
      const turnRateActual = turnDelta / Math.max(0.001, dt);
      const targetRoll = -THREE.MathUtils.clamp(turnRateActual * 1.5, -0.48, 0.48); // Bank up to ~28° into turns
      ac.roll = THREE.MathUtils.lerp(ac.roll, targetRoll, Math.min(1.0, 3.5 * dt));

      // Pitch attitude:
      let targetPitch = 0.052; // ~3.0° nose up approach attitude
      if (ac.phase === 'touchdown_roll') {
        targetPitch = ac.phaseTimer < 3.0 ? 0.085 : 0.0; // Flares to 4.9° nose up
      } else if (ac.phase === 'rotation_climb') {
        targetPitch = 0.22; // Takeoff rotation climb (+12.6°)
      }
      ac.pitch = THREE.MathUtils.lerp(ac.pitch, targetPitch, Math.min(1.0, 3.5 * dt));
    } else {
      // Ground rollout and taxi: wings level, nose gear on tarmac
      ac.roll = THREE.MathUtils.lerp(ac.roll, 0, Math.min(1.0, 8.0 * dt));
      ac.pitch = THREE.MathUtils.lerp(ac.pitch, 0, Math.min(1.0, 6.0 * dt));
    }

    // Slow down during sharp turns on taxiways for realistic physics
    const taxiTurnBraking = (!inAir && Math.abs(diff) > 0.45) ? 0.55 : 1.0;
    const forwardSpeed = (speedKts * taxiTurnBraking * 0.514444 * 0.4) * dt; // knots to m/s scaled
    ac.pos.x += Math.sin(ac.heading) * forwardSpeed;
    ac.pos.z += Math.cos(ac.heading) * forwardSpeed;
    if (targetPos.y !== ac.pos.y) {
      ac.pos.y += (targetPos.y - ac.pos.y) * Math.min(1.0, dt * 2.0);
    }
  }

  private processHelicopter(dt: number) {
    const h = this.helicopter;
    if (!h) return;
    h.phaseTimer += dt;

    const pad = h.helipadPos; // (-135, 0.35, 48)

    switch (h.phase) {
      case 'approaching': {
        h.rotorRpmFraction = 1.0;
        const targetHover = new THREE.Vector3(pad.x, 16.0, pad.z);
        const toTarget = targetHover.clone().sub(h.pos);
        const horizDist = Math.hypot(toTarget.x, toTarget.z);

        const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
        let diff = desiredHeading - h.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const turn = Math.sign(diff) * Math.min(Math.abs(diff), 1.2 * dt);
        h.heading += turn;
        h.roll = THREE.MathUtils.lerp(h.roll, -turn * 2.5, Math.min(1.0, 4.0 * dt));

        // Speed & pitch: tilt nose down while flying forward, level off as approaching pad
        const targetSpeed = horizDist > 40 ? 65 : 20;
        h.speedKts += (targetSpeed - h.speedKts) * Math.min(1.0, 3.0 * dt);
        h.pitch = horizDist > 30 ? -0.14 : -0.04;

        const forwardMeters = (h.speedKts * 0.514444) * dt;
        h.pos.x += Math.sin(h.heading) * forwardMeters;
        h.pos.z += Math.cos(h.heading) * forwardMeters;
        h.pos.y += (targetHover.y - h.pos.y) * Math.min(1.0, 1.8 * dt);

        if (horizDist < 4.0 && Math.abs(h.pos.y - targetHover.y) < 2.0) {
          h.phase = 'hover_descent';
          h.phaseTimer = 0;
          h.speedKts = 0;
          h.pitch = 0;
          h.roll = 0;
        }
        break;
      }

      case 'hover_descent': {
        h.rotorRpmFraction = 1.0;
        h.pitch = 0;
        h.roll = 0;
        // Descend vertically at 2.4 m/s down to pad.y
        h.pos.y -= 2.4 * dt;
        if (h.pos.y <= pad.y) {
          h.pos.y = pad.y;
          h.phase = 'touchdown';
          h.phaseTimer = 0;
        }
        break;
      }

      case 'touchdown': {
        h.rotorRpmFraction = 1.0;
        h.pos.y = pad.y;
        if (h.phaseTimer > 2.5) {
          h.phase = 'spool_down';
          h.phaseTimer = 0;
        }
        break;
      }

      case 'spool_down': {
        // Rotors slow to idle
        h.rotorRpmFraction = Math.max(0.12, h.rotorRpmFraction - 0.28 * dt);
        if (h.phaseTimer > 3.5) {
          h.phase = 'disembarking';
          h.phaseTimer = 0;
        }
        break;
      }

      case 'disembarking': {
        h.rotorRpmFraction = 0.12;
        if (h.phaseTimer > 4.5) {
          h.phase = 'boarding';
          h.phaseTimer = 0;
        }
        break;
      }

      case 'boarding': {
        h.rotorRpmFraction = 0.12;
        if (h.phaseTimer > 5.5) {
          h.phase = 'spool_up';
          h.phaseTimer = 0;
        }
        break;
      }

      case 'spool_up': {
        // Turbine spools up to maximum power
        h.rotorRpmFraction = Math.min(1.0, h.rotorRpmFraction + 0.35 * dt);
        if (h.rotorRpmFraction >= 1.0 && h.phaseTimer > 4.0) {
          h.phase = 'hover_liftoff';
          h.phaseTimer = 0;
        }
        break;
      }

      case 'hover_liftoff': {
        h.rotorRpmFraction = 1.0;
        h.pitch = -0.05;
        // Vertical climb to 16m
        h.pos.y += 3.2 * dt;
        if (h.pos.y >= 16.0) {
          h.phase = 'departure_climb';
          h.phaseTimer = 0;
          h.heading = -0.65; // Heading towards city
        }
        break;
      }

      case 'departure_climb': {
        h.rotorRpmFraction = 1.0;
        h.pitch = -0.18; // Nose down acceleration
        h.roll = -0.12; // Bank turn
        h.speedKts = Math.min(85, h.speedKts + 25 * dt);
        const forwardMeters = (h.speedKts * 0.514444) * dt;
        h.pos.x += Math.sin(h.heading) * forwardMeters;
        h.pos.z += Math.cos(h.heading) * forwardMeters;
        h.pos.y += 4.5 * dt;

        // When far out in the sky, cycle back to inbound approach
        if (h.pos.y > 60 || h.pos.distanceTo(pad) > 280) {
          h.pos.set(-260, 55, 140);
          h.heading = Math.PI / 4;
          h.pitch = -0.12;
          h.roll = 0;
          h.speedKts = 75;
          h.phase = 'approaching';
          h.phaseTimer = 0;
        }
        break;
      }
    }
  }

  private checkForwardRoadConflict(v: SimRoadVehicle, safeDistance = 8): SimRoadVehicle | null {
    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);

    for (const other of this.vehicles) {
      if (other.id === v.id) continue;
      const dx = other.pos.x - v.pos.x;
      const dy = other.pos.y - v.pos.y;
      const dz = other.pos.z - v.pos.z;
      if (Math.abs(dy) > 1.8) continue; // Different road levels (e.g. flyover vs ground)
      const dist = Math.hypot(dx, dz);
      if (dist > safeDistance || dist < 0.1) continue;

      // Projection along forward heading
      const dot = (dx * fwdX + dz * fwdZ) / dist;
      if (dot > 0.6) {
        return other;
      }
    }
    return null;
  }

  private processRoadVehicles(dt: number) {
    for (const v of this.vehicles) {
      // 1. Vehicle stopped at Taxi Bay or Curbside Drop-off
      if (v.stopTimer > 0) {
        v.stopTimer -= dt;
        v.speedKts = Math.max(0, v.speedKts - 24 * dt);
        v.isHazardsOn = true;
        if (v.stopTimer <= 0) {
          v.isHazardsOn = false;
          v.waitReason = null;
        }
        continue;
      }

      // 2. Target waypoint in path
      const targetNodeId = v.pathNodeIds[v.currentPathIndex];
      const targetNode = this.graph.nodes.get(targetNodeId);
      if (!targetNode) continue;

      const dx = targetNode.pos.x - v.pos.x;
      const dz = targetNode.pos.z - v.pos.z;
      const distToTarget = Math.hypot(dx, dz);

      // Reached waypoint?
      if (distToTarget < 3.8) {
        v.currentPathIndex++;

        // Stopping at Taxi Bay for passenger pickup?
        if (targetNodeId.includes('TAXI_BAY')) {
          v.stopTimer = 8.0 + Math.random() * 4.0;
          v.isHazardsOn = true;
          v.waitReason = `Boarding passengers at Taxi Bay (${v.brand?.toUpperCase() ?? 'TAXI'})`;
          continue;
        } else if (targetNodeId.includes('DROP')) {
          v.stopTimer = 6.0 + Math.random() * 4.0;
          v.isHazardsOn = true;
          v.waitReason = 'Passenger curbside drop-off';
          continue;
        }

        if (v.currentPathIndex >= v.pathNodeIds.length) {
          // Reached highway outbound end (Z = -170), loop back to highway inbound entry (Z = -170)
          v.currentPathIndex = 0;
          const entryNode = this.graph.nodes.get(v.pathNodeIds[0])!;
          v.pos.copy(entryNode.pos);
          v.heading = 0;
          v.speedKts = 26;
          continue;
        }
      }

      // 3. Forward Conflict / Anti-Collision Check (Safe following distance)
      const conflict = this.checkForwardRoadConflict(v, 7.5);
      if (conflict) {
        // Vehicle ahead! Smoothly brake to maintain safe gap
        v.targetSpeedKts = 0;
        v.speedKts = Math.max(0, v.speedKts - 20 * dt);
        v.waitReason = `Following ${conflict.id} (${conflict.brand ?? conflict.type})`;
      } else {
        // Clear road: speed depends on road classification
        if (targetNodeId.includes('HWY') || targetNodeId === 'ROAD_ENTRY' || targetNodeId === 'ROAD_EXIT') {
          v.targetSpeedKts = 28; // NH 44 Highway speed
        } else if (targetNodeId.includes('RND') || targetNodeId.includes('RAMP')) {
          v.targetSpeedKts = 15; // Roundabout & viaduct ramps
        } else if (targetNodeId.includes('TAXI')) {
          v.targetSpeedKts = 10; // Taxi stand approach & bay crawl
        } else {
          v.targetSpeedKts = 20; // General boulevard
        }
        v.waitReason = null;
        v.speedKts += (v.targetSpeedKts - v.speedKts) * Math.min(1.0, 4.0 * dt);
      }

      // 4. Smooth Steering & Kinematics
      const desiredHeading = Math.atan2(dx, dz);
      let diff = desiredHeading - v.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const maxTurn = 2.8 * dt;
      const turnDelta = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
      v.heading += turnDelta;
      v.steeringAngle = THREE.MathUtils.clamp((turnDelta / Math.max(0.01, dt)) * 0.16, -0.6, 0.6);

      // 5. Forward Translation
      const forwardMeters = (v.speedKts * 0.514444 * 0.45) * dt;
      v.pos.x += Math.sin(v.heading) * forwardMeters;
      v.pos.z += Math.cos(v.heading) * forwardMeters;
      if (targetNode.pos.y !== v.pos.y) {
        v.pos.y += (targetNode.pos.y - v.pos.y) * Math.min(1.0, dt * 2.5);
      }
    }
  }

  private processPassengers(dt: number) {
    for (const p of this.passengers) {
      if (p.waitTimer && p.waitTimer > 0) {
        p.waitTimer -= dt;
        continue;
      }

      const dx = p.targetPos.x - p.pos.x;
      const dz = p.targetPos.z - p.pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 1.2) {
        const heading = Math.atan2(dx, dz);
        p.heading = heading;
        const step = p.speed * dt;
        p.pos.x += Math.sin(heading) * step;
        p.pos.z += Math.cos(heading) * step;
      } else {
        // Reached destination waypoint
        if (p.state === 'landside_arrivals') {
          // Walked from T2 door to zebra crossing midpoint
          p.state = 'crossing_zebra';
          p.targetPos.set(45, 0.28, -55); // Towards taxi shelter
        } else if (p.state === 'crossing_zebra') {
          // Reached taxi shelter, wait for taxi
          p.state = 'waiting_taxi';
          const bayX = 60 + Math.random() * 22;
          p.targetPos.set(bayX, 0.28, -58 - Math.random() * 4);
          p.waitTimer = 10 + Math.random() * 15;
        } else if (p.state === 'waiting_taxi') {
          // Passenger boarding cycle reset
          p.state = 'landside_arrivals';
          p.pos.set((Math.random() - 0.5) * 8, 0.28, -32);
          p.targetPos.set(20, 0.28, -46);
        } else if (p.state === 'arriving_dropoff') {
          // Departures curbside passenger entered terminal
          p.pos.set(-25 + Math.random() * 50, 4.8, -41);
          p.targetPos.set((Math.random() - 0.5) * 15, 4.8, -36);
        } else {
          // Concourse passenger roaming
          p.targetPos.x = (Math.random() - 0.5) * 40;
          p.targetPos.z = -20 + Math.random() * 35;
        }
      }
    }
  }

  private processSpawnCycle(dt: number) {
    // Maintain healthy traffic: 4 active flights at airport
    if (this.aircraft.length < 4) {
      // Find a free gate stand
      const freeGateEntry = [0, 1, 2, 3].find((gIdx) => {
        const gId = `GATE_20${gIdx + 1}`;
        return !this.atc.gateOccupancy.has(gId);
      });

      if (freeGateEntry !== undefined) {
        const models = ['Airbus A380-800', 'Airbus A350-900', 'Airbus A321neo', 'Boeing 787-9 Dreamliner', 'Boeing 777-300ER'];
        const chosenModel = models[Math.floor(Math.random() * models.length)];
        this.spawnAircraft({
          airlineIndex: Math.floor(Math.random() * AIRLINES.length),
          modelName: chosenModel,
          gateId: `GATE_20${freeGateEntry + 1}`,
          gateIndex: freeGateEntry,
          initialPhase: 'approaching',
          paxFraction: 1.0,
        });
      }
    }
  }
}

// Global Authoritative Engine Singleton
export const simEngine = new SimulationEngine();
