import { GATE_STAND_Z, gateX, aircraftPose } from './layout';
import { type SiteState, type Selection } from './store';

/** World position of a selectable entity, or null when it is not on the map. */
export function entityPosition(site: SiteState, sel: Selection): { x: number; z: number } | null {
  const n = site.gates.length;
  switch (sel.kind) {
    case 'site':
      return { x: 0, z: 25 };
    case 'gate':
      return { x: gateX(sel.idx, n), z: GATE_STAND_Z };
    case 'vehicle': {
      const v = site.vehicles.find((x) => x.id === sel.id);
      return v ? { x: gateX(v.gate, n) + 7, z: GATE_STAND_Z + 4 } : null;
    }
    case 'flight': {
      const f = site.flights.find((x) => x.id === sel.id);
      if (!f) return null;
      const gx = gateX(f.gate ?? 0, n);
      if (f.phase === 'approaching') {
        const p = aircraftPose('approach', gx, f.t);
        return { x: p.x, z: p.z };
      }
      if (f.phase === 'landing') {
        const p = aircraftPose('landing', gx, f.t);
        return { x: p.x, z: p.z };
      }
      if (f.phase === 'taxi_in') {
        const p = aircraftPose('taxi_in', gx, f.t);
        return { x: p.x, z: p.z };
      }
      if (f.phase === 'pushback') {
        const p = aircraftPose('pushback', gx, f.t);
        return { x: p.x, z: p.z };
      }
      if (f.phase === 'taxi_out' || f.phase === 'runway_entry') {
        const p = aircraftPose('taxi_out', gx, f.t);
        return { x: p.x, z: p.z };
      }
      if (f.phase === 'takeoff') {
        const p = aircraftPose('takeoff', gx, f.t);
        return { x: p.x, z: p.z };
      }
      return { x: gx, z: GATE_STAND_Z };
    }
  }
}
