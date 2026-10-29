'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Compass,
  Plane,
  PlaneTakeoff,
  PlusCircle,
  Radio,
  Search,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { airportAudio } from '@/lib/audio';
import { useWT } from '@/lib/store';
import { type WeatherType } from '@/lib/sim/weather';
import { airportHealth, useSelectAndFocus } from './shared';

function useOutside(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const istStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
  const utcStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return (
    <div className="live" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
      <span className="live-dot" />
      <span className="live-tag" style={{ color: '#38bdf8' }}>ATC LIVE</span>
      <span className="live-time" style={{ color: '#f8fafc', fontWeight: 'bold' }}>{istStr} IST</span>
      <span className="live-date" style={{ color: '#94a3b8' }}>({utcStr}Z)</span>
    </div>
  );
}

function AirportSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const sites = useWT((s) => s.sites);
  const order = useWT((s) => s.siteOrder);
  const activeId = useWT((s) => s.activeSiteId);
  const setActive = useWT((s) => s.setActiveSite);
  const active = sites[activeId];

  return (
    <div className="dropdown" ref={ref}>
      <button className="site-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ background: 'rgba(15, 23, 42, 0.75)' }}>
        <span className="site-ico" style={{ background: '#0284c7', color: '#ffffff' }}>
          <Plane size={16} />
        </span>
        <span className="site-txt">
          <b style={{ color: '#f8fafc' }}>{active.name}</b>
          <small style={{ color: '#94a3b8' }}>
            {active.code} · Runway 09L Active · T2
          </small>
        </span>
        <ChevronDown size={15} className={open ? 'rot' : ''} style={{ color: '#94a3b8' }} />
      </button>

      {open && (
        <div className="menu menu-sites" style={{ background: '#0f172a', border: '1px solid #334155' }}>
          <div className="menu-title" style={{ color: '#94a3b8' }}>Select Airport Hub</div>
          {order.map((id) => {
            const s = sites[id];
            const h = airportHealth(s);
            const busy = s.gates.filter((g) => g.flightId).length;
            return (
              <button
                key={id}
                className={`menu-site ${id === activeId ? 'is-active' : ''}`}
                onClick={() => {
                  setActive(id);
                  setOpen(false);
                }}
              >
                <span className={`dot tone-${h.tone}`} />
                <span className="menu-site-main">
                  <b style={{ color: '#f8fafc' }}>{s.name}</b>
                  <small style={{ color: '#94a3b8' }}>
                    {s.code} · {s.city}
                  </small>
                </span>
                <span className="menu-site-stats">
                  <small style={{ color: '#38bdf8' }}>{busy}/{s.gates.length} stands</small>
                  <small style={{ color: '#cbd5e1' }}>{s.weather.wind}</small>
                </span>
                {id === activeId && <Check size={14} className="menu-check" style={{ color: '#38bdf8' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Hit = { key: string; icon: React.ReactNode; title: string; sub: string; run: () => void };

function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useOutside(ref, () => setOpen(false));
  const site = useWT((s) => s.sites[s.activeSiteId]);
  const go = useSelectAndFocus();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Hit[] = [];

    for (const f of site.flights) {
      if (
        [f.flightNumber, f.airline, f.origin, f.destination, f.aircraftType, f.registration].some((v) =>
          v.toLowerCase().includes(term)
        )
      ) {
        out.push({
          key: f.id,
          icon: <Plane size={14} color="#38bdf8" />,
          title: `${f.flightNumber} · ${f.airline}`,
          sub: `${f.origin} (${f.originCode}) → ${f.destination} (${f.destinationCode}) · ${f.aircraftType}`,
          run: () => go({ kind: 'flight', id: f.id }),
        });
      }
    }

    for (const g of site.gates) {
      const label = `gate ${g.gateNumber}`;
      if (label.includes(term) || g.gateNumber.includes(term)) {
        out.push({
          key: `gate-${g.idx}`,
          icon: <PlaneTakeoff size={14} color="#f59e0b" />,
          title: `Gate Stand ${g.gateNumber}`,
          sub: g.flightId ? `Occupied by flight ${g.flightId}` : 'Stand Clear & Available',
          run: () => go({ kind: 'gate', idx: g.idx }),
        });
      }
    }

    return out;
  }, [q, site.flights, site.gates, go]);

  return (
    <div className="search-wrap" ref={ref}>
      <div className="search-box" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
        <Search size={14} className="search-ico" style={{ color: '#94a3b8' }} />
        <input
          ref={input}
          type="text"
          placeholder="Search flight, airline, registration… (⌘K)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={{ color: '#f8fafc' }}
        />
      </div>

      {open && hits.length > 0 && (
        <div className="menu menu-search" style={{ background: '#0f172a', border: '1px solid #334155' }}>
          {hits.map((h) => (
            <button
              key={h.key}
              className="menu-item"
              onClick={() => {
                h.run();
                setOpen(false);
                setQ('');
              }}
            >
              <span className="menu-item-ico">{h.icon}</span>
              <span>
                <b style={{ color: '#f8fafc' }}>{h.title}</b>
                <small style={{ color: '#94a3b8' }}>{h.sub}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AtisWeatherChip() {
  const site = useWT((s) => s.sites[s.activeSiteId]);
  const weatherType = useWT((s) => s.weatherType);
  const weatherCondition = useWT((s) => s.weatherCondition);
  const setWeatherType = useWT((s) => s.setWeatherType);

  const cycleWeather = () => {
    const list: WeatherType[] = ['clear', 'monsoon', 'fog', 'overcast', 'thunderstorm'];
    const nextIdx = (list.indexOf(weatherType) + 1) % list.length;
    setWeatherType(list[nextIdx]);
  };

  const badgeColor =
    weatherType === 'monsoon'
      ? '#38bdf8'
      : weatherType === 'thunderstorm'
      ? '#f43f5e'
      : weatherType === 'fog'
      ? '#94a3b8'
      : '#eab308';

  return (
    <div
      onClick={cycleWeather}
      className="card weather-badge"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        fontSize: '11px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: `1px solid ${badgeColor}66`,
        color: '#f8fafc',
        cursor: 'pointer',
      }}
      title={`Click to cycle weather (METAR: ${weatherCondition.metar})`}
    >
      <Wind size={14} color={badgeColor} />
      <span>
        <b style={{ color: badgeColor }}>{weatherType.toUpperCase()}</b> · RWY 09L · {site.weather.wind} · {site.weather.temp}°C
      </span>
    </div>
  );
}

function EventBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const site = useWT((s) => s.sites[s.activeSiteId]);
  const events = site.events;

  return (
    <div className="dropdown" ref={ref}>
      <button
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Tower Radio & Events"
        title="Tower Radio & Operations Feed"
        style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(51, 65, 85, 0.6)', color: '#f8fafc' }}
      >
        <Radio size={15} />
        {events.length > 0 && <span className="bell-badge" style={{ background: '#3b82f6' }}>{events.length}</span>}
      </button>

      {open && (
        <div className="menu menu-notifs" style={{ width: '380px', maxHeight: '420px', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155' }}>
          <div className="menu-title" style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span>Tower 118.70 MHz · Ground 121.90 MHz</span>
            <small style={{ color: '#38bdf8' }}>VOBL ATIS</small>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: '12px', color: '#64748b', fontSize: '11px' }}>Frequency clear</div>
          ) : (
            events.slice(0, 16).map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                  fontSize: '11px',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: ev.level === 'warning' ? '#f59e0b' : ev.level === 'success' ? '#22c55e' : '#38bdf8',
                      textTransform: 'uppercase',
                    }}
                  >
                    [{ev.category}]
                  </span>
                  <span style={{ color: '#64748b' }}>{ev.time}</span>
                </div>
                <div style={{ color: '#cbd5e1' }}>{ev.message}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SoundButton() {
  const [muted, setMuted] = useState(true);
  const toggle = () => {
    const unmuted = airportAudio.toggleMute();
    setMuted(!unmuted);
    if (unmuted) {
      airportAudio.playTerminalChime();
    }
  };

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      title={muted ? 'Unmute Airfield Soundscape' : 'Mute Airfield Soundscape'}
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: muted ? '1px solid rgba(51, 65, 85, 0.6)' : '1px solid #38bdf8',
        color: muted ? '#94a3b8' : '#38bdf8',
      }}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  );
}

export function TopBar() {
  const forceSpawnFlight = useWT((s) => s.forceSpawnFlight);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <AirportSwitcher />
        <AtisWeatherChip />
      </div>

      <div className="topbar-center">
        <SearchBox />
      </div>

      <div className="topbar-right">
        <button
          className="card"
          onClick={forceSpawnFlight}
          title="Dispatch another commercial flight into the Bengaluru approach pattern"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: '600',
            color: '#38bdf8',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            cursor: 'pointer',
          }}
        >
          <PlusCircle size={14} />
          <span>Inbound Flight</span>
        </button>
        <SoundButton />
        <EventBell />
        <LiveClock />
      </div>
    </header>
  );
}
