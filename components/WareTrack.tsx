'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  Locate,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Sun,
  Sunset,
} from 'lucide-react';
import Scene from './scene/Scene';
import { TopBar } from './ui/TopBar';
import { KpiCards } from './ui/KpiCards';
import { SitePanel } from './ui/SitePanel';
import { ShipmentTimeline } from './ui/ShipmentTimeline';
import { OpsTabs } from './ui/OpsTabs';
import { cameraApi } from '@/lib/camera';
import { useWT, type CameraPreset, type TimeOfDay } from '@/lib/store';

const TICK_MS = 250;

function useSimulation() {
  const tick = useWT((s) => s.tick);
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      tick(dt);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [tick]);
}

function FloatingControls() {
  const isPaused = useWT((s) => s.isPaused);
  const togglePause = useWT((s) => s.togglePause);
  const simSpeed = useWT((s) => s.simSpeed);
  const setSimSpeed = useWT((s) => s.setSimSpeed);
  const timeOfDay = useWT((s) => s.timeOfDay);
  const setTimeOfDay = useWT((s) => s.setTimeOfDay);
  const cameraPreset = useWT((s) => s.cameraPreset);
  const setCameraPreset = useWT((s) => s.setCameraPreset);
  const debugOverlay = useWT((s) => s.debugOverlay);
  const toggleDebugOverlay = useWT((s) => s.toggleDebugOverlay);

  const presets: { id: CameraPreset; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'aircraft', label: 'Tracking' },
    { id: 'gate', label: 'Gate 202' },
    { id: 'runway', label: 'RWY 09L' },
    { id: 'taxi', label: 'Taxi Stand' },
    { id: 'helipad', label: 'VIP Helipad' },
    { id: 'ground', label: 'Ramp View' },
    { id: 'free', label: 'Free' },
  ];

  return (
    <div className="card map-ctrl" aria-label="Simulation and view controls">
      {/* Simulation Play / Pause */}
      <button
        onClick={togglePause}
        title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        aria-label={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        style={{ color: isPaused ? '#ef4444' : '#22c55e', padding: '4px' }}
      >
        {isPaused ? <Play size={15} fill="#ef4444" /> : <Pause size={15} fill="#22c55e" />}
      </button>

      {/* Speed multiplier pills */}
      {[1, 2, 5].map((spd) => (
        <button
          key={spd}
          onClick={() => setSimSpeed(spd)}
          title={`Simulation speed ${spd}x`}
          style={{
            fontWeight: simSpeed === spd ? 'bold' : 'normal',
            color: simSpeed === spd ? '#38bdf8' : '#94a3b8',
            fontSize: '11px',
            padding: '2px 5px',
          }}
        >
          {spd}x
        </button>
      ))}

      <span className="map-ctrl-sep" />

      {/* Time-of-day switcher */}
      <button
        onClick={() => setTimeOfDay('day')}
        title="Daytime Mode"
        style={{ color: timeOfDay === 'day' ? '#f59e0b' : '#64748b' }}
      >
        <Sun size={15} />
      </button>
      <button
        onClick={() => setTimeOfDay('sunset')}
        title="Sunset / Golden Hour Mode"
        style={{ color: timeOfDay === 'sunset' ? '#f97316' : '#64748b' }}
      >
        <Sunset size={15} />
      </button>
      <button
        onClick={() => setTimeOfDay('night')}
        title="Night Mode (Runway Lighting)"
        style={{ color: timeOfDay === 'night' ? '#818cf8' : '#64748b' }}
      >
        <Moon size={15} />
      </button>

      <span className="map-ctrl-sep" />

      {/* Camera Presets */}
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => setCameraPreset(p.id)}
          title={`Switch camera to ${p.label}`}
          style={{
            fontSize: '11px',
            color: cameraPreset === p.id ? '#38bdf8' : '#94a3b8',
            fontWeight: cameraPreset === p.id ? 'bold' : 'normal',
            padding: '2px 6px',
            background: cameraPreset === p.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            borderRadius: '4px',
          }}
        >
          {p.label}
        </button>
      ))}

      <span className="map-ctrl-sep" />

      {/* Camera Pan Directional Controls (WASD / Arrows also active) */}
      <button onClick={() => cameraApi.panForward()} title="Move Forward (or press W / Up)" aria-label="Move forward">
        <ArrowUp size={15} />
      </button>
      <button onClick={() => cameraApi.panBackward()} title="Move Backward (or press S / Down)" aria-label="Move backward">
        <ArrowDown size={15} />
      </button>
      <button onClick={() => cameraApi.panLeft()} title="Move Left (or press A / Left)" aria-label="Move left">
        <ArrowLeft size={15} />
      </button>
      <button onClick={() => cameraApi.panRight()} title="Move Right (or press D / Right)" aria-label="Move right">
        <ArrowRight size={15} />
      </button>

      {/* Camera standard controls */}
      <button onClick={() => cameraApi.zoomIn()} title="Zoom In (+)" aria-label="Zoom in">
        <Plus size={16} />
      </button>
      <button onClick={() => cameraApi.zoomOut()} title="Zoom Out (-)" aria-label="Zoom out">
        <Minus size={16} />
      </button>
      <button onClick={() => cameraApi.rotate(-1)} title="Rotate Left (Q)" aria-label="Rotate left">
        <RotateCcw size={15} />
      </button>
      <button onClick={() => cameraApi.rotate(1)} title="Rotate Right (E)" aria-label="Rotate right">
        <RotateCw size={15} />
      </button>
      <button onClick={() => cameraApi.reset()} title="Reset Overview" aria-label="Reset airport view">
        <Locate size={15} />
      </button>

      <span className="map-ctrl-sep" />

      {/* ATC Graph & Separation Bubble Visualizer Toggle */}
      <button
        onClick={toggleDebugOverlay}
        title={debugOverlay ? 'Hide ATC Graph & Collision Separation Overlay' : 'Show ATC Graph & Collision Separation Overlay'}
        aria-label="Toggle Debug Overlay"
        style={{
          color: debugOverlay ? '#38bdf8' : '#94a3b8',
          background: debugOverlay ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
          borderRadius: '4px',
          padding: '3px',
        }}
      >
        <Layers size={15} />
      </button>
    </div>
  );
}

function LegendPill() {
  return (
    <div className="legend">
      <span>
        <i className="pip pip-free" /> Gate Stand Clear
      </span>
      <span>
        <i className="pip pip-amber" /> ILS 09L / Taxiing
      </span>
      <span>
        <i className="pip pip-blue" /> Deplaning & Baggage
      </span>
      <span>
        <i className="pip" style={{ background: '#8b5cf6' }} /> Boarding
      </span>
      <span>
        <i className="pip pip-red" /> Maintenance
      </span>
    </div>
  );
}

export default function WareTrack() {
  useSimulation();
  const [bottomOpen, setBottomOpen] = useState(true);
  const [sideOpen, setSideOpen] = useState(true);
  const selection = useWT((s) => s.selection);

  // Auto-open side drawer when an aircraft or gate is selected
  useEffect(() => {
    if (selection.kind !== 'site') {
      setSideOpen(true);
    }
  }, [selection]);

  return (
    <main className="app">
      <div className="viewport">
        <Scene />
      </div>

      <div className="hud">
        <TopBar />
        <KpiCards />
        <FloatingControls />
        <LegendPill />

        {/* Right-Side Telemetry Drawer */}
        <div className={`side-drawer-wrap ${sideOpen ? 'is-open' : 'is-closed'}`}>
          <button
            className="drawer-toggle-btn"
            onClick={() => setSideOpen((o) => !o)}
            title={sideOpen ? 'Collapse Details Panel' : 'Expand Details Panel'}
          >
            {sideOpen ? '▶' : '◀'}
          </button>
          {sideOpen && <SitePanel />}
        </div>

        {/* Bottom Operations & Turnaround Strip */}
        <div className={`bottom-wrap ${bottomOpen ? 'is-open' : 'is-collapsed'}`}>
          <div className="bottom-toggle-bar">
            <button
              onClick={() => setBottomOpen((o) => !o)}
              className="bottom-toggle-pill"
              title={bottomOpen ? 'Collapse Flight Operations' : 'Expand Flight Operations'}
            >
              {bottomOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <span>{bottomOpen ? 'Collapse Operations Bar' : 'Live Flight Strip & FIDS'}</span>
            </button>
          </div>

          {bottomOpen && (
            <div className="bottom">
              <ShipmentTimeline />
              <OpsTabs />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
