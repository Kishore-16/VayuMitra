// Mock Data Adapter — Realistic Statistical Generator for Delhi NCR

export const DELHI_ZONES = [
  { id: "DELHI_CENTRAL", name: "Central Delhi (ITO / Mandir Marg)", lat: 28.628, lon: 77.241, baselinePM25: 190 },
  { id: "DELHI_EAST", name: "East Delhi (Anand Vihar)", lat: 28.647, lon: 77.315, baselinePM25: 260 },
  { id: "DELHI_NORTH", name: "North Delhi (Jahangirpuri / DTU)", lat: 28.732, lon: 77.171, baselinePM25: 240 },
  { id: "DELHI_SOUTH", name: "South Delhi (R.K. Puram / Okhla)", lat: 28.563, lon: 77.186, baselinePM25: 165 },
  { id: "DELHI_WEST", name: "West Delhi (Mundka / Punjabi Bagh)", lat: 28.679, lon: 77.028, baselinePM25: 230 },
  { id: "GURUGRAM", name: "Gurugram NCR (Vikas Sadan)", lat: 28.459, lon: 77.026, baselinePM25: 175 },
  { id: "NOIDA", name: "Noida Sector-62 NCR", lat: 28.627, lon: 77.373, baselinePM25: 200 },
  { id: "GHAZIABAD", name: "Ghaziabad NCR (Loni / Vasundhara)", lat: 28.669, lon: 77.453, baselinePM25: 250 }
];

export const FIRE_HOTSPOTS = [
  { id: "FIRE_SANGRUR", region: "Punjab - Sangrur Cluster", lat: 30.24, lon: 75.84, frpMW: 68.4, confidence: 0.92, activeCount: 142 },
  { id: "FIRE_PATIALA", region: "Punjab - Patiala District", lat: 30.33, lon: 76.38, frpMW: 45.2, confidence: 0.88, activeCount: 98 },
  { id: "FIRE_TARNTARAN", region: "Punjab - Tarn Taran Belt", lat: 31.45, lon: 74.92, frpMW: 82.1, confidence: 0.95, activeCount: 186 },
  { id: "FIRE_LUDHIANA", region: "Punjab - Ludhiana West", lat: 30.90, lon: 75.85, frpMW: 38.6, confidence: 0.84, activeCount: 74 },
  { id: "FIRE_KARNAL", region: "Haryana - Karnal Border", lat: 29.68, lon: 76.98, frpMW: 29.0, confidence: 0.79, activeCount: 42 }
];

export class MockDataAdapter {
  fetchWeather(zoneId, timestamp = new Date()) {
    const hour = new Date(timestamp).getHours();
    // Cold winter nights (22:00 to 07:00) cause strong inversion & low PBL
    const isNight = hour >= 21 || hour <= 7;
    const baseTemp = isNight ? 11.5 + Math.sin(hour * 0.2) * 2 : 21.0 - Math.cos((hour - 12) * 0.3) * 4;
    const windSpeed = isNight ? 1.2 + (Math.sin(hour) * 0.4) : 3.4 + (Math.cos(hour) * 0.8); // calm winds at night
    const windDir = 315 + (Math.sin(hour * 0.5) * 15); // North-Westerly prevailing wind carrying stubble smoke
    const pblHeight = isNight ? 160 + (Math.sin(hour) * 30) : 650 + (Math.cos((hour - 12) * 0.3) * 250);

    // Vertical lapse rate profile (surface to 500m)
    // Positive lapse rate (T_top > T_surface) indicates temperature inversion
    const verticalTempProfile = isNight
      ? [baseTemp, baseTemp - 0.2, baseTemp + 0.8, baseTemp + 1.9, baseTemp + 2.4] // Inversion: gets warmer with height
      : [baseTemp, baseTemp - 0.9, baseTemp - 1.8, baseTemp - 2.6, baseTemp - 3.4]; // Normal lapse rate

    return {
      timestamp: new Date(timestamp).toISOString(),
      zoneId,
      temperatureC: parseFloat(baseTemp.toFixed(1)),
      windSpeedMs: parseFloat(windSpeed.toFixed(1)),
      windDirDeg: Math.round(windDir),
      pblHeightM: Math.round(pblHeight),
      humidityPct: isNight ? 88 : 52,
      surfacePressureHpa: 1016.4,
      verticalTempProfileC: verticalTempProfile.map(t => parseFloat(t.toFixed(1))),
      sourceMode: "mock"
    };
  }

  fetchPollution(zoneId, timestamp = new Date()) {
    const zone = DELHI_ZONES.find(z => z.id === zoneId) || DELHI_ZONES[0];
    const hour = new Date(timestamp).getHours();
    const nightPeak = (hour >= 20 || hour <= 8) ? 1.45 : 0.85;

    const pm25 = zone.baselinePM25 * nightPeak + (Math.sin(hour * 0.4) * 25);
    const pm10 = pm25 * 1.62;
    const o3 = (hour >= 12 && hour <= 16) ? 58.0 : 18.2; // Photochemical O3 peaks in afternoon
    const no2 = (hour >= 7 && hour <= 10) || (hour >= 18 && hour <= 22) ? 84.5 : 42.1; // Traffic peaks

    return {
      timestamp: new Date(timestamp).toISOString(),
      zoneId: zone.id,
      zoneName: zone.name,
      lat: zone.lat,
      lon: zone.lon,
      pm25: parseFloat(pm25.toFixed(1)),
      pm10: parseFloat(pm10.toFixed(1)),
      o3: parseFloat(o3.toFixed(1)),
      no2: parseFloat(no2.toFixed(1)),
      so2: 12.4,
      co: 1.8,
      sourceMode: "mock"
    };
  }

  fetchFireEvents() {
    return FIRE_HOTSPOTS.map(f => ({
      ...f,
      timestamp: new Date().toISOString(),
      sourceMode: "mock"
    }));
  }

  fetchSatelliteTiles() {
    return {
      timestamp: new Date().toISOString(),
      product: "AOD_550nm_TROPOMI",
      bbox: [76.8, 28.3, 77.6, 28.9],
      resolutionKm: 1,
      maxAOD: 1.84,
      status: "MOCK_SAT_TILE_READY",
      sourceMode: "mock"
    };
  }
}
