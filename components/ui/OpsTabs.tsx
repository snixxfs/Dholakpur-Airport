'use client';

import { useState } from 'react';
import { useActiveSite, useWT } from '@/lib/store';
import { Progress, gateStatus, gateTone, useSelectAndFocus } from './shared';

type Tab = 'flights' | 'gates' | 'ground' | 'atc';

export function OpsTabs() {
  const [tab, setTab] = useState<Tab>('flights');
  const site = useActiveSite();
  const selection = useWT((s) => s.selection);
  const go = useSelectAndFocus();

  const flights = [...site.flights];

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'flights', label: 'Flight FIDS', count: flights.length },
    { id: 'gates', label: 'Stands 201-204', count: site.gates.length },
    { id: 'ground', label: 'Ground GSE', count: site.vehicles.length },
    { id: 'atc', label: 'Tower Radio', count: site.events.length },
  ];

  return (
    <div className="card ops" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="tab-count">{t.count}</span>
          </button>
        ))}
        <span className="tabs-live">
          <span className="live-dot" /> LIVE OPS
        </span>
      </div>

      <div className="ops-list">
        {/* ================= 1. FLIGHTS BOARD (FIDS) ================= */}
        {tab === 'flights' &&
          flights.map((f) => {
            const sel = selection.kind === 'flight' && selection.id === f.id;
            const gateNum = f.gate !== null ? `Gate ${site.gates[f.gate]?.gateNumber}` : 'Pattern';
            const tone =
              f.phase === 'approaching' || f.phase === 'landing'
                ? 'blue'
                : f.phase === 'boarding'
                ? 'amber'
                : f.phase === 'takeoff'
                ? 'green'
                : 'grey';

            return (
              <button
                key={f.id}
                className={`ops-row ${sel ? 'is-selected' : ''}`}
                onClick={() => go({ kind: 'flight', id: f.id })}
              >
                <span className="ops-key" style={{ color: f.airlineColor, fontWeight: 'bold' }}>
                  {f.flightNumber}
                </span>
                <span className={`pill tone-${tone}`}>{f.phase.replace('_', ' ')}</span>
                <span className="ops-mid" style={{ color: '#cbd5e1' }}>
                  {f.originCode} → {f.destinationCode} · {gateNum} · {f.aircraftType}
                </span>
                <span className="ops-end">
                  {f.phase === 'disembarking' ? (
                    <>
                      <Progress value={(f.paxTotal - f.paxOnboard) / f.paxTotal} thin tone="blue" />
                      <small style={{ color: '#94a3b8' }}>{f.paxOnboard} pax aboard</small>
                    </>
                  ) : f.phase === 'boarding' ? (
                    <>
                      <Progress value={f.paxOnboard / f.paxDepartingTotal} thin tone="amber" />
                      <small style={{ color: '#94a3b8' }}>
                        {f.paxOnboard}/{f.paxDepartingTotal} boarded
                      </small>
                    </>
                  ) : f.phase === 'unloading' ? (
                    <>
                      <Progress value={f.bagsUnloaded / f.bagsTotal} thin tone="blue" />
                      <small style={{ color: '#94a3b8' }}>
                        {f.bagsUnloaded}/{f.bagsTotal} bags
                      </small>
                    </>
                  ) : (
                    <small className="muted">{f.statusText}</small>
                  )}
                </span>
              </button>
            );
          })}

        {/* ================= 2. GATES (STANDS 201-204) ================= */}
        {tab === 'gates' &&
          site.gates.map((g) => {
            const { status, flight } = gateStatus(site, g.idx);
            const sel = selection.kind === 'gate' && selection.idx === g.idx;
            return (
              <button
                key={g.idx}
                className={`ops-row ${sel ? 'is-selected' : ''}`}
                onClick={() => go({ kind: 'gate', idx: g.idx })}
              >
                <span className="ops-key" style={{ color: '#f8fafc' }}>Stand {g.gateNumber}</span>
                <span className={`pill tone-${gateTone[status]}`}>{status}</span>
                <span className="ops-mid" style={{ color: '#cbd5e1' }}>
                  {flight
                    ? `${flight.flightNumber} · ${flight.airline} (${flight.aircraftType})`
                    : 'Aerobridge Ready · Stand Available'}
                </span>
                <span className="ops-end">
                  {flight ? (
                    <small style={{ color: '#38bdf8', fontWeight: '500' }}>{flight.statusText}</small>
                  ) : (
                    <small className="muted">Stand Clear</small>
                  )}
                </span>
              </button>
            );
          })}

        {/* ================= 3. GROUND VEHICLES (GSE) ================= */}
        {tab === 'ground' &&
          site.vehicles.map((v) => {
            const flightAtGate = site.flights.find((f) => f.gate === v.gate);
            const gateNum = site.gates[v.gate]?.gateNumber ?? '201';
            const sel = selection.kind === 'vehicle' && selection.id === v.id;
            const tone = v.status === 'servicing' ? 'blue' : v.status === 'driving_to_gate' ? 'amber' : 'grey';
            const typeLabel =
              v.type === 'pushback'
                ? 'Towbarless Tug'
                : v.type === 'baggage'
                ? 'LD3 Baggage Train'
                : v.type === 'catering'
                ? 'High-Lift Catering'
                : 'Fuel Bowser';

            return (
              <button
                key={v.id}
                className={`ops-row ${sel ? 'is-selected' : ''}`}
                onClick={() => go({ kind: 'vehicle', id: v.id })}
              >
                <span className="ops-key" style={{ color: '#f8fafc' }}>{v.id}</span>
                <span className={`pill tone-${tone}`}>{v.status.replace(/_/g, ' ')}</span>
                <span className="ops-mid" style={{ color: '#cbd5e1' }}>
                  {typeLabel} · Gate {gateNum}
                  {flightAtGate ? ` (${flightAtGate.flightNumber})` : ''} · {v.tasksCompleted} turns done
                </span>
                <span className="ops-end">
                  <Progress
                    value={v.battery / 100}
                    tone={v.battery < 25 ? 'red' : v.battery < 50 ? 'amber' : 'green'}
                    thin
                  />
                  <small style={{ color: '#94a3b8' }}>{Math.round(v.battery)}%</small>
                </span>
              </button>
            );
          })}

        {/* ================= 4. TOWER RADIO LOG ================= */}
        {tab === 'atc' &&
          site.events.map((ev) => (
            <div
              key={ev.id}
              className="ops-row"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}
            >
              <span className="ops-key" style={{ fontSize: '11px', color: '#64748b' }}>
                {ev.time}
              </span>
              <span
                className={`pill tone-${
                  ev.level === 'warning' ? 'amber' : ev.level === 'success' ? 'green' : 'blue'
                }`}
              >
                {ev.category}
              </span>
              <span className="ops-mid" style={{ color: '#cbd5e1' }}>
                {ev.message}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
