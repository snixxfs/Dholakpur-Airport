'use client';

import { useCallback } from 'react';
import { cameraApi } from '@/lib/camera';
import { entityPosition } from '@/lib/focus';
import { useWT, type Selection, type SiteState, type Flight } from '@/lib/store';

/** Select an entity and glide the camera to it when it's on the map. */
export function useSelectAndFocus() {
  const select = useWT((s) => s.select);
  const activeSiteId = useWT((s) => s.activeSiteId);
  const sites = useWT((s) => s.sites);

  return useCallback(
    (sel: Selection, focus = true) => {
      select(sel);
      if (!focus) return;
      const site = sites[activeSiteId];
      if (site) {
        const p = entityPosition(site, sel);
        if (p && sel.kind !== 'site') cameraApi.focus(p.x, p.z);
      }
    },
    [select, activeSiteId, sites],
  );
}

export function Sparkline({
  data,
  color = '#2563eb',
  height = 34,
  width = 120,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${d} L${width},${height} L0,${height} Z`;
  const id = `g${color.replace('#', '')}`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="spark" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.8" fill={color} />
    </svg>
  );
}

export function Progress({
  value,
  tone = 'blue',
  thin = false,
}: {
  value: number;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'grey';
  thin?: boolean;
}) {
  return (
    <div className={`progress ${thin ? 'thin' : ''}`}>
      <div className={`progress-fill tone-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export type GateStatus = 'Free' | 'Approaching' | 'Deplaning' | 'Ground Ops' | 'Boarding' | 'Departing' | 'Maintenance';

export function gateStatus(site: SiteState, idx: number): { status: GateStatus; flight?: Flight } {
  const g = site.gates[idx];
  if (!g) return { status: 'Free' };
  if (g.maintenance) return { status: 'Maintenance' };
  const flight = site.flights.find((f) => f.id === g.flightId);
  if (!flight) return { status: 'Free' };
  if (flight.phase === 'approaching' || flight.phase === 'landing' || flight.phase === 'taxi_in') {
    return { status: 'Approaching', flight };
  }
  if (flight.phase === 'parked' || flight.phase === 'disembarking') {
    return { status: 'Deplaning', flight };
  }
  if (flight.phase === 'unloading' || flight.phase === 'servicing') {
    return { status: 'Ground Ops', flight };
  }
  if (flight.phase === 'boarding') {
    return { status: 'Boarding', flight };
  }
  return { status: 'Departing', flight };
}

export const gateTone: Record<GateStatus, string> = {
  Free: 'green',
  Approaching: 'amber',
  Deplaning: 'blue',
  'Ground Ops': 'amber',
  Boarding: 'blue',
  Departing: 'grey',
  Maintenance: 'red',
};

export function airportHealth(site: SiteState): { label: string; tone: 'green' | 'amber' | 'red' | 'blue' } {
  const busy = site.gates.filter((g) => g.flightId).length;
  const avail = site.gates.filter((g) => !g.maintenance).length;
  if (site.runwayOccupied) return { label: 'Active RWY 09', tone: 'amber' };
  if (busy / (avail || 1) >= 0.8) return { label: 'High Traffic', tone: 'blue' };
  return { label: 'All Normal', tone: 'green' };
}

export function relTime(ms: number) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
