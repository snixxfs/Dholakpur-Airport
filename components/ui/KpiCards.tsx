'use client';

import { Activity, Clock3, Plane, Users } from 'lucide-react';
import { useActiveSite } from '@/lib/store';
import { Sparkline, fmt } from './shared';

export function KpiCards() {
  const site = useActiveSite();
  const flights = site.flights;

  const inAir = flights.filter((f) => f.phase === 'approaching' || f.phase === 'takeoff').length;
  const atGate = flights.filter((f) =>
    ['parked', 'disembarking', 'unloading', 'servicing', 'boarding'].includes(f.phase)
  ).length;

  const otd = site.flightsHandled > 0 ? (site.onTimeFlights / site.flightsHandled) * 100 : 96.5;
  const runwayOccupant = site.runwayOccupied;

  return (
    <div className="kpis-compact-bar">
      {/* 1. Airport Traffic Chip */}
      <div className="kpi-chip">
        <span className="kpi-chip-ico" style={{ color: '#38bdf8' }}>
          <Plane size={14} />
        </span>
        <div className="kpi-chip-body">
          <span className="kpi-chip-val">
            {flights.length} <small>active</small>
          </span>
          <span className="kpi-chip-sub">
            {atGate} at gates · {inAir} airborne
          </span>
        </div>
      </div>

      {/* 2. Runway 09L Status Chip */}
      <div className="kpi-chip">
        <span
          className="kpi-chip-ico"
          style={{ color: runwayOccupant ? '#f59e0b' : '#22c55e' }}
        >
          <Activity size={14} />
        </span>
        <div className="kpi-chip-body">
          <span
            className="kpi-chip-val"
            style={{ color: runwayOccupant ? '#f59e0b' : '#22c55e' }}
          >
            {runwayOccupant ? `RWY 09L: ${runwayOccupant}` : 'RWY 09L: CLEAR'}
          </span>
          <span className="kpi-chip-sub">
            {runwayOccupant ? 'Traffic on Rollout / Climb' : 'ILS Cat-III Online'}
          </span>
        </div>
      </div>

      {/* 3. On-Time Performance Chip */}
      <div className="kpi-chip">
        <span className="kpi-chip-ico" style={{ color: '#818cf8' }}>
          <Clock3 size={14} />
        </span>
        <div className="kpi-chip-body">
          <span className="kpi-chip-val">
            {otd.toFixed(1)}% <small>OTD</small>
          </span>
          <span className="kpi-chip-sub">{site.flightsHandled} flights handled</span>
        </div>
      </div>

      {/* 4. Passenger Throughput Chip */}
      <div className="kpi-chip">
        <span className="kpi-chip-ico" style={{ color: '#fbbf24' }}>
          <Users size={14} />
        </span>
        <div className="kpi-chip-body">
          <span className="kpi-chip-val">
            {fmt(site.passengersInTransit)} <small>pax</small>
          </span>
          <span className="kpi-chip-sub">{fmt(site.totalPassengersToday)} today</span>
        </div>
      </div>
    </div>
  );
}
