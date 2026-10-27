'use client';

import { useRef } from 'react';
import {
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Crosshair,
  Gauge,
  MapPin,
  Plane,
  Radio,
  Wind,
  X,
} from 'lucide-react';
import { cameraApi } from '@/lib/camera';
import { entityPosition } from '@/lib/focus';
import {
  useActiveSite,
  useWT,
  type Flight,
  type GroundVehicle,
  type SiteState,
} from '@/lib/store';
import { Progress, airportHealth, fmt, gateStatus, gateTone, useSelectAndFocus } from './shared';

function BatteryIcon({ v }: { v: GroundVehicle }) {
  if (v.status === 'servicing') return <BatteryCharging size={14} className="txt-green" />;
  if (v.battery < 25) return <BatteryLow size={14} className="txt-red" />;
  if (v.battery < 60) return <BatteryMedium size={14} className="txt-amber" />;
  return <BatteryFull size={14} className="txt-muted" />;
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="sec-title">
      <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{children}</span>
      {aside && <span className="sec-aside" style={{ color: '#94a3b8' }}>{aside}</span>}
    </div>
  );
}

function FlightCard({ site, f }: { site: SiteState; f: Flight }) {
  const select = useWT((s) => s.select);
  const gateNum = f.gate !== null ? site.gates[f.gate]?.gateNumber : 'Unassigned';

  return (
    <div className="sel-card" style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
      <div className="sel-head">
        <span className="sel-kicker" style={{ color: '#38bdf8' }}>Aircraft Telemetry</span>
        <button className="ghost-btn" onClick={() => select({ kind: 'site' })} aria-label="Clear selection">
          <X size={14} style={{ color: '#94a3b8' }} />
        </button>
      </div>

      <div className="sel-title">
        <b style={{ color: f.airlineColor, fontSize: '18px' }}>{f.flightNumber}</b>
        <span className="pill tone-blue">{f.phase.toUpperCase().replace('_', ' ')}</span>
      </div>

      <div className="sel-grid">
        <div>
          <small>Airline</small>
          <span style={{ color: '#f8fafc' }}>{f.airline}</span>
        </div>
        <div>
          <small>Aircraft Type</small>
          <span style={{ color: '#f8fafc' }}>{f.aircraftType}</span>
        </div>
        <div>
          <small>Registration</small>
          <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{f.registration}</span>
        </div>
        <div>
          <small>Callsign</small>
          <span style={{ color: '#f8fafc' }}>{f.callsign}</span>
        </div>
        <div>
          <small>Origin</small>
          <span style={{ color: '#f8fafc' }}>{f.origin} ({f.originCode})</span>
        </div>
        <div>
          <small>Destination</small>
          <span style={{ color: '#f8fafc' }}>{f.destination} ({f.destinationCode})</span>
        </div>
        <div>
          <small>Stand / Gate</small>
          <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>Stand {gateNum} (T2)</span>
        </div>
        <div>
          <small>Speed / Alt</small>
          <span style={{ color: '#f8fafc' }}>
            {f.speedKnots} kts · {f.altitudeMeters} m
          </span>
        </div>
        <div>
          <small>Passengers</small>
          <span style={{ color: '#f8fafc' }}>
            {f.paxOnboard} / {f.paxTotal} pax
          </span>
        </div>
        <div>
          <small>Fuel Level</small>
          <span style={{ color: '#f8fafc' }}>{f.fuelPercent}%</span>
        </div>
      </div>

      {/* Turnaround Checklist Matrix */}
      <div
        style={{
          marginTop: '12px',
          fontSize: '11px',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          padding: '10px',
          borderRadius: '6px',
        }}
      >
        <b style={{ display: 'block', marginBottom: '6px', color: '#f8fafc' }}>
          Ground Turnaround Checklist:
        </b>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
          <span style={{ color: f.paxOnboard === 0 || f.phase === 'boarding' ? '#22c55e' : '#f59e0b' }}>
            {f.paxOnboard === 0 || f.phase === 'boarding' ? '✓ Deplaning Complete' : '○ Deplaning In Progress'}
          </span>
          <span style={{ color: f.bagsUnloaded >= f.bagsTotal ? '#22c55e' : '#f59e0b' }}>
            {f.bagsUnloaded >= f.bagsTotal ? '✓ Baggage LD3 Cleared' : '○ Baggage Offload'}
          </span>
          <span style={{ color: f.cateringDone ? '#22c55e' : '#94a3b8' }}>
            {f.cateringDone ? '✓ High-Lift Catering Done' : '○ Catering Inbound'}
          </span>
          <span style={{ color: f.cabinClean ? '#22c55e' : '#94a3b8' }}>
            {f.cabinClean ? '✓ Cabin Sanitized' : '○ Cabin Cleaning'}
          </span>
          <span style={{ color: f.fuelPercent >= 90 ? '#22c55e' : '#f59e0b' }}>
            {f.fuelPercent >= 90 ? '✓ Bowser Refueling Done' : `○ Fueling (${f.fuelPercent}%)`}
          </span>
          <span style={{ color: f.pushbackReady ? '#22c55e' : '#94a3b8' }}>
            {f.pushbackReady ? '✓ Tug Latched / Cleared' : '○ Pushback Standby'}
          </span>
        </div>
      </div>

      <button
        className="link-btn"
        style={{ marginTop: '10px', color: '#38bdf8' }}
        onClick={() => {
          const p = entityPosition(site, { kind: 'flight', id: f.id });
          if (p) cameraApi.focus(p.x, p.z);
        }}
      >
        <Crosshair size={14} /> Focus Aircraft on Airport
      </button>
    </div>
  );
}

function GateCard({ site, idx }: { site: SiteState; idx: number }) {
  const select = useWT((s) => s.select);
  const go = useSelectAndFocus();
  const { status, flight } = gateStatus(site, idx);
  const g = site.gates[idx];

  return (
    <div className="sel-card" style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
      <div className="sel-head">
        <span className="sel-kicker" style={{ color: '#38bdf8' }}>Gate Stand Telemetry</span>
        <button className="ghost-btn" onClick={() => select({ kind: 'site' })} aria-label="Clear selection">
          <X size={14} style={{ color: '#94a3b8' }} />
        </button>
      </div>

      <div className="sel-title">
        <b style={{ color: '#f8fafc', fontSize: '18px' }}>Gate Stand {g.gateNumber}</b>
        <span className={`pill tone-${gateTone[status]}`}>{status}</span>
      </div>

      <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
        Dual Aerobridge Terminal 2 Pier · Apron North
      </div>

      {flight ? (
        <button className="row-btn" onClick={() => go({ kind: 'flight', id: flight.id })} style={{ marginTop: '10px' }}>
          <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>
            {flight.flightNumber} · {flight.airline}
          </span>
          <small style={{ color: '#38bdf8' }}>{flight.statusText}</small>
        </button>
      ) : (
        <p className="muted small" style={{ marginTop: '10px' }}>
          Stand clear and calibrated. Ready for next inbound aircraft.
        </p>
      )}

      <button
        className="link-btn"
        style={{ marginTop: '10px', color: '#38bdf8' }}
        onClick={() => {
          const p = entityPosition(site, { kind: 'gate', idx });
          if (p) cameraApi.focus(p.x, p.z);
        }}
      >
        <Crosshair size={14} /> Focus Gate Stand
      </button>
    </div>
  );
}

function VehicleCard({ site, v }: { site: SiteState; v: GroundVehicle }) {
  const select = useWT((s) => s.select);
  const flightAtGate = site.flights.find((f) => f.gate === v.gate);
  const gateNum = site.gates[v.gate]?.gateNumber ?? '201';

  const typeName =
    v.type === 'pushback'
      ? 'Heavy Towbarless Pushback Tug'
      : v.type === 'baggage'
      ? 'LD3 Container Baggage Train'
      : v.type === 'catering'
      ? 'High-Lift Catering Truck'
      : 'Jet A-1 Fuel Bowser';

  return (
    <div className="sel-card" style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
      <div className="sel-head">
        <span className="sel-kicker" style={{ color: '#38bdf8' }}>GSE Telemetry</span>
        <button className="ghost-btn" onClick={() => select({ kind: 'site' })} aria-label="Clear selection">
          <X size={14} style={{ color: '#94a3b8' }} />
        </button>
      </div>

      <div className="sel-title">
        <b style={{ color: '#f8fafc', fontSize: '18px' }}>{v.id}</b>
        <span className="pill tone-amber">{v.status.replace(/_/g, ' ')}</span>
      </div>

      <div className="sel-grid">
        <div>
          <small>GSE Equipment</small>
          <span style={{ color: '#f8fafc' }}>{typeName}</span>
        </div>
        <div>
          <small>Assigned Stand</small>
          <span style={{ color: '#f8fafc' }}>Gate {gateNum}</span>
        </div>
        <div>
          <small>Battery / Fuel</small>
          <span style={{ color: '#f8fafc' }}>{Math.round(v.battery)}%</span>
        </div>
        <div>
          <small>Turnarounds Done</small>
          <span style={{ color: '#f8fafc' }}>{v.tasksCompleted} flights</span>
        </div>
      </div>

      <Progress value={v.battery / 100} tone={v.battery < 25 ? 'red' : 'blue'} />
    </div>
  );
}

export function SitePanel() {
  const site = useActiveSite();
  const selection = useWT((s) => s.selection);
  const go = useSelectAndFocus();
  const listRef = useRef<HTMLDivElement>(null);

  const health = airportHealth(site);
  const selFlight =
    selection.kind === 'flight' ? site.flights.find((f) => f.id === selection.id) : undefined;
  const selVehicle =
    selection.kind === 'vehicle' ? site.vehicles.find((v) => v.id === selection.id) : undefined;

  return (
    <aside className="card side" ref={listRef} style={{ background: 'rgba(15, 23, 42, 0.88)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
      {selFlight && <FlightCard site={site} f={selFlight} />}
      {selVehicle && <VehicleCard site={site} v={selVehicle} />}
      {selection.kind === 'gate' && <GateCard site={site} idx={selection.idx} />}

      <div className={`site-head ${selection.kind === 'site' ? 'is-selected' : ''}`}>
        <div className="site-head-top">
          <span className="sel-kicker" style={{ color: '#38bdf8' }}>Airport Command Center</span>
          <span className={`pill tone-${health.tone}`}>
            <span className="pill-dot" />
            {health.label}
          </span>
        </div>
        <h2 style={{ color: '#f8fafc' }}>{site.name}</h2>
        <div className="site-meta">
          <span style={{ color: '#94a3b8' }}>
            <MapPin size={13} /> {site.code} · {site.city}
          </span>
        </div>
        <div className="temps">
          <span className="temp" style={{ background: 'rgba(30, 41, 59, 0.6)' }}>
            <Wind size={14} style={{ color: '#38bdf8' }} />
            <span>
              <small style={{ color: '#94a3b8' }}>Wind</small>
              <b style={{ color: '#f8fafc' }}>{site.weather.wind}</b>
            </span>
          </span>
          <span className="temp" style={{ background: 'rgba(30, 41, 59, 0.6)' }}>
            <Gauge size={14} style={{ color: '#38bdf8' }} />
            <span>
              <small style={{ color: '#94a3b8' }}>QNH / Temp</small>
              <b style={{ color: '#f8fafc' }}>
                {site.weather.altimeter} · {site.weather.temp}°C
              </b>
            </span>
          </span>
        </div>
      </div>

      {/* Stands 201 - 204 Section */}
      <section>
        <SectionTitle
          aside={`${site.gates.filter((g) => g.flightId).length}/${site.gates.length} stands occupied`}
        >
          Terminal 2 Stands
        </SectionTitle>
        <div className="bays">
          {site.gates.map((g) => {
            const { status, flight } = gateStatus(site, g.idx);
            const sel = selection.kind === 'gate' && selection.idx === g.idx;
            return (
              <button
                key={g.idx}
                className={`bay tone-${gateTone[status]} ${sel ? 'is-selected' : ''}`}
                onClick={() => go({ kind: 'gate', idx: g.idx })}
              >
                <span className="bay-num" style={{ color: '#38bdf8' }}>G{g.gateNumber}</span>
                <span className="bay-status">{status}</span>
                <span className="bay-truck" style={{ color: '#f8fafc' }}>{flight ? flight.flightNumber : 'Clear'}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Flights in Airspace */}
      <section>
        <SectionTitle aside={`${site.flights.length} active`}>Airspace & Apron Traffic</SectionTitle>
        <div className="inv">
          {site.flights.map((f) => (
            <div
              key={f.id}
              className="inv-row"
              onClick={() => go({ kind: 'flight', id: f.id })}
              style={{ cursor: 'pointer', background: 'rgba(30, 41, 59, 0.5)' }}
            >
              <span className="inv-zone" style={{ background: f.airlineColor, color: '#fff', fontWeight: 'bold' }}>
                ✈
              </span>
              <span className="inv-main">
                <b style={{ color: '#f8fafc' }}>
                  {f.flightNumber} · {f.airline}
                </b>
                <small style={{ color: '#94a3b8' }}>
                  {f.originCode} → {f.destinationCode} ({f.aircraftType})
                </small>
              </span>
              <span className="badge badge-ok">{f.phase.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ground Fleet Support Equipment */}
      <section>
        <SectionTitle aside={`${site.vehicles.length} units active`}>Ground Support Fleet</SectionTitle>
        <div className="fleet">
          {site.vehicles.map((v) => {
            const sel = selection.kind === 'vehicle' && selection.id === v.id;
            const gateNum = site.gates[v.gate]?.gateNumber ?? '201';
            return (
              <button
                key={v.id}
                className={`fleet-row ${sel ? 'is-selected' : ''}`}
                onClick={() => go({ kind: 'vehicle', id: v.id })}
                style={{ background: 'rgba(30, 41, 59, 0.4)' }}
              >
                <span className="fleet-id">
                  <b style={{ color: '#f8fafc' }}>{v.id}</b>
                  <small style={{ color: '#94a3b8' }}>Stand {gateNum}</small>
                </span>
                <span className="fleet-mid">
                  <span className="fleet-status">
                    <span
                      className={`dot tone-${
                        v.status === 'servicing' ? 'blue' : v.status === 'driving_to_gate' ? 'amber' : 'grey'
                      }`}
                    />
                    <span style={{ color: '#cbd5e1' }}>{v.status.replace(/_/g, ' ')}</span>
                  </span>
                  <Progress value={v.battery / 100} thin tone="green" />
                </span>
                <span className="fleet-bat">
                  <BatteryIcon v={v} />
                  <span style={{ color: '#94a3b8' }}>{Math.round(v.battery)}%</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
