'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AIRLINES, AIRCRAFT_MODELS, DESTINATIONS, SITES, type AirportSeed } from './data';
import { gateX, GATE_COUNT } from './layout';
import { simEngine, type SimAircraft, type SimPhase } from './sim/engine';

export const SIM_SCALE = 30;

export type TimeOfDay = 'day' | 'sunset' | 'night';
export type CameraPreset = 'overview' | 'aircraft' | 'gate' | 'runway' | 'ground' | 'free' | 'terminal' | 'taxi' | 'helipad';

export type FlightPhase =
  | 'approaching'     // On 3-degree ILS Cat-III approach
  | 'landing'         // Touchdown roll, reverse thrust, decelerate
  | 'taxi_in'         // Rapid exit to parallel taxiway & assigned gate stand
  | 'parked'          // On stand, VDGS docked, jetbridge extending
  | 'disembarking'    // Deplaning passengers via dual jetbridges
  | 'unloading'       // Belt loaders & LD3 container dollies active
  | 'servicing'       // Bowser refueling, high-lift catering, cabin cleaning
  | 'boarding'        // Departing passengers boarding
  | 'pushback'        // Heavy towbarless tug pushing back to taxiway
  | 'taxi_out'        // Taxi to Runway 09L holding point
  | 'runway_entry'    // Lineup on centerline
  | 'takeoff'         // Full power roll, rotation & climbout
  | 'departed';       // Transferred to Bengaluru Area Control

export const TURNAROUND_STAGES = [
  'ILS Approach',
  'Touchdown',
  'Taxi In',
  'Deplaning',
  'Ground Ops',
  'Boarding',
  'Pushback',
  'Taxi Out',
  'Takeoff',
] as const;

export function stageIndexForPhase(phase: FlightPhase): number {
  switch (phase) {
    case 'approaching': return 0;
    case 'landing': return 1;
    case 'taxi_in': return 2;
    case 'parked':
    case 'disembarking': return 3;
    case 'unloading':
    case 'servicing': return 4;
    case 'boarding': return 5;
    case 'pushback': return 6;
    case 'taxi_out': return 7;
    case 'runway_entry':
    case 'takeoff':
    case 'departed': return 8;
  }
}

export interface Flight {
  id: string;
  flightNumber: string;
  callsign: string;
  airline: string;
  airlineColor: string;
  airlineAccent: string;
  finDesign: 'emirates' | 'etihad' | 'qatar' | 'singapore' | 'lufthansa' | 'british' | 'airindia' | 'indigo' | 'akasa';
  aircraftType: string;
  aircraftCategory: 'narrowbody' | 'widebody' | 'super';
  registration: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  gate: number | null; // 0..3 (Gate 201..204)
  phase: FlightPhase;
  t: number;
  dur: {
    approach: number;
    landing: number;
    taxiIn: number;
    disembark: number;
    unload: number;
    service: number;
    board: number;
    pushback: number;
    taxiOut: number;
    takeoff: number;
  };
  paxTotal: number;
  paxOnboard: number;
  paxDepartingTotal: number;
  bagsTotal: number;
  bagsUnloaded: number;
  fuelPercent: number;
  cateringDone: boolean;
  cabinClean: boolean;
  pushbackReady: boolean;
  stageAt: (number | null)[];
  statusText: string;
  speedKnots: number;
  altitudeMeters: number;
}

export interface GateStand {
  idx: number;
  gateNumber: string; // e.g. "201", "202"
  maintenance: boolean;
  flightId: string | null;
  jetbridgeConnected: boolean;
}

export type GroundVehicleType = 'pushback' | 'baggage' | 'catering' | 'fuel';
export type GroundVehicleStatus = 'idle' | 'driving_to_gate' | 'servicing' | 'returning';

export interface GroundVehicle {
  id: string;
  type: GroundVehicleType;
  gate: number;
  status: GroundVehicleStatus;
  progress: number;
  battery: number;
  tasksCompleted: number;
}

export interface AirportEvent {
  id: string;
  time: string;
  category: 'atc' | 'ground' | 'gate' | 'ops';
  message: string;
  level: 'info' | 'success' | 'warning';
}

export interface SiteState {
  id: string;
  name: string;
  code: string;
  icao: string;
  city: string;
  gates: GateStand[];
  flights: Flight[];
  vehicles: GroundVehicle[];
  flightsHandled: number;
  onTimeFlights: number;
  passengersInTransit: number;
  totalPassengersToday: number;
  runwayOccupied: string | null;
  weather: {
    wind: string;
    windHeading: number;
    windSpeedKts: number;
    temp: number;
    visibility: string;
    altimeter: string;
    condition: string;
  };
  paxHistory: number[];
  otdHistory: number[];
  spawnTimer: number;
  events: AirportEvent[];
}

export type Selection =
  | { kind: 'site' }
  | { kind: 'flight'; id: string }
  | { kind: 'gate'; idx: number }
  | { kind: 'vehicle'; id: string };

export interface Store {
  sites: Record<string, SiteState>;
  siteOrder: string[];
  activeSiteId: string;
  selection: Selection;
  simSpeed: number; // 1, 2, 5
  isPaused: boolean;
  clock: number;
  timeOfDay: TimeOfDay;
  cameraPreset: CameraPreset;
  tick: (dt: number) => void;
  setActiveSite: (id: string) => void;
  select: (sel: Selection) => void;
  setSimSpeed: (speed: number) => void;
  togglePause: () => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  forceSpawnFlight: () => void;
  debugOverlay: boolean;
  toggleDebugOverlay: () => void;
}

export function mapSimPhaseToFlightPhase(p: SimPhase): FlightPhase {
  switch (p) {
    case 'scheduled':
    case 'approaching':
    case 'holding_stack':
    case 'cleared_to_land':
      return 'approaching';
    case 'touchdown_roll':
      return 'landing';
    case 'runway_exit':
    case 'taxi_in':
    case 'holding_for_traffic':
    case 'gate_entry':
      return 'taxi_in';
    case 'parked_at_gate':
      return 'parked';
    case 'disembarking':
      return 'disembarking';
    case 'unloading':
      return 'unloading';
    case 'servicing':
      return 'servicing';
    case 'boarding':
      return 'boarding';
    case 'pushback_prep':
    case 'pushback_active':
      return 'pushback';
    case 'taxi_out':
    case 'holding_short_09L':
      return 'taxi_out';
    case 'cleared_lineup':
      return 'runway_entry';
    case 'takeoff_roll':
    case 'rotation_climb':
      return 'takeoff';
    case 'departed':
      return 'departed';
  }
}

export function getSimPhaseStatusText(ac: SimAircraft): string {
  if (ac.waitReason) return ac.waitReason;
  const gateNum = ac.assignedGate < 4 ? `20${ac.assignedGate + 1}` : `10${ac.assignedGate - 3}`;
  switch (ac.phase) {
    case 'scheduled':
      return 'Scheduled on BLR Approach';
    case 'approaching':
      return 'ILS Cat-III Approach Runway 09L';
    case 'holding_stack':
      return 'Holding Stack Alpha (Runway Occupied)';
    case 'cleared_to_land':
      return 'Cleared to Land Runway 09L';
    case 'touchdown_roll':
      return 'Touchdown Roll · Reverse Thrust Active';
    case 'runway_exit':
      return 'Vacating 09L via Rapid Exit Bravo';
    case 'taxi_in':
      return `Taxiing via Alpha → Stand Gate ${gateNum}`;
    case 'holding_for_traffic':
      return 'Holding Short on Taxiway for Traffic';
    case 'gate_entry':
      return `Docking at Stand Gate ${gateNum} via VDGS`;
    case 'parked_at_gate':
      return `On Stand Gate ${gateNum} · Chocks in Place`;
    case 'disembarking':
      return `Deplaning: ${ac.paxTotal - ac.paxOnboard}/${ac.paxTotal} pax cleared`;
    case 'unloading':
      return `Baggage Ops: ${ac.bagsUnloaded}/${ac.bagsTotal} containers offloaded`;
    case 'servicing':
      return `Turnaround: Bowser Refuel ${ac.fuelPercent}% · Cabin Clean`;
    case 'boarding':
      return `Boarding Gate ${gateNum}: ${ac.paxOnboard}/${ac.paxDepartingTotal} pax aboard`;
    case 'pushback_prep':
      return 'Pushback Clearance Requested from Apron Control';
    case 'pushback_active':
      return `Towbarless Pushback & Engine Start (Gate ${gateNum})`;
    case 'taxi_out':
      return 'Taxiing via Alpha → Holding Point 09L';
    case 'holding_short_09L':
      return 'Holding Short Runway 09L · Awaiting Takeoff Clearance';
    case 'cleared_lineup':
      return 'Line Up and Wait Runway 09L';
    case 'takeoff_roll':
      return `Full Power Takeoff Roll 09L (${Math.round(ac.speedKts)} kts)`;
    case 'rotation_climb':
      return 'Airborne V2 · Positive Rate, Gear Up · Climb FL180';
    case 'departed':
      return 'Departed BLR Control · En Route';
  }
}

export function simAircraftToFlight(ac: SimAircraft, now: number): Flight {
  return {
    id: ac.id,
    flightNumber: ac.flightNumber,
    callsign: ac.callsign,
    airline: ac.airline,
    airlineColor: ac.airlineColor,
    airlineAccent: ac.airlineAccent,
    finDesign: ac.finDesign,
    aircraftType: ac.model,
    aircraftCategory: ac.category,
    registration: ac.registration,
    origin: ac.origin,
    originCode: ac.originCode,
    destination: ac.destination,
    destinationCode: ac.destinationCode,
    gate: ac.assignedGate,
    phase: mapSimPhaseToFlightPhase(ac.phase),
    t: ac.phaseTimer / 10,
    dur: {
      approach: 14,
      landing: 9,
      taxiIn: 13,
      disembark: 11,
      unload: 10,
      service: 11,
      board: 13,
      pushback: 9,
      taxiOut: 14,
      takeoff: 10,
    },
    paxTotal: ac.paxTotal,
    paxOnboard: ac.paxOnboard,
    paxDepartingTotal: ac.paxDepartingTotal,
    bagsTotal: ac.bagsTotal,
    bagsUnloaded: ac.bagsUnloaded,
    fuelPercent: ac.fuelPercent,
    cateringDone: ac.cateringComplete,
    cabinClean: ac.cleanComplete,
    pushbackReady: ac.pushbackComplete,
    stageAt: [now, null, null, null, null, null, null, null, null],
    statusText: ac.waitReason || getSimPhaseStatusText(ac),
    speedKnots: Math.round(ac.speedKts),
    altitudeMeters: Math.max(0, Math.round(ac.pos.y * 3.28)),
  };
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

let flightCounter = 501;

function generateRegistration(airlineCode: string): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const c1 = letters[randInt(0, letters.length - 1)];
  const c2 = letters[randInt(0, letters.length - 1)];
  const c3 = letters[randInt(0, letters.length - 1)];
  return `VT-${airlineCode}${c1}${c2}`;
}

function createFlight(site: SiteState, now: number): Flight {
  const airline = AIRLINES[randInt(0, AIRLINES.length - 1)];
  const model = AIRCRAFT_MODELS[randInt(0, AIRCRAFT_MODELS.length - 1)];
  const flightNum = `${airline.code}-${flightCounter++}`;
  const originDest = DESTINATIONS[randInt(0, DESTINATIONS.length - 1)];
  let dest = DESTINATIONS[randInt(0, DESTINATIONS.length - 1)];
  while (dest.code === originDest.code) {
    dest = DESTINATIONS[randInt(0, DESTINATIONS.length - 1)];
  }

  const paxTotal = randInt(Math.round(model.paxCapacity * 0.8), model.paxCapacity);
  const paxDepartingTotal = randInt(Math.round(model.paxCapacity * 0.82), model.paxCapacity);
  const bagsTotal = randInt(Math.round(paxTotal * 1.15), Math.round(paxTotal * 1.45));

  return {
    id: flightNum,
    flightNumber: flightNum,
    callsign: `${airline.callsign} ${flightNum.split('-')[1]}`,
    airline: airline.name,
    airlineColor: airline.primaryColor,
    airlineAccent: airline.accentColor,
    finDesign: airline.finDesign,
    aircraftType: model.model,
    aircraftCategory: model.category,
    registration: generateRegistration(airline.code),
    origin: originDest.city,
    originCode: originDest.code,
    destination: dest.city,
    destinationCode: dest.code,
    gate: null,
    phase: 'approaching',
    t: 0,
    dur: {
      approach: 14,
      landing: 9,
      taxiIn: 13,
      disembark: 11,
      unload: 10,
      service: 11,
      board: 13,
      pushback: 9,
      taxiOut: 14,
      takeoff: 10,
    },
    paxTotal,
    paxOnboard: paxTotal,
    paxDepartingTotal,
    bagsTotal,
    bagsUnloaded: 0,
    fuelPercent: randInt(22, 38),
    cateringDone: false,
    cabinClean: false,
    pushbackReady: false,
    stageAt: [now, null, null, null, null, null, null, null, null],
    statusText: 'ILS Cat-III Final Approach (09L)',
    speedKnots: 142,
    altitudeMeters: 480,
  };
}

function freeGate(site: SiteState): GateStand | undefined {
  return site.gates.find((g) => !g.maintenance && !g.flightId);
}

function addEvent(site: SiteState, category: AirportEvent['category'], message: string, level: AirportEvent['level'] = 'info') {
  const d = new Date();
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  site.events.unshift({
    id: `ev-${Date.now()}-${Math.random()}`,
    time: timeStr,
    category,
    message,
    level,
  });
  if (site.events.length > 50) site.events.pop();
}

function seedAirport(seed: AirportSeed): SiteState {
  const now = Date.now();
  const gateLabels = ['201', '202', '203', '204'];
  const gates: GateStand[] = Array.from({ length: seed.gates }, (_, idx) => ({
    idx,
    gateNumber: gateLabels[idx] ?? `20${idx + 1}`,
    maintenance: false,
    flightId: null,
    jetbridgeConnected: false,
  }));

  const vehicles: GroundVehicle[] = [];
  for (let g = 0; g < seed.gates; g++) {
    vehicles.push({
      id: `BLR-TUG-0${g + 1}`,
      type: 'pushback',
      gate: g,
      status: 'idle',
      progress: 0,
      battery: randInt(75, 98),
      tasksCompleted: randInt(8, 26),
    });
    vehicles.push({
      id: `BLR-BAG-0${g + 1}`,
      type: 'baggage',
      gate: g,
      status: 'idle',
      progress: 0,
      battery: randInt(72, 94),
      tasksCompleted: randInt(12, 32),
    });
    vehicles.push({
      id: `BLR-CAT-0${g + 1}`,
      type: 'catering',
      gate: g,
      status: 'idle',
      progress: 0,
      battery: randInt(85, 100),
      tasksCompleted: randInt(6, 18),
    });
  }

  const site: SiteState = {
    id: seed.id,
    name: seed.name,
    code: seed.code,
    icao: seed.icao,
    city: seed.city,
    gates,
    flights: [],
    vehicles,
    flightsHandled: seed.delivered,
    onTimeFlights: seed.onTime,
    passengersInTransit: 1420,
    totalPassengersToday: seed.delivered * 195,
    runwayOccupied: null,
    weather: seed.weather,
    paxHistory: Array.from({ length: 30 }, (_, i) => 1200 + Math.sin(i / 3) * 220 + rand(-40, 40)),
    otdHistory: Array.from({ length: 30 }, () => (seed.onTime / seed.delivered) * 100 + rand(-0.8, 0.8)),
    spawnTimer: 4,
    events: [],
  };

  if (seed.id === 'blr') {
    site.flights = simEngine.aircraft.map((ac) => simAircraftToFlight(ac, now));
    site.runwayOccupied = simEngine.atc.runwayOccupiedBy;
    for (const ac of simEngine.aircraft) {
      if (ac.assignedGate < gates.length) {
        const isParked = ['parked_at_gate', 'disembarking', 'unloading', 'servicing', 'boarding'].includes(ac.phase);
        gates[ac.assignedGate].flightId = isParked ? ac.id : null;
        gates[ac.assignedGate].jetbridgeConnected = isParked;
      }
    }
    addEvent(site, 'atc', 'BLR-Tower: Runway 09L Active. Wind 090/09 kts. QNH 1014 hPa.', 'info');
    addEvent(site, 'gate', 'Gate 201: Dual aerobridges docked to Emirates A380 (Deplaning).', 'success');
    addEvent(site, 'gate', 'Gate 202: Air India A350 boarding for London Heathrow.', 'info');
    addEvent(site, 'atc', 'IndiGo A321neo established on ILS 09L glide path.', 'info');
  } else {
    // Fallback for secondary sites
    const gateA = gates[0];
    const flightA = createFlight(site, now);
    flightA.airline = 'Emirates';
    flightA.airlineColor = '#d71920';
    flightA.airlineAccent = '#bda066';
    flightA.finDesign = 'emirates';
    flightA.aircraftType = 'Airbus A380-800';
    flightA.aircraftCategory = 'super';
    flightA.registration = 'A6-EEO';
    flightA.origin = 'Dubai';
    flightA.originCode = 'DXB';
    flightA.destination = 'Dubai';
    flightA.destinationCode = 'DXB';
    flightA.flightNumber = 'EK-568';
    flightA.gate = gateA.idx;
    gateA.flightId = flightA.id;
    gateA.jetbridgeConnected = true;
    flightA.phase = 'disembarking';
    flightA.t = 0.40;
    flightA.paxOnboard = Math.round(flightA.paxTotal * 0.45);
    flightA.statusText = `Deplaning at Gate ${gateA.gateNumber}`;
    flightA.speedKnots = 0;
    flightA.altitudeMeters = 0;
    site.flights.push(flightA);
    addEvent(site, 'atc', 'Tower: Runway Active. Wind 090/09 kts. QNH 1014 hPa.', 'info');
  }

  return site;
}

export const useWT = create<Store>()(
  immer((set, get) => ({
    sites: Object.fromEntries(SITES.map((s) => [s.id, seedAirport(s)])),
    siteOrder: SITES.map((s) => s.id),
    activeSiteId: 'blr',
    selection: { kind: 'site' },
    simSpeed: 1,
    isPaused: false,
    clock: 0,
    timeOfDay: 'day',
    cameraPreset: 'overview',
    debugOverlay: false,

    toggleDebugOverlay: () =>
      set((s) => {
        s.debugOverlay = !s.debugOverlay;
      }),

    setActiveSite: (id) =>
      set((s) => {
        s.activeSiteId = id;
        s.selection = { kind: 'site' };
      }),

    select: (sel) =>
      set((s) => {
        s.selection = sel;
      }),

    setSimSpeed: (speed) =>
      set((s) => {
        s.simSpeed = speed;
      }),

    togglePause: () =>
      set((s) => {
        s.isPaused = !s.isPaused;
      }),

    setTimeOfDay: (tod) =>
      set((s) => {
        s.timeOfDay = tod;
      }),

    setCameraPreset: (preset) =>
      set((s) => {
        s.cameraPreset = preset;
      }),

    forceSpawnFlight: () =>
      set((s) => {
        const site = s.sites[s.activeSiteId];
        const flight = createFlight(site, Date.now());
        const gate = freeGate(site);
        if (gate) {
          flight.gate = gate.idx;
          gate.flightId = flight.id;
          addEvent(site, 'atc', `ATC: Cleared ${flight.flightNumber} inbound, assigned Gate ${gate.gateNumber} (T2).`, 'info');
        }
        site.flights.push(flight);
      }),

    tick: (rawDt) =>
      set((state) => {
        if (state.isPaused) return;

        const dt = rawDt * state.simSpeed;
        state.clock += dt;
        const now = Date.now();

        for (const siteId of state.siteOrder) {
          const site = state.sites[siteId];

          // -------------------- KEMPEGOWDA BLR: DIRECT SIMULATION ENGINE SYNC --------------------
          if (siteId === 'blr') {
            simEngine.isPaused = state.isPaused;
            simEngine.simSpeed = state.simSpeed;
            // Only tick simEngine in headless/test environments where Canvas useFrame is not running
            if (typeof window === 'undefined') {
              simEngine.tick(rawDt);
            }

            site.runwayOccupied = simEngine.atc.runwayOccupiedBy;

            // Gate occupancy & jetbridge state
            for (const g of site.gates) {
              const gId = `GATE_20${g.idx + 1}`;
              const occupantId = simEngine.atc.gateOccupancy.get(gId) ?? null;
              g.flightId = occupantId;
              if (occupantId) {
                const occupant = simEngine.aircraft.find((a) => a.id === occupantId);
                g.jetbridgeConnected = occupant
                  ? ['parked_at_gate', 'disembarking', 'unloading', 'servicing', 'boarding'].includes(occupant.phase)
                  : false;
              } else {
                g.jetbridgeConnected = false;
              }
            }

            // Sync simulated aircraft
            const currentIds = new Set(simEngine.aircraft.map((a) => a.id));
            const existingMap = new Map(site.flights.map((f) => [f.id, f]));

            for (const ac of simEngine.aircraft) {
              const f = existingMap.get(ac.id);
              const mappedPhase = mapSimPhaseToFlightPhase(ac.phase);
              if (!f) {
                const newF = simAircraftToFlight(ac, now);
                site.flights.push(newF);
                addEvent(site, 'atc', `ATC: ${ac.callsign} inbound from ${ac.originCode}, assigned Gate 20${ac.assignedGate + 1}`, 'info');
              } else {
                if (f.phase !== mappedPhase) {
                  f.phase = mappedPhase;
                  if (mappedPhase === 'landing') {
                    addEvent(site, 'atc', `${ac.flightNumber} TOUCHDOWN Runway 09L. Reverse thrust active.`, 'success');
                  } else if (mappedPhase === 'taxi_in') {
                    addEvent(site, 'atc', `${ac.flightNumber} vacated via Exit Bravo. Taxi to Gate 20${ac.assignedGate + 1}.`, 'info');
                  } else if (mappedPhase === 'parked') {
                    addEvent(site, 'gate', `${ac.flightNumber} ON STAND Gate 20${ac.assignedGate + 1}. VDGS docked, jetbridge connected.`, 'success');
                  } else if (mappedPhase === 'disembarking') {
                    addEvent(site, 'ops', `${ac.flightNumber}: Doors disarmed. Passenger deplaning via Aerobridge 1 & 2.`, 'info');
                  } else if (mappedPhase === 'unloading') {
                    addEvent(site, 'ops', `${ac.flightNumber}: Cabin cleared. Baggage container dollies unloading.`, 'info');
                  } else if (mappedPhase === 'servicing') {
                    addEvent(site, 'ground', `${ac.flightNumber}: Bowser fuel connected. Catering scissor lift active.`, 'info');
                  } else if (mappedPhase === 'boarding') {
                    addEvent(site, 'gate', `Gate 20${ac.assignedGate + 1}: NOW BOARDING ${ac.flightNumber} to ${ac.destination} (${ac.destinationCode}).`, 'info');
                  } else if (mappedPhase === 'pushback') {
                    addEvent(site, 'ground', `Pushback tug latched to ${ac.flightNumber}. Ground headset: cleared for pushback.`, 'info');
                  } else if (mappedPhase === 'taxi_out') {
                    addEvent(site, 'atc', `${ac.flightNumber} pushback complete. Taxi to Runway 09L holding point via Alpha.`, 'info');
                  } else if (mappedPhase === 'runway_entry') {
                    addEvent(site, 'atc', `${ac.flightNumber} line up and wait Runway 09L.`, 'info');
                  } else if (mappedPhase === 'takeoff') {
                    addEvent(site, 'atc', `${ac.flightNumber} CLEARED FOR TAKEOFF Runway 09L! Full power roll.`, 'success');
                  }
                }
                f.speedKnots = Math.round(ac.speedKts);
                f.altitudeMeters = Math.max(0, Math.round(ac.pos.y * 3.28));
                f.paxOnboard = ac.paxOnboard;
                f.bagsUnloaded = ac.bagsUnloaded;
                f.fuelPercent = ac.fuelPercent;
                f.cateringDone = ac.cateringComplete;
                f.cabinClean = ac.cleanComplete;
                f.pushbackReady = ac.pushbackComplete;
                f.gate = ac.assignedGate;
                f.statusText = ac.waitReason || getSimPhaseStatusText(ac);
              }
            }

            // Remove departed aircraft
            const departing = site.flights.filter((f) => !currentIds.has(f.id));
            if (departing.length > 0) {
              for (const dep of departing) {
                site.flightsHandled += 1;
                site.onTimeFlights += 1;
                addEvent(site, 'atc', `${dep.callsign} AIRBORNE. Contact Bengaluru Radar on 119.75. Safe flight!`, 'success');
              }
              site.flights = site.flights.filter((f) => currentIds.has(f.id));
              if (state.selection.kind === 'flight') {
                const selId = state.selection.id;
                if (departing.some((d) => d.id === selId)) {
                  state.selection = { kind: 'site' };
                }
              }
            }

            // Update Ground Vehicles to match current turnaround
            for (const v of site.vehicles) {
              const ac = simEngine.aircraft.find((a) => a.assignedGate === v.gate);
              if (!ac) {
                v.status = 'idle';
              } else if (v.type === 'pushback') {
                v.status = ['pushback_prep', 'pushback_active'].includes(ac.phase) ? 'servicing' : 'idle';
              } else if (v.type === 'baggage') {
                v.status = ac.phase === 'unloading' ? 'servicing' : 'idle';
              } else if (v.type === 'catering') {
                v.status = ac.phase === 'servicing' ? 'servicing' : 'idle';
              }
            }

            continue;
          }

          // Auto-spawn incoming flights
          site.spawnTimer -= dt;
          if (site.spawnTimer <= 0 && site.flights.length < site.gates.length + 2) {
            const gate = freeGate(site);
            if (gate) {
              const newF = createFlight(site, now);
              newF.gate = gate.idx;
              gate.flightId = newF.id;
              site.flights.push(newF);
              addEvent(site, 'atc', `ATC: ${newF.callsign} inbound from ${newF.originCode}, assigned Gate ${gate.gateNumber}`, 'info');
              site.spawnTimer = rand(18, 28);
            }
          }

          // Evaluate runway occupancy
          const landingOrDeparting = site.flights.find((f) =>
            ['landing', 'takeoff', 'runway_entry'].includes(f.phase)
          );
          site.runwayOccupied = landingOrDeparting ? landingOrDeparting.flightNumber : null;

          const toRemove: string[] = [];

          for (const f of site.flights) {
            const gate = f.gate !== null ? site.gates[f.gate] : null;
            const gateNum = gate ? gate.gateNumber : 'TBD';
            const tug = site.vehicles.find((v) => v.gate === f.gate && v.type === 'pushback');
            const bagCart = site.vehicles.find((v) => v.gate === f.gate && v.type === 'baggage');
            const caterVan = site.vehicles.find((v) => v.gate === f.gate && v.type === 'catering');

            switch (f.phase) {
              case 'approaching': {
                f.speedKnots = 142;
                f.altitudeMeters = Math.max(10, Math.round(520 * (1 - f.t)));
                f.t += dt / f.dur.approach;
                f.statusText = `Final Approach 09L (${Math.round((1 - f.t) * 4.8)} NM)`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'landing';
                  f.stageAt[1] = now;
                  f.altitudeMeters = 0;
                  f.speedKnots = 128;
                  addEvent(site, 'atc', `${f.flightNumber} TOUCHDOWN Runway 09L. Reverse thrust active.`, 'success');
                }
                break;
              }

              case 'landing': {
                f.speedKnots = Math.max(26, Math.round(128 * (1 - f.t * 0.78)));
                f.t += dt / f.dur.landing;
                f.statusText = 'Runway Deceleration / Rapid Exit Vacating';

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'taxi_in';
                  f.stageAt[2] = now;
                  f.speedKnots = 18;
                  addEvent(site, 'atc', `${f.flightNumber} vacated via Rapid Exit, contact Ground 121.90. Taxi to Gate ${gateNum}.`, 'info');
                }
                break;
              }

              case 'taxi_in': {
                f.speedKnots = 15;
                f.t += dt / f.dur.taxiIn;
                f.statusText = `Taxiing via Alpha → Gate ${gateNum}`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'parked';
                  f.speedKnots = 0;
                  if (gate) gate.jetbridgeConnected = true;
                  addEvent(site, 'gate', `${f.flightNumber} ON STAND Gate ${gateNum} (T2). VDGS docking verified.`, 'success');
                }
                break;
              }

              case 'parked': {
                f.statusText = `On Stand Gate ${gateNum} · Chocks in Place`;
                f.t += dt / 3;
                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'disembarking';
                  f.stageAt[3] = now;
                  if (bagCart) bagCart.status = 'driving_to_gate';
                  addEvent(site, 'ops', `${f.flightNumber}: Doors disarmed. Passenger deplaning via Aerobridge 1 & 2.`, 'info');
                }
                break;
              }

              case 'disembarking': {
                f.t += dt / f.dur.disembark;
                const paxLeft = Math.max(0, Math.round(f.paxTotal * (1 - f.t)));
                const deplanedThisTick = f.paxOnboard - paxLeft;
                if (deplanedThisTick > 0) {
                  site.passengersInTransit += deplanedThisTick;
                  site.totalPassengersToday += deplanedThisTick;
                }
                f.paxOnboard = paxLeft;
                f.statusText = `Deplaning: ${f.paxTotal - f.paxOnboard}/${f.paxTotal} pax cleared`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'unloading';
                  f.paxOnboard = 0;
                  f.stageAt[4] = now;
                  if (bagCart) bagCart.status = 'servicing';
                  addEvent(site, 'ops', `${f.flightNumber}: Cabin empty. Baggage container dollies unloading.`, 'info');
                }
                break;
              }

              case 'unloading': {
                f.t += dt / f.dur.unload;
                f.bagsUnloaded = Math.min(f.bagsTotal, Math.round(f.bagsTotal * f.t));
                f.statusText = `Baggage Ops: ${f.bagsUnloaded}/${f.bagsTotal} containers to arrival belt`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'servicing';
                  f.bagsUnloaded = f.bagsTotal;
                  if (bagCart) {
                    bagCart.status = 'returning';
                    bagCart.tasksCompleted += 1;
                  }
                  if (caterVan) caterVan.status = 'servicing';
                  addEvent(site, 'ground', `${f.flightNumber}: Baggage offloaded. Fuel bowser and catering connected.`, 'info');
                }
                break;
              }

              case 'servicing': {
                f.t += dt / f.dur.service;
                f.fuelPercent = Math.min(100, Math.round(35 + f.t * 65));
                if (f.t > 0.6) f.cateringDone = true;
                if (f.t > 0.8) f.cabinClean = true;
                f.statusText = `Turnaround: Fuel ${f.fuelPercent}% · Cabin Cleaned`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'boarding';
                  f.stageAt[5] = now;
                  f.cateringDone = true;
                  f.cabinClean = true;
                  if (caterVan) {
                    caterVan.status = 'returning';
                    caterVan.tasksCompleted += 1;
                  }
                  addEvent(site, 'gate', `Gate ${gateNum}: NOW BOARDING ${f.flightNumber} to ${f.destination} (${f.destinationCode}).`, 'info');
                }
                break;
              }

              case 'boarding': {
                f.t += dt / f.dur.board;
                const boardingPax = Math.min(f.paxDepartingTotal, Math.round(f.paxDepartingTotal * f.t));
                f.paxOnboard = boardingPax;
                f.statusText = `Boarding Gate ${gateNum}: ${f.paxOnboard}/${f.paxDepartingTotal} pax aboard`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'pushback';
                  f.stageAt[6] = now;
                  f.paxOnboard = f.paxDepartingTotal;
                  f.pushbackReady = true;
                  if (gate) gate.jetbridgeConnected = false;
                  if (tug) tug.status = 'servicing';
                  addEvent(site, 'gate', `${f.flightNumber}: All passengers aboard. Jetbridge retracted, doors armed.`, 'success');
                  addEvent(site, 'ground', `Pushback tug latched to ${f.flightNumber}. Ground headset: cleared for pushback.`, 'info');
                }
                break;
              }

              case 'pushback': {
                f.speedKnots = 4;
                f.t += dt / f.dur.pushback;
                f.statusText = `Pushback & Engine Start from Gate ${gateNum}`;

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'taxi_out';
                  f.stageAt[7] = now;
                  f.speedKnots = 14;
                  if (gate) gate.flightId = null;
                  if (tug) {
                    tug.status = 'returning';
                    tug.tasksCompleted += 1;
                  }
                  addEvent(site, 'atc', `${f.flightNumber} pushback complete, pin removed. Taxi to Runway 09L holding point via Alpha.`, 'info');
                }
                break;
              }

              case 'taxi_out': {
                f.speedKnots = 16;
                f.t += dt / f.dur.taxiOut;
                f.statusText = 'Taxiing via Alpha → Holding Point 09L';

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'runway_entry';
                  f.speedKnots = 8;
                  addEvent(site, 'atc', `${f.flightNumber} line up and wait Runway 09L. Wind 090/09 kts. CLEARED FOR TAKEOFF!`, 'success');
                }
                break;
              }

              case 'runway_entry': {
                f.speedKnots = 12;
                f.t += dt / 3.5;
                f.statusText = 'Lining up on Runway 09L Centerline';

                if (f.t >= 1) {
                  f.t = 0;
                  f.phase = 'takeoff';
                  f.stageAt[8] = now;
                  f.speedKnots = 45;
                }
                break;
              }

              case 'takeoff': {
                f.speedKnots = Math.round(45 + f.t * 155);
                if (f.t > 0.38) {
                  f.altitudeMeters = Math.round((f.t - 0.38) * 950);
                }
                f.t += dt / f.dur.takeoff;
                f.statusText = f.t > 0.38 ? 'V2 Airborne · Positive Rate, Gear Up' : 'Full Power Takeoff Roll Runway 09L';

                if (f.t >= 1) {
                  f.phase = 'departed';
                  site.flightsHandled += 1;
                  site.onTimeFlights += 1;
                  addEvent(site, 'atc', `${f.callsign} AIRBORNE. Contact Bengaluru Radar on 119.75. Safe flight!`, 'success');
                  toRemove.push(f.id);
                }
                break;
              }
            }
          }

          if (toRemove.length > 0) {
            site.flights = site.flights.filter((f) => !toRemove.includes(f.id));
            if (state.selection.kind === 'flight' && toRemove.includes(state.selection.id)) {
              state.selection = { kind: 'site' };
            }
          }

          if (Math.floor(state.clock) % 10 === 0 && Math.floor(state.clock - dt) % 10 !== 0) {
            const currentOtd = site.flightsHandled > 0 ? (site.onTimeFlights / site.flightsHandled) * 100 : 96.5;
            site.otdHistory.push(currentOtd);
            if (site.otdHistory.length > 30) site.otdHistory.shift();

            site.paxHistory.push(site.passengersInTransit);
            if (site.paxHistory.length > 30) site.paxHistory.shift();
          }
        }
      }),
  }))
);

export function useActiveSite(): SiteState {
  return useWT((s) => s.sites[s.activeSiteId]);
}
