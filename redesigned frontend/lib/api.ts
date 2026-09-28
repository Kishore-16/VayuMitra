'use client'

import useSWR from 'swr'
import { buildDashboard, buildSounding, runSimulation as runEmulatedSimulation } from './emulator'
import type { DashboardData, HourlyForecastPoint, IndustrialAnomaly, InversionSounding, SimulationInput, SimulationResult } from './types'

const API_BASE = process.env.NEXT_PUBLIC_DELHI_AIR_API || 'http://localhost:8000/api'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`Request failed: ${path}`)
  return res.json() as Promise<T>
}

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST request failed: ${path}`)
  return res.json() as Promise<T>
}

function normalizeAnomalies(rawAnomalies: any, fallbackTimestamp?: string): IndustrialAnomaly[] {
  if (!rawAnomalies) return []
  const list = Array.isArray(rawAnomalies) ? rawAnomalies : (rawAnomalies.anomalies || [])
  return list.map((a: any, idx: number) => {
    const expected = a.expected_pm25 ?? a.dynamic_baseline ?? 300
    const actual = a.actual_pm25 ?? 450
    const excess = a.excess_pct ?? (expected > 0 ? Math.round(((actual - expected) / expected) * 100) : 50)
    const sevRaw = String(a.severity || 'CRITICAL').toLowerCase()
    const severity: 'critical' | 'elevated' | 'watch' = sevRaw.includes('crit')
      ? 'critical'
      : sevRaw.includes('high') || sevRaw.includes('elev')
      ? 'elevated'
      : 'watch'

    return {
      id: a.id || `anom_${idx}`,
      zone: a.zone || a.zone_name || 'Industrial Zone',
      sector: a.sector || 'NCR Industrial Sector',
      lat: Number(a.lat) || 28.7,
      lon: Number(a.lon) || 77.1,
      expected_pm25: expected,
      actual_pm25: actual,
      excess_pct: excess,
      z_score: a.z_score ?? Number(((actual - expected) / 35).toFixed(1)),
      severity,
      likely_source: a.likely_source || a.message || 'Unregulated industrial stack / combustion',
      detected_at: a.detected_at || a.timestamp || fallbackTimestamp || new Date().toISOString(),
    }
  })
}

async function loadDashboard(): Promise<DashboardData & { source: 'live' | 'emulated' }> {
  try {
    const [forecast, stations, fires, trajectories, feedback, rawAnomalies] = await Promise.all([
      getJson<DashboardData['forecast']>('/forecast/72h'),
      getJson<DashboardData['stations']>('/stations'),
      getJson<DashboardData['fires']>('/plume/fires'),
      getJson<DashboardData['trajectories']>('/plume/trajectories'),
      getJson<DashboardData['feedback']>('/forecast/feedback'),
      getJson<any>('/anomalies/current'),
    ])

    const anomalies = normalizeAnomalies(rawAnomalies, forecast[0]?.timestamp)
    const basePm25 = forecast[0]?.pm25 || 100

    return {
      forecast,
      stations: stations.map((s) => ({
        ...s,
        multiplier: s.multiplier ?? (s.current_pm25 ? s.current_pm25 / basePm25 : 1.0),
      })),
      fires,
      trajectories,
      feedback,
      anomalies,
      issuedAt: forecast[0]?.timestamp || new Date().toISOString(),
      source: 'live',
    }
  } catch (err) {
    console.warn('Backend API unreachable, using WRF-Chem emulator:', err)
  }

  return { ...buildDashboard(), source: 'emulated' }
}

export function useDashboard() {
  return useSWR('delhi-air-dashboard', loadDashboard, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
  })
}

export async function fetchLiveSounding(hour: number, fallbackPoint: HourlyForecastPoint): Promise<InversionSounding> {
  try {
    const sounding = await getJson<InversionSounding>(`/inversion/sounding?hour=${hour}`)
    if (sounding && sounding.levels) return sounding
  } catch (err) {
    // Fall back to emulator sounding if live API fails
  }
  return buildSounding(fallbackPoint)
}

export async function runLiveOrEmulatedSimulation(
  forecast: HourlyForecastPoint[],
  input: SimulationInput,
  isLive: boolean
): Promise<SimulationResult> {
  if (isLive) {
    try {
      const backendResult = await postJson<any>('/simulation/run', {
        stubble_reduction_pct: input.stubbleBan,
        traffic_reduction_pct: input.vehicleCut,
        industrial_reduction_pct: input.industrialCut,
        dust_control_pct: 30,
        wind_speed_multiplier: input.windMultiplier,
        wind_direction_shift_deg: 0,
      })

      const points = backendResult.hourly_comparison.map((pt: any) => ({
        hour_offset: pt.hour_offset,
        label: `+${pt.hour_offset}h`,
        baseline_aqi: pt.baseline_aqi,
        mitigated_aqi: pt.simulated_aqi,
        baseline_pm25: pt.baseline_pm25,
        mitigated_pm25: pt.simulated_pm25,
      }))

      return {
        points,
        baselinePeakAqi: Math.max(...points.map((p: any) => p.baseline_aqi)),
        mitigatedPeakAqi: Math.max(...points.map((p: any) => p.mitigated_aqi)),
        pm25Avoided: backendResult.peak_reduction_ug_m3,
        baselineStage: backendResult.baseline_grap_stage,
        mitigatedStage: backendResult.simulated_grap_stage,
      }
    } catch (err) {
      console.warn('Live simulation failed, using emulator:', err)
    }
  }

  return runEmulatedSimulation(forecast, input)
}
