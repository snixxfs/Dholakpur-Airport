'use client';

import { ArrowRight, Check, Clock, Plane } from 'lucide-react';
import { TURNAROUND_STAGES, stageIndexForPhase, useActiveSite, useWT } from '@/lib/store';
import { useSelectAndFocus } from './shared';

export function ShipmentTimeline() {
  const site = useActiveSite();
  const selection = useWT((s) => s.selection);
  const go = useSelectAndFocus();

  const selectedFlight =
    selection.kind === 'flight' ? site.flights.find((f) => f.id === selection.id) : undefined;
  const flight = selectedFlight ?? site.flights.find((f) => f.phase !== 'departed') ?? site.flights[0];

  if (!flight) return <div className="card timeline" />;

  const si = stageIndexForPhase(flight.phase);
  const gateNum = flight.gate !== null ? site.gates[flight.gate]?.gateNumber : 'TBD';

  return (
    <div className="card timeline" style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
      <div className="tl-head">
        <div>
          <span className="sel-kicker" style={{ color: '#38bdf8' }}>
            {selectedFlight ? 'Selected Aircraft Turnaround' : 'Active Aircraft Turnaround Sequence'}
          </span>
          <div className="tl-title">
            <b style={{ color: '#f8fafc', fontSize: '16px' }}>{flight.flightNumber}</b>
            <button
              className="tl-truck"
              onClick={() => go({ kind: 'flight', id: flight.id })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              <Plane size={13} /> {flight.airline} · {flight.aircraftType} ({flight.registration})
            </button>
          </div>
          <div className="tl-route" style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
            <span>{flight.origin} ({flight.originCode})</span>
            <ArrowRight size={12} />
            <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>
              BLR T2 (Gate {gateNum})
            </span>
            <ArrowRight size={12} />
            <span>{flight.destination} ({flight.destinationCode})</span>
          </div>
        </div>

        <div className="tl-eta is-docked" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
          <small style={{ color: '#94a3b8' }}>
            <Clock size={12} /> Flight Phase
          </small>
          <b style={{ fontSize: '13px', color: '#f8fafc' }}>
            {flight.phase.toUpperCase().replace('_', ' ')}
          </b>
          <span style={{ color: '#38bdf8' }}>{flight.statusText}</span>
        </div>
      </div>

      <ol className="stages">
        {TURNAROUND_STAGES.map((label, i) => {
          const state = i < si ? 'done' : i === si ? 'active' : 'todo';
          return (
            <li key={label} className={`stage is-${state}`}>
              <div className="stage-track">
                <span className="stage-node">
                  {state === 'done' ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                {i < TURNAROUND_STAGES.length - 1 && (
                  <span className="stage-line">
                    <span
                      style={{
                        width: i < si ? '100%' : i === si ? `${flight.t * 100}%` : '0%',
                      }}
                    />
                  </span>
                )}
              </div>
              <div className="stage-meta">
                <b>{label}</b>
                <small>
                  {state === 'done'
                    ? 'Completed'
                    : state === 'active'
                    ? `${Math.round(flight.t * 100)}%`
                    : 'Pending'}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
