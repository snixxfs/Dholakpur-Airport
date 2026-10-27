# ✈️ Dholakpur International Airport (DIA / VDLP)
### Ultra-Realistic 3D Airfield & Airport Operations Simulator

> Inspired by **Kempegowda International Airport, Bengaluru (BLR / VOBL)** — featuring an expansive airside apron, Runway 09L/27R, Terminal 2 "Terminal in a Garden" timber architecture, NH 44 multi-lane expressway & roundabout, VIP heli-taxi operations, and real-time aircraft turnaround logistics.

![Dholakpur Airport Simulator](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React Three Fiber](https://img.shields.io/badge/Three.js-R3F-blue?style=for-the-badge&logo=three.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Zustand](https://img.shields.io/badge/State-Zustand%20%2B%20Immer-orange?style=for-the-badge)

---

## 🌟 Key Highlights

### 1. Airfield & Runway Operations (Runway 09L/27R)
- **Authentic Runway Infrastructure**: Full 45m-wide asphalt strip with ICAO precision threshold stripes, touchdown zone markers, aim points, centerline striping, and amber/white runway edge lights.
- **Dynamic Approach & Takeoff Sequences**:
  - Glideslope descent with **$+3.0^\circ$ pitch attitude**.
  - Real-time flare physics on touchdown with smoke puff particles and ground-roll deceleration.
  - Realistic takeoff acceleration and **$+12.6^\circ$ climb pitch**.
  - Dynamic aerodynamic banking: aircraft bank into turns up to $28^\circ$ proportional to turn rate ($\text{targetRoll} = -\text{clamp}(\dot{\psi} \times 1.5, -0.48, 0.48)$).

### 2. Complete 10-Phase Turnaround State Machine
Every flight experiences an authentic turnaround sequence synchronized with ground telemetry and dashboard updates:
1. `in_flight` — En-route approach vectoring to Runway 09L
2. `landing` — 3° glideslope approach, touchdown flare, deceleration
3. `taxi_in` — Rapid-exit taxiway clearance and high-speed apron routing
4. `docked` — Marshalling into Gate Stand, chocks in place
5. `unloading` — Baggage tugs and conveyor unloading, passenger disembarkation
6. `servicing` — Fuel bowser connection, catering truck servicing, safety inspections
7. `boarding` — Passenger jet bridge embarkation, baggage loading
8. `pushback` — Towbarless pushback tug maneuver into taxiway Alpha
9. `taxi_out` — Holding short at Runway 09L CAT-I holding bar
10. `takeoff` — Full spool-up, high-speed ground roll, V1/Vr rotation, departure climb

### 3. Terminal 2 Architecture ("Terminal in a Garden")
- Inspired by BLR T2’s celebrated bamboo/engineered timber lattice ceiling, high-transmittance glass curtain facades, and lush indoor planters.
- Integrated ATC Tower with 360-degree glass observation cab and radar radome dome.
- Multi-gate airside apron with 6 functional aerobridge passenger gates and GSE staging bays.

### 4. Landside Transport & Access Roads
- **NH 44 Airport Expressway**: 6-lane divided access highway with overhead directional gantries and flyover ramps.
- **Arrivals Roundabout**: 8-point smooth circular roundabout ring ($R = 26.5\text{ m}$) guiding traffic to Terminal 2 curbside.
- **Dedicated Taxi Stand**: 3 marked pickup bays (Uber, Ola, KSTDC Prepaid) with illuminated canopy shelter, passenger waiting queues, and luggage trolleys.
- **Autonomous Road Traffic**: Electric buses, yellow airport taxis, shuttle vans, and private SUVs navigating traffic paths with anti-collision distance checks, front-wheel Ackerman steering, and 4-way hazard flashers.

### 5. VIP Heli-Taxi Helipad & AW101 Helicopter
- Dedicated 26m concrete landing deck with ICAO standard white touchdown perimeter, central yellow **H** marking, and 16 perimeter LED green lights.
- 3D AgustaWestland AW101 VIP Helicopter model (`helicopter.glb`) with animated main and tail rotors.
- **Dynamic Rotor Wash Physics**: 48 dynamic instanced dust wash particles that swirl and lift off during hover, touchdown, and vertical climb.
- VIP passenger boarding lifecycles connecting executive flights directly to the main terminal.

### 6. Interactive Controls & Camera Modes
- **Free Camera Flight**: Full WASD / Arrow key flight with height adjustment (Q/E) and right-click drag pan.
- **Quick Preset Views**:
  - `T2 Terminal` overview
  - `Runway 09L` approach angle
  - `Apron Gates` overview
  - `VIP Helipad` focus
  - `Taxi Stand` curbside monitoring
- **Floating Controls**: Real-time simulation speed slider (1x, 2x, 5x), day/sunset/night lighting toggle, and sound controls.

---

## 🛠️ Architecture & Tech Stack

```
waretrack-main/
├── app/
│   ├── layout.tsx             # Root layout with custom viewport & metadata
│   ├── globals.css            # Aviation theme styling & UI tokens
│   └── page.tsx               # Main entry point mounting the 3D airport app
├── components/
│   ├── WareTrack.tsx          # Main orchestrator mounting Scene + UI HUD
│   ├── scene/
│   │   ├── Scene.tsx          # Three.js Canvas, CameraControls, Lighting rig
│   │   ├── Grounds.tsx        # Airfield terrain, runways, taxiway markings, aprons
│   │   ├── Warehouse.tsx      # Terminal 2 Garden architecture & ATC tower
│   │   ├── Vehicles.tsx       # Aircraft 3D models (glTF), GSE tugs, road traffic
│   │   ├── LandsideRoads.tsx  # NH 44 6-lane highway, roundabout, taxi stands
│   │   ├── Helipad.tsx        # VIP Helipad, AW101 helicopter, rotor wash dust
│   │   ├── DebugVisualizer.tsx# Airfield graph overlay and collision bubbles
│   │   └── palette.ts         # PBR lighting presets (Day, Sunset, Night)
│   └── ui/
│       ├── TopBar.tsx         # Airport branding, time controls, weather telemetry
│       ├── KpiCards.tsx       # Live metrics (Flights, Turnaround, Delays, Runway)
│       ├── OpsTabs.tsx        # Flight schedule, Gate manager, GSE telemetrics
│       └── SitePanel.tsx      # Multi-terminal inspector and runway status
├── lib/
│   ├── sim/
│   │   ├── engine.ts          # Core simulation loop, flight physics, road kinematics
│   │   └── graph.ts           # A* waypoint navigation for runway/taxiway taxi
│   ├── store.ts               # Zustand + Immer airport operational store
│   ├── layout.ts              # Spatial coordinates, gate positions, taxi nodes
│   ├── camera.ts              # Imperative camera control API
│   ├── data.ts                # Flight schedules, airlines, fleet specs, origins
│   └── focus.ts               # World position focus math for entities
└── scripts/
    ├── test-engine.mjs        # 10-point simulation test suite
    └── test-turnaround.mjs    # Turnaround phase validation test
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Modern WebGL2-compatible browser (Chrome, Edge, Firefox, Safari)

### Installation
```bash
git clone https://github.com/snixxfs/Dholakpur-Airport.git
cd Dholakpur-Airport
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

### Verification & Automated Tests
```bash
npm test                      # Run turnaround phase lifecycle test
npx tsx scripts/test-engine.mjs  # Run 10-point simulation engine verification
```

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Rotate View** | Left-click + drag |
| **Pan / Truck View** | Right-click + drag (or WASD / Arrow keys) |
| **Zoom In / Out** | Mouse scroll wheel |
| **Focus Entity** | Click on any aircraft, gate, or vehicle |
| **Camera Presets** | Click `T2`, `Runway`, `Gates`, `Helipad`, or `Taxi Stand` buttons |
| **Sim Speed** | Toggle 1x, 2x, 5x in the top control bar |
| **Day / Sunset / Night** | Toggle sun/moon lighting preset in the top bar |

---

## 📜 License
MIT License. Inspired by Kempegowda International Airport (BLR/VOBL).
