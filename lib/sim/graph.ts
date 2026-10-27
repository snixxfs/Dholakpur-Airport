import * as THREE from 'three';

export interface GraphNode {
  id: string;
  pos: THREE.Vector3;
  type: 'runway' | 'taxiway' | 'holding' | 'gate' | 'service_road' | 'landside_road' | 'pedestrian';
  label?: string;
  gateIndex?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  length: number;
  width: number;
  direction: 'one_way' | 'two_way';
  speedLimitKts: number;
  // Dynamic occupancy lock
  reservedBy: string | null;
}

export class AirportGraph {
  nodes = new Map<string, GraphNode>();
  edges = new Map<string, GraphEdge>();
  adjacency = new Map<string, string[]>(); // nodeId -> edgeIds

  addNode(id: string, x: number, y: number, z: number, type: GraphNode['type'], label?: string, gateIndex?: number): GraphNode {
    const node: GraphNode = {
      id,
      pos: new THREE.Vector3(x, y, z),
      type,
      label,
      gateIndex,
    };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }
    return node;
  }

  addEdge(id: string, fromId: string, toId: string, width = 18, direction: 'one_way' | 'two_way' = 'one_way', speedLimitKts = 20): GraphEdge | null {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return null;

    const length = fromNode.pos.distanceTo(toNode.pos);
    const edge: GraphEdge = {
      id,
      from: fromId,
      to: toId,
      length,
      width,
      direction,
      speedLimitKts,
      reservedBy: null,
    };
    this.edges.set(id, edge);

    this.adjacency.get(fromId)?.push(id);
    if (direction === 'two_way') {
      this.adjacency.get(toId)?.push(id);
    }
    return edge;
  }

  getNeighbors(nodeId: string): { node: GraphNode; edge: GraphEdge }[] {
    const edgeIds = this.adjacency.get(nodeId) || [];
    const results: { node: GraphNode; edge: GraphEdge }[] = [];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (!edge) continue;
      const targetId = edge.from === nodeId ? edge.to : edge.from;
      const targetNode = this.nodes.get(targetId);
      if (targetNode) {
        results.push({ node: targetNode, edge });
      }
    }
    return results;
  }

  // A* Shortest Path Finding
  findPath(startId: string, goalId: string, excludeReservedBy?: string): string[] | null {
    const start = this.nodes.get(startId);
    const goal = this.nodes.get(goalId);
    if (!start || !goal) return null;

    const openSet = new Set<string>([startId]);
    const cameFrom = new Map<string, { prevNodeId: string; edgeId: string }>();

    const gScore = new Map<string, number>();
    gScore.set(startId, 0);

    const fScore = new Map<string, number>();
    fScore.set(startId, start.pos.distanceTo(goal.pos));

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let currentId = '';
      let lowestF = Infinity;
      for (const id of openSet) {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      }

      if (currentId === goalId) {
        // Reconstruct path of node IDs
        const path = [goalId];
        let curr = goalId;
        while (cameFrom.has(curr)) {
          const { prevNodeId } = cameFrom.get(curr)!;
          path.unshift(prevNodeId);
          curr = prevNodeId;
        }
        return path;
      }

      openSet.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;

      for (const { node: neighbor, edge } of this.getNeighbors(currentId)) {
        // Check if edge is reserved by another vehicle
        if (edge.reservedBy && edge.reservedBy !== excludeReservedBy) {
          continue; // Blocked segment
        }

        const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.length;
        if (tentativeG < (gScore.get(neighbor.id) ?? Infinity)) {
          cameFrom.set(neighbor.id, { prevNodeId: currentId, edgeId: edge.id });
          gScore.set(neighbor.id, tentativeG);
          fScore.set(neighbor.id, tentativeG + neighbor.pos.distanceTo(goal.pos));
          openSet.add(neighbor.id);
        }
      }
    }

    return null; // No route found
  }
}

// Build the complete Kempegowda BLR Airfield & Road Graph
export function createKempegowdaGraph(): AirportGraph {
  const g = new AirportGraph();

  /* ================= 1. RUNWAY 09L / 27R (Z = 88, Length = 500m) ================= */
  g.addNode('RWY_APP_09L', -320, 65, 88, 'runway', '3° Glideslope Outer Marker');
  g.addNode('RWY_THR_09L', -225, 0.28, 88, 'runway', 'Threshold 09L');
  g.addNode('RWY_TDZ_09L', -130, 0.28, 88, 'runway', 'Touchdown Zone 09L');
  g.addNode('RWY_MID', 0, 0.28, 88, 'runway', 'Runway Center');
  g.addNode('RWY_EXIT_B', 60, 0.28, 88, 'runway', 'High-Speed Exit Bravo');
  g.addNode('RWY_EXIT_C', 150, 0.28, 88, 'runway', 'Rapid Exit Charlie');
  g.addNode('RWY_THR_27R', 225, 0.28, 88, 'runway', 'Threshold 27R');

  // Runway Edges
  g.addEdge('E_RWY_APP', 'RWY_APP_09L', 'RWY_THR_09L', 45, 'one_way', 145);
  g.addEdge('E_RWY_ROLL_1', 'RWY_THR_09L', 'RWY_TDZ_09L', 45, 'one_way', 130);
  g.addEdge('E_RWY_ROLL_2', 'RWY_TDZ_09L', 'RWY_MID', 45, 'one_way', 85);
  g.addEdge('E_RWY_ROLL_3', 'RWY_MID', 'RWY_EXIT_B', 45, 'one_way', 55);
  g.addEdge('E_RWY_ROLL_4', 'RWY_EXIT_B', 'RWY_EXIT_C', 45, 'one_way', 35);
  g.addEdge('E_RWY_ROLL_5', 'RWY_EXIT_C', 'RWY_THR_27R', 45, 'one_way', 20);

  /* ================= 2. TAXIWAY ALPHA & HIGH-SPEED EXITS (Z = 52) ================= */
  // Holding bay short of Runway 09L
  g.addNode('HOLD_09L', -175, 0.28, 72, 'holding', 'Hold Short RWY 09L');
  g.addNode('HOLD_09L_BAY', -195, 0.28, 52, 'holding', 'Holding Bay Alpha West');
  
  // Taxiway Alpha Segments
  g.addNode('TAX_A1', -170, 0.28, 52, 'taxiway', 'Taxiway A1');
  g.addNode('TAX_A2', -115, 0.28, 52, 'taxiway', 'Taxiway A2 (T1 Pier)');
  g.addNode('TAX_A3', -55, 0.28, 52, 'taxiway', 'Taxiway A3 (T2 West)');
  g.addNode('TAX_A4', 0, 0.28, 52, 'taxiway', 'Taxiway A4 (T2 Center)');
  g.addNode('TAX_A5', 55, 0.28, 52, 'taxiway', 'Taxiway A5 (T2 East)');
  g.addNode('TAX_A6', 115, 0.28, 52, 'taxiway', 'Taxiway A6 (Cargo)');
  g.addNode('TAX_A7', 170, 0.28, 52, 'taxiway', 'Taxiway A7 (East)');

  // Connect Runway Exits to Taxiway Alpha
  g.addNode('TAX_BRAVO', 55, 0.28, 70, 'taxiway', 'Rapid-Exit Bravo');
  g.addNode('TAX_CHARLIE', 145, 0.28, 70, 'taxiway', 'Rapid-Exit Charlie');
  g.addNode('TAX_ECHO', -175, 0.28, 80, 'taxiway', 'Turnoff Echo');

  // Runway exit connectors
  g.addEdge('E_EXIT_B', 'RWY_EXIT_B', 'TAX_BRAVO', 24, 'one_way', 30);
  g.addEdge('E_BRAVO_A5', 'TAX_BRAVO', 'TAX_A5', 24, 'one_way', 20);
  g.addEdge('E_EXIT_C', 'RWY_EXIT_C', 'TAX_CHARLIE', 24, 'one_way', 30);
  g.addEdge('E_CHARLIE_A6', 'TAX_CHARLIE', 'TAX_A6', 24, 'one_way', 20);

  // Lineup connector to 09L
  g.addEdge('E_HOLD_ECHO', 'HOLD_09L', 'TAX_ECHO', 24, 'one_way', 15);
  g.addEdge('E_ECHO_LINEUP', 'TAX_ECHO', 'RWY_THR_09L', 24, 'one_way', 15);

  // Taxiway Alpha continuous bidirectional segments
  g.addEdge('E_TA_WEST', 'HOLD_09L_BAY', 'HOLD_09L', 24, 'two_way', 18);
  g.addEdge('E_TA_HOLD_A1', 'HOLD_09L', 'TAX_A1', 24, 'two_way', 18);
  g.addEdge('E_TA_1_2', 'TAX_A1', 'TAX_A2', 24, 'two_way', 18);
  g.addEdge('E_TA_2_3', 'TAX_A2', 'TAX_A3', 24, 'two_way', 18);
  g.addEdge('E_TA_3_4', 'TAX_A3', 'TAX_A4', 24, 'two_way', 18);
  g.addEdge('E_TA_4_5', 'TAX_A4', 'TAX_A5', 24, 'two_way', 18);
  g.addEdge('E_TA_5_6', 'TAX_A5', 'TAX_A6', 24, 'two_way', 18);
  g.addEdge('E_TA_6_7', 'TAX_A6', 'TAX_A7', 24, 'two_way', 18);

  /* ================= 3. TERMINAL 2 GATES (201 - 204) ================= */
  // Stand coordinates at Z = 22.5
  const t2Gates = [
    { id: 'GATE_201', x: -45, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A3', idx: 0 },
    { id: 'GATE_202', x: -15, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A4', idx: 1 },
    { id: 'GATE_203', x: 15, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A4', idx: 2 },
    { id: 'GATE_204', x: 45, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A5', idx: 3 },
  ];

  for (const gDef of t2Gates) {
    g.addNode(gDef.id, gDef.x, 0.28, gDef.z, 'gate', `Gate ${201 + gDef.idx}`, gDef.idx);
    g.addNode(`${gDef.id}_PUSH`, gDef.x, 0.28, gDef.pushbackZ, 'taxiway', `Pushback Point ${201 + gDef.idx}`);

    // Stand lead-in & pushback
    g.addEdge(`E_LEADIN_${gDef.id}`, `${gDef.id}_PUSH`, gDef.id, 18, 'two_way', 10);
    g.addEdge(`E_TAX_${gDef.id}`, gDef.taxNode, `${gDef.id}_PUSH`, 20, 'two_way', 15);
  }

  /* ================= 4. TERMINAL 1 GATES (101 - 104) ================= */
  const t1Gates = [
    { id: 'GATE_101', x: -140, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A1', idx: 4 },
    { id: 'GATE_102', x: -115, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A2', idx: 5 },
    { id: 'GATE_103', x: -90, z: 22.5, pushbackZ: 38, taxNode: 'TAX_A2', idx: 6 },
  ];

  for (const gDef of t1Gates) {
    g.addNode(gDef.id, gDef.x, 0.28, gDef.z, 'gate', `Gate ${gDef.idx + 97}`, gDef.idx);
    g.addNode(`${gDef.id}_PUSH`, gDef.x, 0.28, gDef.pushbackZ, 'taxiway', `Pushback Point ${gDef.idx + 97}`);

    g.addEdge(`E_LEADIN_${gDef.id}`, `${gDef.id}_PUSH`, gDef.id, 18, 'two_way', 10);
    g.addEdge(`E_TAX_${gDef.id}`, gDef.taxNode, `${gDef.id}_PUSH`, 20, 'two_way', 15);
  }

  /* ================= 5. CARGO & MAINTENANCE STANDS ================= */
  g.addNode('GATE_CARGO_1', 115, 0.28, 22.5, 'gate', 'Cargo Stand C1', 7);
  g.addNode('GATE_CARGO_1_PUSH', 115, 0.28, 38, 'taxiway', 'Cargo Push 1');
  g.addEdge('E_CARGO_1', 'GATE_CARGO_1_PUSH', 'GATE_CARGO_1', 20, 'two_way', 10);
  g.addEdge('E_CARGO_TAX', 'TAX_A6', 'GATE_CARGO_1_PUSH', 20, 'two_way', 15);

  /* ================= 6. LANDSIDE CITYSIDE ROAD NETWORK ================= */
  // Main 6-Lane Expressway Entrance (Coming from NH 44 / Bengaluru city at South)
  g.addNode('ROAD_ENTRY', -7.5, 0.25, -170, 'landside_road', 'NH 44 Airport Expressway Inbound');
  g.addNode('ROAD_HWY_MID_IN', -7.5, 0.25, -135, 'landside_road', 'Expressway Inbound Mid');
  g.addNode('ROAD_HWY_APP_IN', -7.5, 0.25, -105, 'landside_road', 'Expressway Roundabout Approach');

  // Main Roundabout Ring Road (Center = 0, -75; Radius = 26.5m in center of 14m asphalt ring)
  g.addNode('ROAD_RND_S', 0, 0.25, -101.5, 'landside_road', 'Roundabout South Entry');
  g.addNode('ROAD_RND_SW', -18.7, 0.25, -93.7, 'landside_road', 'Roundabout South-West');
  g.addNode('ROAD_RND_W', -26.5, 0.25, -75, 'landside_road', 'Roundabout West (T1 Spur)');
  g.addNode('ROAD_RND_NW', -18.7, 0.25, -56.3, 'landside_road', 'Roundabout North-West');
  g.addNode('ROAD_RND_N', 0, 0.25, -48.5, 'landside_road', 'Roundabout North (T2 Boulevard)');
  g.addNode('ROAD_RND_NE', 18.7, 0.25, -56.3, 'landside_road', 'Roundabout North-East (Viaduct Spur)');
  g.addNode('ROAD_RND_E', 26.5, 0.25, -75, 'landside_road', 'Roundabout East (Taxi Stand Spur)');
  g.addNode('ROAD_RND_SE', 18.7, 0.25, -93.7, 'landside_road', 'Roundabout South-East Merge');

  // Main Expressway Exit (Returning South to NH 44 / Bengaluru)
  g.addNode('ROAD_HWY_APP_OUT', 7.5, 0.25, -105, 'landside_road', 'Expressway Outbound Merge');
  g.addNode('ROAD_HWY_MID_OUT', 7.5, 0.25, -135, 'landside_road', 'Expressway Outbound Mid');
  g.addNode('ROAD_EXIT', 7.5, 0.25, -170, 'landside_road', 'Expressway to Bangalore City');

  // Dedicated Ola / Uber / KSTDC Taxi Stand Staging & Bays
  g.addNode('ROAD_TAXI_ENTRY', 42, 0.25, -62, 'landside_road', 'Taxi Stand Entry Lane');
  g.addNode('ROAD_TAXI_BAY_1', 60, 0.25, -62, 'landside_road', 'Uber Pickup Bay 1');
  g.addNode('ROAD_TAXI_BAY_2', 72, 0.25, -65, 'landside_road', 'Ola Pickup Bay 2');
  g.addNode('ROAD_TAXI_BAY_3', 82, 0.25, -68, 'landside_road', 'KSTDC Prepaid Taxi Bay 3');
  g.addNode('ROAD_TAXI_EXIT', 55, 0.25, -73, 'landside_road', 'Taxi Stand Exit Lane');
  g.addNode('ROAD_TAXI_MERGE_RND', 38, 0.25, -75, 'landside_road', 'Taxi Stand Merge to Roundabout');

  // Terminal 2 Elevated Forecourt Viaduct (Z = -42, Height = 4.8m)
  g.addNode('ROAD_T2_RAMP_UP', 38, 2.5, -47, 'landside_road', 'T2 Flyover Ramp Up');
  g.addNode('ROAD_T2_DROP_1', 15, 4.8, -42, 'landside_road', 'T2 Curbside Departures 1');
  g.addNode('ROAD_T2_DROP_2', -15, 4.8, -42, 'landside_road', 'T2 Curbside Departures 2');
  g.addNode('ROAD_T2_RAMP_DN', -42, 2.5, -47, 'landside_road', 'T2 Flyover Ramp Down');

  // Terminal 1 Ground Arrivals Loop
  g.addNode('ROAD_T1_LOOP_1', -65, 0.25, -55, 'landside_road', 'T1 Forecourt Drop-off');
  g.addNode('ROAD_T1_LOOP_2', -100, 0.25, -55, 'landside_road', 'T1 Bus Terminal');

  // Connect Highway Inbound to Roundabout South
  g.addEdge('R_HWY_IN_1', 'ROAD_ENTRY', 'ROAD_HWY_MID_IN', 14, 'one_way', 35);
  g.addEdge('R_HWY_IN_2', 'ROAD_HWY_MID_IN', 'ROAD_HWY_APP_IN', 14, 'one_way', 30);
  g.addEdge('R_IN_RND', 'ROAD_HWY_APP_IN', 'ROAD_RND_S', 12, 'one_way', 15);

  // Roundabout 8-Point Clockwise Circulation Ring (R = 26.5m)
  g.addEdge('R_RND_S_SW', 'ROAD_RND_S', 'ROAD_RND_SW', 12, 'one_way', 21);
  g.addEdge('R_RND_SW_W', 'ROAD_RND_SW', 'ROAD_RND_W', 12, 'one_way', 21);
  g.addEdge('R_RND_W_NW', 'ROAD_RND_W', 'ROAD_RND_NW', 12, 'one_way', 21);
  g.addEdge('R_RND_NW_N', 'ROAD_RND_NW', 'ROAD_RND_N', 12, 'one_way', 21);
  g.addEdge('R_RND_N_NE', 'ROAD_RND_N', 'ROAD_RND_NE', 12, 'one_way', 21);
  g.addEdge('R_RND_NE_E', 'ROAD_RND_NE', 'ROAD_RND_E', 12, 'one_way', 21);
  g.addEdge('R_RND_E_SE', 'ROAD_RND_E', 'ROAD_RND_SE', 12, 'one_way', 21);
  g.addEdge('R_RND_SE_S', 'ROAD_RND_SE', 'ROAD_RND_S', 12, 'one_way', 21);

  // Highway Outbound from Roundabout South-East
  g.addEdge('R_RND_OUT', 'ROAD_RND_SE', 'ROAD_HWY_APP_OUT', 12, 'one_way', 15);
  g.addEdge('R_HWY_OUT_1', 'ROAD_HWY_APP_OUT', 'ROAD_HWY_MID_OUT', 14, 'one_way', 30);
  g.addEdge('R_HWY_OUT_2', 'ROAD_HWY_MID_OUT', 'ROAD_EXIT', 14, 'one_way', 35);

  // Taxi Stand Loop (Branching from NE, through bays, exiting back to E)
  g.addEdge('R_TAXI_IN', 'ROAD_RND_NE', 'ROAD_TAXI_ENTRY', 10, 'one_way', 24);
  g.addEdge('R_TAXI_BAY_1', 'ROAD_TAXI_ENTRY', 'ROAD_TAXI_BAY_1', 10, 'one_way', 18);
  g.addEdge('R_TAXI_BAY_2', 'ROAD_TAXI_BAY_1', 'ROAD_TAXI_BAY_2', 10, 'one_way', 12);
  g.addEdge('R_TAXI_BAY_3', 'ROAD_TAXI_BAY_2', 'ROAD_TAXI_BAY_3', 10, 'one_way', 10);
  g.addEdge('R_TAXI_OUT', 'ROAD_TAXI_BAY_3', 'ROAD_TAXI_EXIT', 10, 'one_way', 28);
  g.addEdge('R_TAXI_MERGE_1', 'ROAD_TAXI_EXIT', 'ROAD_TAXI_MERGE_RND', 10, 'one_way', 17);
  g.addEdge('R_TAXI_MERGE_2', 'ROAD_TAXI_MERGE_RND', 'ROAD_RND_E', 10, 'one_way', 12);

  // T2 Elevated Viaduct Flyover loop
  g.addEdge('R_T2_UP', 'ROAD_RND_NE', 'ROAD_T2_RAMP_UP', 10, 'one_way', 22);
  g.addEdge('R_T2_VIADUCT_1', 'ROAD_T2_RAMP_UP', 'ROAD_T2_DROP_1', 12, 'one_way', 24);
  g.addEdge('R_T2_VIADUCT_2', 'ROAD_T2_DROP_1', 'ROAD_T2_DROP_2', 12, 'one_way', 30);
  g.addEdge('R_T2_DN', 'ROAD_T2_DROP_2', 'ROAD_T2_RAMP_DN', 10, 'one_way', 28);
  g.addEdge('R_T2_RETURN', 'ROAD_T2_RAMP_DN', 'ROAD_RND_W', 10, 'one_way', 32);

  // T1 Forecourt Ground Loop
  g.addEdge('R_T1_ENTRY', 'ROAD_RND_NW', 'ROAD_T1_LOOP_1', 10, 'one_way', 46);
  g.addEdge('R_T1_BUS', 'ROAD_T1_LOOP_1', 'ROAD_T1_LOOP_2', 10, 'one_way', 35);
  g.addEdge('R_T1_RETURN', 'ROAD_T1_LOOP_2', 'ROAD_RND_SW', 10, 'one_way', 88);

  /* ================= 7. PEDESTRIAN CONCOURSE & PLAZA GRAPH ================= */
  // Terminal 2 Departures Concourse (Level 2)
  g.addNode('PED_T2_CURB', 0, 4.8, -38, 'pedestrian', 'T2 Curbside Entrance');
  g.addNode('PED_T2_CHECKIN', 0, 4.8, -25, 'pedestrian', 'T2 Check-in Hall Islands');
  g.addNode('PED_T2_SECURITY', 0, 4.8, -10, 'pedestrian', 'T2 Central Security Screening');
  g.addNode('PED_T2_GALLERIA', 0, 4.8, 5, 'pedestrian', 'T2 Duty-Free Retail Galleria');
  g.addNode('PED_GATE_201', -45, 4.8, 12, 'pedestrian', 'Gate 201 Boarding Lounge');
  g.addNode('PED_GATE_202', -15, 4.8, 12, 'pedestrian', 'Gate 202 Boarding Lounge');
  g.addNode('PED_GATE_203', 15, 4.8, 12, 'pedestrian', 'Gate 203 Boarding Lounge');
  g.addNode('PED_GATE_204', 45, 4.8, 12, 'pedestrian', 'Gate 204 Boarding Lounge');

  // Ground Level Arrivals Plaza, Zebra Crossings & Taxi Stand
  g.addNode('PED_T2_ARR_DOOR', 0, 0.28, -32, 'pedestrian', 'T2 Arrivals Main Exit');
  g.addNode('PED_T2_ZEBRA_MID', 20, 0.28, -46, 'pedestrian', 'T2 Arrivals Zebra Crosswalk');
  g.addNode('PED_TAXI_SHELTER', 60, 0.28, -58, 'pedestrian', 'Ola/Uber Taxi Shelter Queue');
  g.addNode('PED_TAXI_BAY_PICK', 72, 0.28, -63, 'pedestrian', 'Taxi Boarding Bay');

  g.addEdge('P_T2_ENT', 'PED_T2_CURB', 'PED_T2_CHECKIN', 6, 'two_way', 4);
  g.addEdge('P_T2_SEC', 'PED_T2_CHECKIN', 'PED_T2_SECURITY', 6, 'two_way', 4);
  g.addEdge('P_T2_GAL', 'PED_T2_SECURITY', 'PED_T2_GALLERIA', 8, 'two_way', 4);
  g.addEdge('P_T2_G201', 'PED_T2_GALLERIA', 'PED_GATE_201', 5, 'two_way', 4);
  g.addEdge('P_T2_G202', 'PED_T2_GALLERIA', 'PED_GATE_202', 5, 'two_way', 4);
  g.addEdge('P_T2_G203', 'PED_T2_GALLERIA', 'PED_GATE_203', 5, 'two_way', 4);
  g.addEdge('P_T2_G204', 'PED_T2_GALLERIA', 'PED_GATE_204', 5, 'two_way', 4);

  // Ground Plaza Connections
  g.addEdge('P_ARR_ZEBRA', 'PED_T2_ARR_DOOR', 'PED_T2_ZEBRA_MID', 6, 'two_way', 3);
  g.addEdge('P_ZEBRA_TAXI', 'PED_T2_ZEBRA_MID', 'PED_TAXI_SHELTER', 6, 'two_way', 3);
  g.addEdge('P_TAXI_BOARD', 'PED_TAXI_SHELTER', 'PED_TAXI_BAY_PICK', 6, 'two_way', 3);

  return g;
}
