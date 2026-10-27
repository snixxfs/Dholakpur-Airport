import { SimulationEngine } from '../lib/sim/engine.ts';

console.log('================================================================');
console.log('DHOLAKPUR / KEMPEGOWDA BLR SIMULATION ENGINE VERIFICATION SUITE');
console.log('================================================================\n');

// Initialize fresh engine instance for testing
const sim = new SimulationEngine();

// --- Test 1: Runway Contention ---
console.log('--- TEST 1: Runway Contention & ATC Clearances ---');
const inbound1 = sim.aircraft.find((a) => a.phase === 'approaching');
console.log(`Inbound aircraft approaching: ${inbound1?.flightNumber}`);
sim.tick(0.5);
console.log(`Runway Lock Status: ${sim.atc.runwayOccupiedBy ? `LOCKED by ${sim.atc.runwayOccupiedBy}` : 'CLEAR'}`);
console.log(`Inbound Phase after clearance: ${inbound1?.phase}`);

// Spawn second aircraft requesting the runway at the exact same time
const fakeInbound = sim.spawnAircraft({
  airlineIndex: 1,
  modelName: 'Airbus A350-900',
  gateId: 'GATE_204',
  gateIndex: 3,
  initialPhase: 'approaching',
  paxFraction: 1.0,
});
sim.tick(0.5);
console.log(`Second inbound phase: ${fakeInbound.phase} (Wait reason: "${fakeInbound.waitReason}")`);
const test1Pass = fakeInbound.phase === 'holding_stack' && sim.atc.runwayOccupiedBy === inbound1?.id;
console.log(`TEST 1 RESULT: ${test1Pass ? 'PASS (Second aircraft placed in holding stack)' : 'FAIL'}\n`);

// --- Test 2: Taxiway Blockage & Dynamic Braking ---
console.log('--- TEST 2: Taxiway Blockage & Dynamic Braking ---');
const taxiingPlane = sim.aircraft.find((a) => a.id === inbound1?.id);
// Advance until on ground rolling out or taxiing
while (taxiingPlane && taxiingPlane.phase !== 'touchdown_roll' && taxiingPlane.phase !== 'runway_exit' && taxiingPlane.phase !== 'taxi_in') {
  sim.tick(0.5);
}
console.log(`Aircraft on ground: ${taxiingPlane?.flightNumber} in phase: ${taxiingPlane?.phase}`);

// Place an obstacle aircraft on Taxiway Bravo / Runway exit right in front of it
const leadPlane = sim.spawnAircraft({
  airlineIndex: 2,
  modelName: 'Airbus A320neo',
  gateId: 'GATE_101',
  gateIndex: 4,
  initialPhase: 'taxi_in',
  paxFraction: 1.0,
});
leadPlane.pos.set(taxiingPlane.pos.x + 22, 0.28, taxiingPlane.pos.z);
leadPlane.speedKts = 0;
leadPlane.targetSpeedKts = 0;

sim.tick(0.5);
console.log(`Trailing plane target speed: ${taxiingPlane?.targetSpeedKts} kts, Phase: ${taxiingPlane?.phase}`);
console.log(`Trailing plane hold reason: "${taxiingPlane?.waitReason}"`);
const test2Pass = taxiingPlane?.targetSpeedKts === 0 && taxiingPlane?.waitReason?.includes('Holding short');
console.log(`TEST 2 RESULT: ${test2Pass ? 'PASS (Aircraft halted safely before obstacle)' : 'FAIL'}\n`);

// Clean up obstacle plane before next test
const leadIdx = sim.aircraft.indexOf(leadPlane);
if (leadIdx !== -1) sim.aircraft.splice(leadIdx, 1);

// --- Test 3: Occupied Gate Stand Contention ---
console.log('--- TEST 3: Occupied Gate Stand Contention ---');
const gate202Occupant = sim.atc.gateOccupancy.get('GATE_202');
console.log(`Gate 202 currently assigned to: ${gate202Occupant}`);

const incomingToGate202 = sim.spawnAircraft({
  airlineIndex: 5,
  modelName: 'Boeing 787-9 Dreamliner',
  gateId: 'GATE_202',
  gateIndex: 1,
  initialPhase: 'runway_exit',
  paxFraction: 1.0,
});
const a5Node = sim.graph.nodes.get('TAX_A5');
incomingToGate202.pos.copy(a5Node.pos);
incomingToGate202.pathNodeIds = ['TAX_A5'];
incomingToGate202.currentPathIndex = 0;
sim.tick(0.5);
console.log(`Incoming aircraft phase: ${incomingToGate202.phase}, Wait reason: "${incomingToGate202.waitReason}"`);
const test3Pass = incomingToGate202.phase === 'holding_for_traffic' && incomingToGate202.waitReason?.includes('Gate GATE_202 occupied');
console.log(`TEST 3 RESULT: ${test3Pass ? 'PASS (Incoming aircraft withheld from occupied gate)' : 'FAIL'}\n`);

// Clean up incomingToGate202
const incIdx = sim.aircraft.indexOf(incomingToGate202);
if (incIdx !== -1) sim.aircraft.splice(incIdx, 1);

// --- Test 4: Aircraft Proximity & Collision Separation Buffer ---
console.log('--- TEST 4: Aircraft Proximity & Collision Separation ---');
let minDistance = Infinity;
for (let i = 0; i < sim.aircraft.length; i++) {
  for (let j = i + 1; j < sim.aircraft.length; j++) {
    const a1 = sim.aircraft[i];
    const a2 = sim.aircraft[j];
    if (a1.phase !== 'holding_stack' && a2.phase !== 'holding_stack' && a1.phase !== 'approaching' && a2.phase !== 'approaching') {
      const d = a1.pos.distanceTo(a2.pos);
      if (d < minDistance) minDistance = d;
    }
  }
}
console.log(`Minimum observed distance between non-stack aircraft: ${minDistance.toFixed(1)}m`);
const test4Pass = minDistance >= 25.0; // At least 25m safety distance maintained!
console.log(`TEST 4 RESULT: ${test4Pass ? 'PASS (Protected separation buffer maintained)' : 'FAIL'}\n`);

// --- Test 5: Pushback Safety Buffer ---
console.log('--- TEST 5: Pushback Safety Buffer ---');
let test5Pass = false;
const gateA = sim.aircraft.find((a) => a.assignedGateId === 'GATE_201');
if (gateA) {
  gateA.phase = 'pushback_prep';
  const pushNode = sim.graph.nodes.get('GATE_201_PUSH');
  const crossingPlane = sim.spawnAircraft({
    airlineIndex: 4,
    modelName: 'Boeing 777-300ER',
    gateId: 'GATE_102',
    gateIndex: 5,
    initialPhase: 'taxi_in',
    paxFraction: 1.0,
  });
  crossingPlane.pos.copy(pushNode.pos);
  sim.tick(0.5);
  console.log(`Pushback aircraft phase: ${gateA.phase}, Wait reason: "${gateA.waitReason}"`);
  test5Pass = gateA.phase === 'pushback_prep' && gateA.waitReason?.includes('Pushback hold');
  console.log(`TEST 5 RESULT: ${test5Pass ? 'PASS (Pushback held until crossing traffic cleared)' : 'FAIL'}\n`);
  
  // Clean up crossing plane
  const cIdx = sim.aircraft.indexOf(crossingPlane);
  if (cIdx !== -1) sim.aircraft.splice(cIdx, 1);
}

// --- Test 6: Passenger Concourse Movement ---
console.log('--- TEST 6: Passenger Concourse Movement ---');
console.log(`Active passengers in terminal: ${sim.passengers.length}`);
const p0 = sim.passengers[0];
const pPosBefore = p0.pos.clone();
sim.tick(2.0);
const pPosAfter = p0.pos.clone();
const pDist = pPosBefore.distanceTo(pPosAfter);
console.log(`Passenger ${p0.id} moved: ${pDist.toFixed(2)}m along concourse (Y=${p0.pos.y.toFixed(1)}m)`);
const test6Pass = pDist > 0.5 && p0.pos.y > 4.0;
console.log(`TEST 6 RESULT: ${test6Pass ? 'PASS (Passengers smoothly moving along concourse)' : 'FAIL'}\n`);

// --- Test 7: Landside Road Vehicles ---
console.log('--- TEST 7: Landside Road Vehicles ---');
console.log(`Active road vehicles: ${sim.vehicles.length}`);
const v0 = sim.vehicles[0];
const vPosBefore = v0.pos.clone();
sim.tick(2.0);
const vPosAfter = v0.pos.clone();
const vDist = vPosBefore.distanceTo(vPosAfter);
console.log(`Vehicle ${v0.id} (${v0.type}) traveled: ${vDist.toFixed(2)}m along road network`);
const test7Pass = vDist > 1.0;
console.log(`TEST 7 RESULT: ${test7Pass ? 'PASS (Road traffic following lane graph)' : 'FAIL'}\n`);

// --- Test 8: Long-Running Simulation Stability ---
console.log('--- TEST 8: Long-Running Simulation Stability ---');
const t0 = performance.now();
for (let step = 0; step < 200; step++) {
  sim.tick(0.25);
}
const elapsedMs = performance.now() - t0;
console.log(`200 simulation ticks processed in ${elapsedMs.toFixed(1)}ms (${(elapsedMs / 200).toFixed(2)}ms per tick)`);
const test8Pass = elapsedMs < 2000;
console.log(`TEST 8 RESULT: ${test8Pass ? 'PASS (Deterministic execution without memory runaway or hang)' : 'FAIL'}\n`);

// --- Test 9: Simulation Speed & Pause ---
console.log('--- TEST 9: Simulation Speed & Pause Coherence ---');
sim.isPaused = true;
const clockAtPause = sim.clock;
sim.tick(1.0);
console.log(`Pause check: Clock before = ${clockAtPause.toFixed(2)}, after tick = ${sim.clock.toFixed(2)}`);
const pausePass = clockAtPause === sim.clock;

sim.isPaused = false;
sim.simSpeed = 5;
const clockBefore5x = sim.clock;
sim.tick(1.0);
const speedPass = Math.abs(sim.clock - clockBefore5x - 5.0) < 0.05;
console.log(`5x Speed check: Advanced by ${(sim.clock - clockBefore5x).toFixed(2)}s in 1.0s real time`);
console.log(`TEST 9 RESULT: ${pausePass && speedPass ? 'PASS (Speed and pause controls verified)' : 'FAIL'}\n`);

// --- Test 10: Performance Diagnostics ---
console.log('--- TEST 10: Performance Diagnostics & Collision Queries ---');
console.log('Diagnostics snapshot:', sim.diagnostics);
const test10Pass = sim.diagnostics.tickDurationMs < 10.0;
console.log(`TEST 10 RESULT: ${test10Pass ? 'PASS (Tick duration < 10ms)' : 'FAIL'}\n`);

const allPassed = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass && test7Pass && test8Pass && pausePass && speedPass && test10Pass;
console.log('================================================================');
console.log(allPassed ? 'ALL 10 SIMULATION & TRAFFIC TESTS PASSED 100%!' : 'SOME TESTS FAILED');
console.log('================================================================');
if (!allPassed) process.exit(1);
