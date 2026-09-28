'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Activity, AlertTriangle, CloudFog, Flame, Layers, MapPin, Sparkles, Wind } from 'lucide-react'
import type { CPCBStation, HourlyForecastPoint, PlumeTrajectory, StubbleFire } from '@/lib/types'
import { aqiBand, pm25ToAqi } from '@/lib/aqi'
import { Explainer, Panel, SectionTitle, Stat } from './primitives'

const MapboxThermalMap = dynamic(() => import('./map/mapbox-thermal-map'), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Initializing WebGL Mapbox GL Engine…</div>,
})

const LEGEND_ITEMS = [
  { label: '> 300', category: 'Severe+', color: '#ef4444', desc: 'Critical Hazard' },
  { label: '201 – 300', category: 'Very Poor', color: '#f97316', desc: 'Unhealthy' },
  { label: '101 – 200', category: 'Poor', color: '#eab308', desc: 'Moderate Risk' },
  { label: '51 – 100', category: 'Satisfactory', color: '#84cc16', desc: 'Acceptable' },
  { label: '0 – 50', category: 'Good', color: '#06b6d4', desc: 'Clean Air' },
]

export function HeatmapView({
  point,
  forecast,
  stations,
  fires,
  trajectories,
  hour,
}: {
  point: HourlyForecastPoint
  forecast: HourlyForecastPoint[]
  stations: CPCBStation[]
  fires: StubbleFire[]
  trajectories: PlumeTrajectory[]
  hour: number
}) {
  const [metric, setMetric] = useState<'pm25' | 'aqi'>('pm25')
  const [mode, setMode] = useState<'thermal' | 'dual_plume'>('thermal')

  // Calculate 3-Day Outlook (Today, Tomorrow, Day 3)
  const day1Points = forecast.slice(0, 24)
  const day2Points = forecast.slice(24, 48)
  const day3Points = forecast.slice(48, 72)

  const getDayStats = (pts: HourlyForecastPoint[]) => {
    if (!pts.length) return { aqi: 150, band: aqiBand(150) }
    const maxAqi = Math.max(...pts.map((p) => p.aqi))
    return { aqi: maxAqi, band: aqiBand(maxAqi) }
  }

  const today = getDayStats(day1Points)
  const tomorrow = getDayStats(day2Points)
  const day3 = getDayStats(day3Points)

  const earliestPlume = trajectories.length ? [...trajectories].sort((a, b) => a.delhi_eta_hours - b.delhi_eta_hours)[0] : null
  const maxStation = stations.length ? [...stations].sort((a, b) => b.current_aqi - a.current_aqi)[0] : null

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Delhi NCR – 72 Hour Thermal Pollution Heatmap
            </h2>
            <span className="rounded-full bg-rose/15 px-2.5 py-0.5 text-xs font-semibold text-rose">
              Live Spatial Inverse Distance Mesh
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Continuous spatial distribution overlay across Delhi, Noida, Ghaziabad, Gurugram & Faridabad
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
            <button
              onClick={() => setMetric('pm25')}
              className={`rounded-full px-3 py-1 font-semibold transition ${metric === 'pm25' ? 'bg-sky text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
            >
              PM2.5 (µg/m³)
            </button>
            <button
              onClick={() => setMetric('aqi')}
              className={`rounded-full px-3 py-1 font-semibold transition ${metric === 'aqi' ? 'bg-sky text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
            >
              AQI Index
            </button>
          </div>

          <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
            <button
              onClick={() => setMode('thermal')}
              className={`rounded-full px-3 py-1 font-semibold transition ${mode === 'thermal' ? 'bg-indigo text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Thermal Heatmesh
            </button>
            <button
              onClick={() => setMode('dual_plume')}
              className={`rounded-full px-3 py-1 font-semibold transition ${mode === 'dual_plume' ? 'bg-amber text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Satellite Plumes + Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Heatmap + 72h Outlook Insights */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Main Thermal Map (8 cols) */}
        <Panel className="relative overflow-hidden p-0 lg:col-span-8">
          <div className="relative h-[550px] md:h-[680px]">
            <MapboxThermalMap
              stations={stations}
              metric={metric}
              mode={mode}
              fires={fires}
              trajectories={trajectories}
            />

            {/* Floating Top Info Overlay */}
            <div className="glass absolute left-4 top-4 z-[500] flex items-center gap-3 rounded-2xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-rose" />
                </span>
                <span className="font-semibold text-foreground">Hour +{hour}h Forecast</span>
              </div>
              <span className="text-slate-600">·</span>
              <span className="text-sky font-semibold">PBL Ceiling: {point.pbl_height_m}m</span>
            </div>

            {/* Spatial Color Scale Legend (Image 2 style) */}
            <div className="glass absolute bottom-4 right-4 z-[500] flex flex-col gap-2 rounded-2xl p-3.5 shadow-2xl border border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {metric === 'pm25' ? 'PM2.5 (µg/m³)' : 'AQI Scale'} Thermal Legend
              </p>
              <div className="flex flex-col gap-1.5">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-3.5 rounded" style={{ backgroundColor: item.color }} />
                      <span className="font-mono font-bold text-foreground">{item.label}</span>
                    </div>
                    <span className="font-semibold" style={{ color: item.color }}>
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Right Side Panel: 72h AQI Outlook & Major Insights (4 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* 72-Hour AQI Outlook Cards (Matching Image 1) */}
          <Panel>
            <SectionTitle icon={<Sparkles className="size-4 text-sky" />} eyebrow="72-Hour Forecast" title="AQI Horizon Outlook" />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {/* Today Card */}
              <div
                className="flex flex-col items-center rounded-2xl p-3 border transition shadow-lg"
                style={{
                  backgroundColor: `${today.band.color}15`,
                  borderColor: `${today.band.color}44`,
                }}
              >
                <span className="text-[11px] font-semibold text-muted-foreground">Today</span>
                <span className="font-mono text-2xl font-black" style={{ color: today.band.color }}>
                  {today.aqi}
                </span>
                <span className="text-[10px] font-bold" style={{ color: today.band.color }}>
                  {today.band.label}
                </span>
              </div>

              {/* Tomorrow Card */}
              <div
                className="flex flex-col items-center rounded-2xl p-3 border transition shadow-lg"
                style={{
                  backgroundColor: `${tomorrow.band.color}15`,
                  borderColor: `${tomorrow.band.color}44`,
                }}
              >
                <span className="text-[11px] font-semibold text-muted-foreground">Tomorrow</span>
                <span className="font-mono text-2xl font-black" style={{ color: tomorrow.band.color }}>
                  {tomorrow.aqi}
                </span>
                <span className="text-[10px] font-bold" style={{ color: tomorrow.band.color }}>
                  {tomorrow.band.label}
                </span>
              </div>

              {/* Day 3 Card */}
              <div
                className="flex flex-col items-center rounded-2xl p-3 border transition shadow-lg"
                style={{
                  backgroundColor: `${day3.band.color}15`,
                  borderColor: `${day3.band.color}44`,
                }}
              >
                <span className="text-[11px] font-semibold text-muted-foreground">Day 3</span>
                <span className="font-mono text-2xl font-black" style={{ color: day3.band.color }}>
                  {day3.aqi}
                </span>
                <span className="text-[10px] font-bold" style={{ color: day3.band.color }}>
                  {day3.band.label}
                </span>
              </div>
            </div>
          </Panel>

          {/* Major Insights Panel (Matching Image 1) */}
          <Panel className="flex-1">
            <SectionTitle icon={<Activity className="size-4 text-indigo" />} eyebrow="Coupled Diagnostic" title="Major Atmospheric Insights" />
            <div className="mt-3 flex flex-col gap-3.5">
              {/* Insight 1: Stubble Smoke */}
              <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber">
                  <Flame className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Stubble Burning Smoke Trajectory</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {earliestPlume
                      ? `Plume from ${earliestPlume.district} reaching Delhi in ~${earliestPlume.delhi_eta_hours}h (+${earliestPlume.delhi_impact_pm25_ug_m3} µg/m³ PM2.5).`
                      : 'Active crop residue plumes moving downwind towards Delhi NCR.'}
                  </p>
                </div>
              </div>

              {/* Insight 2: Inversion */}
              <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose/15 text-rose">
                  <CloudFog className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Atmospheric Inversion Risk</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {point.inversion_layer_active
                      ? `Strong inversion active (${point.inversion_strength_c_100m} °C/100m) trapping PM2.5 under low ${point.pbl_height_m}m PBL.`
                      : 'Thermal convective mixing active; lower trapping efficiency during daytime hours.'}
                  </p>
                </div>
              </div>

              {/* Insight 3: Wind Conditions */}
              <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky/15 text-sky">
                  <Wind className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Wind Dispersion Conditions</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {point.wind_speed_kmh < 5
                      ? `Calm winds (${point.wind_speed_kmh} km/h from ${point.wind_dir_compass}) causing severe stagnant accumulation.`
                      : `Winds blowing at ${point.wind_speed_kmh} km/h from ${point.wind_dir_compass} aiding regional transport.`}
                  </p>
                </div>
              </div>

              {/* Insight 4: Hotspot Alert */}
              {maxStation && (
                <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Peak Thermal Intensity Zone</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Highest pollution density centered near <strong className="text-foreground">{maxStation.name}</strong> ({maxStation.current_aqi} AQI).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Explainer title="Understanding Spatial Thermal AQI Distributions">
        The thermal heatmap applies Inverse Distance Weighting (IDW) interpolation across Delhi-NCR monitor arrays and satellite aerosol optical depth grid points. 
        <strong className="text-rose"> Red thermal cores</strong> represent severe ground-level accumulation zones, while <strong className="text-sky">cyan fringes</strong> indicate favorable atmospheric dispersion corridors. Use the 72-hour timeline slider to watch the thermal plume expand dynamically over time.
      </Explainer>
    </div>
  )
}
