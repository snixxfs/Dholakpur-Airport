export interface AirportSeed {
  id: string;
  name: string;
  code: string;
  icao: string;
  city: string;
  gates: number;
  capacity: number;
  delivered: number;
  onTime: number;
  weather: {
    wind: string;
    windHeading: number;
    windSpeedKts: number;
    temp: number;
    visibility: string;
    altimeter: string;
    condition: string;
  };
}

export const SITES: AirportSeed[] = [
  {
    id: 'blr',
    name: 'Kempegowda International Airport (Terminal 2)',
    code: 'BLR / VOBL',
    icao: 'VOBL',
    city: 'Bengaluru / Dholakpur Gateway',
    gates: 4,
    capacity: 35000,
    delivered: 168,
    onTime: 161,
    weather: {
      wind: '090° @ 8 kts',
      windHeading: 90,
      windSpeedKts: 8,
      temp: 26,
      visibility: '10 km+ (CAVOK)',
      altimeter: '1014 hPa',
      condition: 'Clear Skies',
    },
  },
  {
    id: 'del',
    name: 'Indira Gandhi International Airport (T3)',
    code: 'DEL / VIDP',
    icao: 'VIDP',
    city: 'New Delhi',
    gates: 4,
    capacity: 45000,
    delivered: 220,
    onTime: 208,
    weather: {
      wind: '110° @ 6 kts',
      windHeading: 110,
      windSpeedKts: 6,
      temp: 31,
      visibility: '8 km',
      altimeter: '1011 hPa',
      condition: 'Haze',
    },
  },
  {
    id: 'bom',
    name: 'Chhatrapati Shivaji Maharaj International (T2)',
    code: 'BOM / VABB',
    icao: 'VABB',
    city: 'Mumbai',
    gates: 4,
    capacity: 38000,
    delivered: 185,
    onTime: 172,
    weather: {
      wind: '240° @ 12 kts',
      windHeading: 240,
      windSpeedKts: 12,
      temp: 29,
      visibility: '9 km',
      altimeter: '1012 hPa',
      condition: 'Partly Cloudy',
    },
  },
];

export type AirlineCode = 'EK' | 'EY' | 'QR' | 'SQ' | 'LH' | 'BA' | 'AI' | '6E' | 'QP';

export interface AirlineSeed {
  code: AirlineCode;
  name: string;
  callsign: string;
  primaryColor: string;
  accentColor: string;
  finDesign: 'emirates' | 'etihad' | 'qatar' | 'singapore' | 'lufthansa' | 'british' | 'airindia' | 'indigo' | 'akasa';
  country: string;
}

export const AIRLINES: AirlineSeed[] = [
  {
    code: 'EK',
    name: 'Emirates',
    callsign: 'EMIRATES',
    primaryColor: '#d71920',
    accentColor: '#bda066',
    finDesign: 'emirates',
    country: 'United Arab Emirates',
  },
  {
    code: 'EY',
    name: 'Etihad Airways',
    callsign: 'ETIHAD',
    primaryColor: '#c49a45',
    accentColor: '#3d312a',
    finDesign: 'etihad',
    country: 'United Arab Emirates',
  },
  {
    code: 'QR',
    name: 'Qatar Airways',
    callsign: 'QATARI',
    primaryColor: '#5c0632',
    accentColor: '#8a8d8f',
    finDesign: 'qatar',
    country: 'Qatar',
  },
  {
    code: 'SQ',
    name: 'Singapore Airlines',
    callsign: 'SINGAPORE',
    primaryColor: '#00205b',
    accentColor: '#eaaa00',
    finDesign: 'singapore',
    country: 'Singapore',
  },
  {
    code: 'LH',
    name: 'Lufthansa',
    callsign: 'LUFTHANSA',
    primaryColor: '#05164d',
    accentColor: '#ffad00',
    finDesign: 'lufthansa',
    country: 'Germany',
  },
  {
    code: 'BA',
    name: 'British Airways',
    callsign: 'SPEEDBIRD',
    primaryColor: '#075aaa',
    accentColor: '#eb2226',
    finDesign: 'british',
    country: 'United Kingdom',
  },
  {
    code: 'AI',
    name: 'Air India',
    callsign: 'AIRINDIA',
    primaryColor: '#d91424',
    accentColor: '#d4af37',
    finDesign: 'airindia',
    country: 'India',
  },
  {
    code: '6E',
    name: 'IndiGo Airlines',
    callsign: 'IFLY',
    primaryColor: '#001b94',
    accentColor: '#00a4e4',
    finDesign: 'indigo',
    country: 'India',
  },
  {
    code: 'QP',
    name: 'Akasa Air',
    callsign: 'AKASA AIR',
    primaryColor: '#ff5000',
    accentColor: '#4a154b',
    finDesign: 'akasa',
    country: 'India',
  },
];

export interface AircraftModelSeed {
  model: string;
  file: string;
  category: 'narrowbody' | 'widebody' | 'super';
  paxCapacity: number;
  bagCapacity: number;
  wingspanM: number;
  lengthM: number;
  engines: number;
}

export const AIRCRAFT_MODELS: AircraftModelSeed[] = [
  { model: 'Airbus A380-800', file: 'a380.glb', category: 'super', paxCapacity: 516, bagCapacity: 620, wingspanM: 79.8, lengthM: 72.7, engines: 4 },
  { model: 'Airbus A350-900', file: 'a359.glb', category: 'widebody', paxCapacity: 315, bagCapacity: 410, wingspanM: 64.7, lengthM: 67.0, engines: 2 },
  { model: 'Airbus A330-300', file: 'a333.glb', category: 'widebody', paxCapacity: 277, bagCapacity: 360, wingspanM: 60.3, lengthM: 63.7, engines: 2 },
  { model: 'Airbus A320neo', file: 'a320.glb', category: 'narrowbody', paxCapacity: 186, bagCapacity: 230, wingspanM: 35.8, lengthM: 37.6, engines: 2 },
  { model: 'Airbus A321neo', file: 'a321.glb', category: 'narrowbody', paxCapacity: 222, bagCapacity: 280, wingspanM: 35.8, lengthM: 44.5, engines: 2 },
  { model: 'Boeing 777-300ER', file: 'b773.glb', category: 'widebody', paxCapacity: 396, bagCapacity: 490, wingspanM: 64.8, lengthM: 73.9, engines: 2 },
  { model: 'Boeing 787-9 Dreamliner', file: 'b789.glb', category: 'widebody', paxCapacity: 296, bagCapacity: 390, wingspanM: 60.1, lengthM: 62.8, engines: 2 },
  { model: 'Boeing 737 MAX 8', file: 'b738.glb', category: 'narrowbody', paxCapacity: 178, bagCapacity: 220, wingspanM: 35.9, lengthM: 39.5, engines: 2 },
];

export const DESTINATIONS = [
  { city: 'Dubai', code: 'DXB' },
  { city: 'London Heathrow', code: 'LHR' },
  { city: 'Singapore', code: 'SIN' },
  { city: 'Frankfurt', code: 'FRA' },
  { city: 'Doha', code: 'DOH' },
  { city: 'Abu Dhabi', code: 'AUH' },
  { city: 'New Delhi', code: 'DEL' },
  { city: 'Mumbai', code: 'BOM' },
  { city: 'Hyderabad', code: 'HYD' },
  { city: 'Chennai', code: 'MAA' },
  { city: 'Goa', code: 'GOX' },
  { city: 'Kolkata', code: 'CCU' },
];
