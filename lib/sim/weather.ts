/**
 * Dynamic Meteorological Weather Engine for Dholakpur / Kempegowda Airport
 * Simulates tropical monsoon cycles, crosswinds for Runway 09L, mist/fog layers,
 * and realistic ICAO METAR aviation weather telemetry.
 */

export type WeatherType = 'clear' | 'monsoon' | 'fog' | 'overcast' | 'thunderstorm';

export interface WeatherCondition {
  type: WeatherType;
  name: string;
  temp: number; // Celsius
  dewpoint: number;
  windHeading: number; // degrees
  windSpeedKts: number;
  windGustKts: number;
  visibilityMeters: number;
  altimeterHpa: number;
  precipitationIntensity: number; // 0.0 to 1.0
  fogDensity: number; // 0.0 to 1.0
  cloudCover: number; // 0.0 to 1.0
  lightningActive: boolean;
  metar: string;
}

export const WEATHER_PRESETS: Record<WeatherType, Omit<WeatherCondition, 'metar'>> = {
  clear: {
    type: 'clear',
    name: 'Fair & Sunny (CAVOK)',
    temp: 27,
    dewpoint: 16,
    windHeading: 95,
    windSpeedKts: 7,
    windGustKts: 9,
    visibilityMeters: 10000,
    altimeterHpa: 1014,
    precipitationIntensity: 0,
    fogDensity: 0.0002,
    cloudCover: 0.1,
    lightningActive: false,
  },
  monsoon: {
    type: 'monsoon',
    name: 'Bengaluru Monsoon Rain',
    temp: 22,
    dewpoint: 21,
    windHeading: 120,
    windSpeedKts: 16,
    windGustKts: 26,
    visibilityMeters: 3200,
    altimeterHpa: 1008,
    precipitationIntensity: 0.85,
    fogDensity: 0.003,
    cloudCover: 0.95,
    lightningActive: false,
  },
  fog: {
    type: 'fog',
    name: 'CAT-II Winter Morning Mist',
    temp: 18,
    dewpoint: 18,
    windHeading: 80,
    windSpeedKts: 3,
    windGustKts: 5,
    visibilityMeters: 550,
    altimeterHpa: 1016,
    precipitationIntensity: 0,
    fogDensity: 0.012,
    cloudCover: 0.7,
    lightningActive: false,
  },
  overcast: {
    type: 'overcast',
    name: 'Deccan Plateau Overcast',
    temp: 24,
    dewpoint: 19,
    windHeading: 100,
    windSpeedKts: 11,
    windGustKts: 15,
    visibilityMeters: 8000,
    altimeterHpa: 1012,
    precipitationIntensity: 0.1,
    fogDensity: 0.0008,
    cloudCover: 0.85,
    lightningActive: false,
  },
  thunderstorm: {
    type: 'thunderstorm',
    name: 'Pre-Monsoon Thunderstorm',
    temp: 21,
    dewpoint: 20,
    windHeading: 140,
    windSpeedKts: 22,
    windGustKts: 34,
    visibilityMeters: 2000,
    altimeterHpa: 1005,
    precipitationIntensity: 1.0,
    fogDensity: 0.004,
    cloudCover: 1.0,
    lightningActive: true,
  },
};

/**
 * Computes crosswind and headwind components for Runway 09L (090° heading)
 */
export function calculateRunwayWindComponents(windHeading: number, windSpeedKts: number, runwayHeading = 90) {
  const diffRad = ((windHeading - runwayHeading) * Math.PI) / 180;
  const headwind = Math.round(windSpeedKts * Math.cos(diffRad));
  const crosswind = Math.round(windSpeedKts * Math.sin(diffRad));
  return {
    headwind: Math.max(0, headwind),
    tailwind: Math.max(0, -headwind),
    crosswindAbs: Math.abs(crosswind),
    crosswindDir: crosswind > 0 ? ('right' as const) : ('left' as const),
  };
}

/**
 * Generates an authentic ICAO METAR formatted string for VOBL / VDLP
 */
export function generateMetar(cond: Omit<WeatherCondition, 'metar'>, station = 'VOBL'): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const now = new Date();
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const min = pad(Math.floor(now.getUTCMinutes() / 30) * 30);

  const windStr = `${pad(cond.windHeading, 3)}${pad(cond.windSpeedKts)}${
    cond.windGustKts > cond.windSpeedKts + 5 ? `G${pad(cond.windGustKts)}` : ''
  }KT`;

  const visStr = cond.visibilityMeters >= 9999 ? 'CAVOK' : `${pad(cond.visibilityMeters, 4)}`;

  let wx = '';
  if (cond.type === 'monsoon') wx = '+RA BKN015';
  else if (cond.type === 'thunderstorm') wx = '+TSRA SCT020CB';
  else if (cond.type === 'fog') wx = 'FG VV002';
  else if (cond.type === 'overcast') wx = 'OVC025';
  else wx = 'FEW030';

  const tempStr = `${cond.temp >= 0 ? pad(cond.temp) : `M${pad(Math.abs(cond.temp))}`}/${
    cond.dewpoint >= 0 ? pad(cond.dewpoint) : `M${pad(Math.abs(cond.dewpoint))}`
  }`;

  const qnhStr = `Q${cond.altimeterHpa}`;

  return `${station} ${day}${hour}${min}Z ${windStr} ${visStr} ${wx} ${tempStr} ${qnhStr} NOSIG`;
}

/**
 * Creates full weather condition with dynamic METAR
 */
export function getWeatherCondition(type: WeatherType = 'clear'): WeatherCondition {
  const base = WEATHER_PRESETS[type] || WEATHER_PRESETS.clear;
  return {
    ...base,
    metar: generateMetar(base),
  };
}
