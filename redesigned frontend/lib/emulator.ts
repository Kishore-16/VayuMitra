import { grapFromAqi, aqiBand, pm25ToAqi, toCompass, istHour } from './aqi'
import type {
  AerosolFeedbackDiagnostic,
  CPCBStation,
  DashboardData,
  HourlyForecastPoint,
  IndustrialAnomaly,
  InversionSounding,
  PlumeTrajectory,
  SimulationInput,
  SimulationResult,
  StubbleFire,
} from './types'

export const DELHI = { lat: 28.6139, lon: 77.209 }

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const FORECAST_INIT = '2026-11-04T00:00:00+05:30'

export function buildForecast(): HourlyForecastPoint[] {
  const r = rng(42)
  const start = new Date(FORECAST_INIT).getTime()
  return Array.from({ length: 72 }, (_, h) => {
    const ts = new Date(start + h * 3600_000).toISOString()
    const lh = istHour(ts)
    const day = Math.floor(h / 24)
    const sun = Math.max(0, Math.sin((Math.PI * (lh - 7)) / 11))
    const isDay = lh >= 7 && lh <= 18
    const nightDepth = isDay ? 0 : Math.max(0, Math.cos((2 * Math.PI * (lh - 4)) / 24))

    const pbl = round(220 + 1050 * sun * (day === 1 ? 0.8 : 1) + r() * 40)
    const inversionActive = !isDay || sun < 0.25
    const invStrength = inversionActive ? round(0.6 + 1.3 * nightDepth + (day === 1 ? 0.4 : 0) + r() * 0.2, 2) : round(0.05 + r() * 0.1, 2)
    const temp = round(15 + 10 * Math.max(0, Math.sin((Math.PI * (lh - 8)) / 13)) + (lh < 8 ? -1 : 0) + r() * 0.6, 1)
    const humidity = round(clamp(88 - (temp - 14) * 3.4 + r() * 4, 30, 96))
    const windSpeed = round(3 + 7 * sun + (day === 2 ? 3.5 : 0) + r() * 1.5, 1)
    const windDir = round(295 + 20 * Math.sin(h / 9) + r() * 10) % 360

    const stubblePct = round(clamp(30 + 10 * Math.sin((h - 10) / 8) + (day === 1 ? 6 : 0) - (day === 2 ? 8 : 0), 12, 48))
    const trap = Math.sqrt(1300 / Math.max(pbl, 150))
    const dayTrend = [1, 1.18, 0.86][day]
    const pm25 = round(clamp(70 * trap * dayTrend + stubblePct * 1.4 + r() * 12, 60, 480))
    const aqi = pm25ToAqi(pm25)
    const aod = 0.35 + pm25 / 320

    return {
      timestamp: ts,
      hour_offset: h,
      temp_c: temp,
      humidity_pct: humidity,
      wind_speed_kmh: windSpeed,
      wind_dir_deg: windDir,
      wind_dir_compass: toCompass(windDir),
      pbl_height_m: pbl,
      radiative_forcing_w_m2: round(-aod * 48 * (0.25 + sun * 0.75), 1),
      inversion_strength_c_100m: invStrength,
      inversion_layer_active: inversionActive,
      pm25,
      pm10: round(pm25 * (1.55 + r() * 0.2)),
      no2: round(40 + 45 * (1 - sun) + r() * 10),
      o3: round(12 + 48 * sun + r() * 6),
      aqi,
      aqi_category: aqiBand(aqi).label,
      grap_stage: grapFromAqi(aqi).name,
      stubble_contribution_pct: stubblePct,
      urban_contribution_pct: 100 - stubblePct,
    }
  })
}

const STATION_SEED: [string, string, string, number, number, string, number][] = [
  ['anand-vihar', 'Anand Vihar', 'Delhi', 28.6468, 77.316, 'DPCC', 1.28],
  ['ito', 'ITO', 'Delhi', 28.6286, 77.241, 'CPCB', 1.12],
  ['rk-puram', 'R.K. Puram', 'Delhi', 28.5633, 77.1869, 'DPCC', 1.02],
  ['punjabi-bagh', 'Punjabi Bagh', 'Delhi', 28.674, 77.131, 'DPCC', 1.14],
  ['dwarka', 'Dwarka Sec-8', 'Delhi', 28.571, 77.0719, 'DPCC', 1.0],
  ['rohini', 'Rohini', 'Delhi', 28.7325, 77.1199, 'DPCC', 1.16],
  ['wazirpur', 'Wazirpur', 'Delhi', 28.6998, 77.1654, 'DPCC', 1.24],
  ['jahangirpuri', 'Jahangirpuri', 'Delhi', 28.7328, 77.1706, 'DPCC', 1.26],
  ['lodhi-road', 'Lodhi Road', 'Delhi', 28.5918, 77.2273, 'IMD', 0.88],
  ['mundka', 'Mundka', 'Delhi', 28.6823, 77.0348, 'DPCC', 1.2],
  ['bawana', 'Bawana', 'Delhi', 28.7762, 77.0511, 'DPCC', 1.22],
  ['narela', 'Narela', 'Delhi', 28.8227, 77.1019, 'DPCC', 1.1],
  ['noida-62', 'Noida Sec-62', 'Uttar Pradesh', 28.6245, 77.3577, 'UPPCB', 1.04],
  ['ghaziabad-loni', 'Loni, Ghaziabad', 'Uttar Pradesh', 28.7575, 77.2785, 'UPPCB', 1.18],
  ['gurugram', 'Vikas Sadan, Gurugram', 'Haryana', 28.4501, 77.0263, 'HSPCB', 0.94],
  ['faridabad', 'Sector 16A, Faridabad', 'Haryana', 28.4089, 77.3178, 'HSPCB', 0.98],
]

export function buildStations(forecast: HourlyForecastPoint[], hour = 0): CPCBStation[] {
  const p = forecast[hour]
  return STATION_SEED.map(([id, name, state, lat, lon, type, m], i) => {
    const wobble = 1 + Math.sin(hour / 5 + i) * 0.05
    const pm25 = round(p.pm25 * m * wobble)
    const aqi = pm25ToAqi(pm25)
    return {
      id,
      name,
      city: state === 'Delhi' ? 'New Delhi' : name.split(', ').pop() ?? name,
      state,
      lat,
      lon,
      type,
      current_pm25: pm25,
      current_pm10: round(p.pm10 * m * wobble),
      current_no2: round(p.no2 * (0.8 + m * 0.3)),
      current_o3: round(p.o3 * (1.3 - m * 0.3)),
      current_aqi: aqi,
      aqi_category: aqiBand(aqi).label,
      grap_stage: grapFromAqi(aqi).name,
      multiplier: m,
    }
  })
}

const FIRE_SEED: [string, string, number, number, number, number, string][] = [
  ['Sangrur', 'Punjab', 30.2458, 75.8421, 412, 38, 'Paddy'],
  ['Ludhiana', 'Punjab', 30.901, 75.8573, 238, 29, 'Paddy'],
  ['Patiala', 'Punjab', 30.34, 76.3869, 305, 34, 'Paddy'],
  ['Bathinda', 'Punjab', 30.211, 74.9455, 276, 31, 'Paddy'],
  ['Firozpur', 'Punjab', 30.9331, 74.6225, 341, 36, 'Paddy'],
  ['Moga', 'Punjab', 30.8165, 75.1717, 188, 26, 'Paddy'],
  ['Amritsar', 'Punjab', 31.634, 74.8723, 164, 24, 'Basmati'],
  ['Fatehabad', 'Haryana', 29.515, 75.455, 142, 22, 'Paddy'],
  ['Kaithal', 'Haryana', 29.8015, 76.3998, 121, 20, 'Paddy'],
  ['Karnal', 'Haryana', 29.6857, 76.9905, 86, 17, 'Basmati'],
  ['Jind', 'Haryana', 29.3159, 76.3159, 97, 19, 'Paddy'],
]

export function buildFires(): StubbleFire[] {
  const r = rng(7)
  return FIRE_SEED.map(([district, state, lat, lon, count, frp, crop], i) => ({
    id: `fire-${i}`,
    district,
    state,
    lat,
    lon,
    active_fires: count,
    mean_frp_mw: frp,
    confidence: round(78 + r() * 18),
    crop_type: crop,
    estimated_emission_rate_kg_s: round(count * frp * 0.0021, 1),
    plume_injection_height_m: round(900 + frp * 28 + r() * 150),
  }))
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLon = ((bLon - aLon) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function buildTrajectories(fires: StubbleFire[]): PlumeTrajectory[] {
  return fires.map((f, i) => {
    const km = distanceKm(f.lat, f.lon, DELHI.lat, DELHI.lon)
    const eta = round(km / (14 + (i % 4) * 2))
    const steps = 8
    const bend = (i % 2 === 0 ? 1 : -1) * 0.35
    const points = Array.from({ length: steps + 1 }, (_, s) => {
      const t = s / steps
      const lat = f.lat + (DELHI.lat - f.lat) * t + Math.sin(Math.PI * t) * bend
      const lon = f.lon + (DELHI.lon - f.lon) * t + Math.sin(Math.PI * t) * bend * 0.4
      return {
        hour: round(eta * t, 1),
        lat: round(lat, 4),
        lon: round(lon, 4),
        altitude_m: round(f.plume_injection_height_m * (1 - 0.6 * t)),
        pm25_concentration: round(f.estimated_emission_rate_kg_s * 9 * (1 - 0.75 * t)),
      }
    })
    return {
      fire_id: f.id,
      district: f.district,
      state: f.state,
      origin_lat: f.lat,
      origin_lon: f.lon,
      frp_mw: f.mean_frp_mw,
      delhi_eta_hours: eta,
      delhi_impact_pm25_ug_m3: round((f.estimated_emission_rate_kg_s * 180) / km, 1),
      trajectory_points: points,
    }
  })
}

export function buildFeedback(forecast: HourlyForecastPoint[]): AerosolFeedbackDiagnostic[] {
  return forecast.map((p) => {
    const aod = round(0.35 + p.pm25 / 320, 2)
    const lh = istHour(p.timestamp)
    const sun = Math.max(0, Math.sin((Math.PI * (lh - 7)) / 11))
    const dimming = round(-aod * 62 * sun, 1)
    const cooling = round(dimming * 0.028, 2)
    const suppression = round(sun * aod * 190)
    const baseline = round(p.pbl_height_m + suppression)
    const multiplier = round((baseline / Math.max(p.pbl_height_m, 150) - 1) * 100 + 4 * aod, 1)
    const uncoupled = round(p.pm25 / (1 + multiplier / 100))
    return {
      hour_offset: p.hour_offset,
      timestamp: p.timestamp,
      aod_550nm: aod,
      solar_dimming_w_m2: dimming,
      surface_cooling_c: cooling,
      baseline_pbl_m: baseline,
      coupled_pbl_m: p.pbl_height_m,
      pbl_suppression_m: suppression,
      trapping_multiplier_pct: multiplier,
      uncoupled_pm25: uncoupled,
      coupled_pm25: p.pm25,
      feedback_delta_pm25: round(p.pm25 - uncoupled),
    }
  })
}

export function buildSounding(p: HourlyForecastPoint): InversionSounding {
  const inv = p.inversion_layer_active
  const top = inv ? round(180 + p.inversion_strength_c_100m * 180) : undefined
  const levels = Array.from({ length: 31 }, (_, i) => {
    const alt = i * 100
    let temp: number
    if (inv && top) {
      temp = alt <= top ? p.temp_c + (alt / 100) * p.inversion_strength_c_100m : p.temp_c + (top / 100) * p.inversion_strength_c_100m - ((alt - top) / 1000) * 6.5
    } else {
      temp = alt <= p.pbl_height_m ? p.temp_c - (alt / 1000) * 9.8 : p.temp_c - (p.pbl_height_m / 1000) * 9.8 - ((alt - p.pbl_height_m) / 1000) * 6.5
    }
    const dew = temp - (2.5 + alt / 220 + (100 - p.humidity_pct) / 8)
    const mixTop = inv && top ? Math.max(top, p.pbl_height_m) : p.pbl_height_m
    const pm = alt <= mixTop ? p.pm25 * (1 - 0.25 * (alt / mixTop)) : p.pm25 * 0.75 * Math.exp(-(alt - mixTop) / 260) + 12
    return {
      altitude_m: alt,
      pressure_hpa: round(1013 * Math.exp(-alt / 8400)),
      temp_c: round(temp, 1),
      dew_point_c: round(dew, 1),
      lapse_rate_c_km: 0,
      pm25_ug_m3: round(pm),
    }
  }).map((l, i, arr) => ({
    ...l,
    lapse_rate_c_km: i === 0 ? 0 : round(((l.temp_c - arr[i - 1].temp_c) / 100) * 1000, 1),
  }))
  const vc = round(p.pbl_height_m * (p.wind_speed_kmh / 3.6))
  return {
    timestamp: p.timestamp,
    hour_offset: p.hour_offset,
    surface_temp_c: p.temp_c,
    pbl_height_m: p.pbl_height_m,
    inversion_base_m: inv ? 0 : undefined,
    inversion_top_m: top,
    inversion_strength_c_100m: p.inversion_strength_c_100m,
    capping_inversion: !inv && p.pbl_height_m < 600,
    trapping_efficiency_pct: round(clamp(100 - p.pbl_height_m / 16 + p.inversion_strength_c_100m * 8, 10, 98)),
    ventilation_coefficient_m2_s: vc,
    levels,
  }
}

const ZONES: [string, string, number, number, number, string][] = [
  ['Okhla Phase II', 'Industrial Area', 28.5355, 77.2785, 1.35, 'Waste-to-energy plant stack'],
  ['Bawana Industrial', 'DSIIDC Cluster', 28.7982, 77.0386, 1.62, 'Unregistered plastic processing units'],
  ['Narela Industrial', 'DSIIDC Cluster', 28.8527, 77.0929, 1.18, 'Rubber & footwear boilers'],
  ['Wazirpur', 'Steel Pickling', 28.6995, 77.1627, 1.48, 'Acid pickling & coal furnaces'],
  ['Mayapuri Phase I', 'Scrap & Metal', 28.6397, 77.1266, 1.07, 'Scrap metal smelting'],
  ['Sahibabad', 'UPSIDC Estate', 28.6765, 77.3421, 1.29, 'Diesel generator clusters'],
  ['Faridabad NIT', 'HSIIDC Estate', 28.3923, 77.3009, 1.12, 'Brick kiln & foundries'],
]

export function buildAnomalies(forecast: HourlyForecastPoint[], hour = 0): IndustrialAnomaly[] {
  const p = forecast[hour]
  return ZONES.map(([zone, sector, lat, lon, m, source], i): IndustrialAnomaly => {
    const expected = round(p.pm25 * (0.95 + (i % 3) * 0.04))
    const surge = m * (1 + 0.1 * Math.sin(hour / 3 + i))
    const actual = round(expected * surge)
    const excess = round(((actual - expected) / expected) * 100)
    const z = round(excess / 12, 1)
    return {
      id: `anom-${i}`,
      zone,
      sector,
      lat,
      lon,
      expected_pm25: expected,
      actual_pm25: actual,
      excess_pct: excess,
      z_score: z,
      severity: z >= 4 ? 'critical' : z >= 2 ? 'elevated' : 'watch',
      likely_source: source,
      detected_at: p.timestamp,
    }
  }).sort((a, b) => b.z_score - a.z_score)
}

export function buildDashboard(): DashboardData {
  const forecast = buildForecast()
  const fires = buildFires()
  return {
    forecast,
    stations: buildStations(forecast, 0),
    fires,
    trajectories: buildTrajectories(fires),
    feedback: buildFeedback(forecast),
    anomalies: buildAnomalies(forecast, 0),
    issuedAt: FORECAST_INIT,
  }
}

export function runSimulation(forecast: HourlyForecastPoint[], input: SimulationInput): SimulationResult {
  const points = forecast.map((p) => {
    const stubbleShare = p.stubble_contribution_pct / 100
    const urbanShare = 1 - stubbleShare
    const stubbleFactor = 1 - stubbleShare * (input.stubbleBan / 100)
    const urbanFactor = 1 - urbanShare * ((input.vehicleCut / 100) * 0.38 + (input.industrialCut / 100) * 0.42)
    const windFactor = 1 / Math.pow(input.windMultiplier, 0.65)
    const mitigatedPm = Math.max(20, p.pm25 * (stubbleFactor + urbanFactor - 1) * windFactor)
    return {
      hour_offset: p.hour_offset,
      label: `+${p.hour_offset}h`,
      baseline_aqi: p.aqi,
      mitigated_aqi: pm25ToAqi(mitigatedPm),
      baseline_pm25: p.pm25,
      mitigated_pm25: round(mitigatedPm),
    }
  })
  const baselinePeakAqi = Math.max(...points.map((p) => p.baseline_aqi))
  const mitigatedPeakAqi = Math.max(...points.map((p) => p.mitigated_aqi))
  const pm25Avoided = round(Math.max(...points.map((p) => p.baseline_pm25)) - Math.max(...points.map((p) => p.mitigated_pm25)))
  return {
    points,
    baselinePeakAqi,
    mitigatedPeakAqi,
    pm25Avoided,
    baselineStage: grapFromAqi(baselinePeakAqi).name,
    mitigatedStage: grapFromAqi(mitigatedPeakAqi).name,
  }
}
