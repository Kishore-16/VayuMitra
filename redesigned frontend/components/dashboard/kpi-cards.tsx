'use client'

import { CloudFog, Flame, Gauge, Navigation, Sun, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AerosolFeedbackDiagnostic, HourlyForecastPoint } from '@/lib/types'
import { aqiBand, aqiColor, grapFromAqi } from '@/lib/aqi'
import { AqiPill } from './primitives'

function Card({
  icon,
  label,
  value,
  unit,
  accent,
  children,
  meaning,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  unit?: string
  accent: string
  children?: ReactNode
  meaning: string
}) {
  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-4">
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: accent }} />
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1f`, color: accent }}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums" style={{ color: accent }}>
        {value}
        {unit && <span className="ml-1 font-sans text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{children}</div>
      <p className="mt-2 border-t border-white/5 pt-2 text-[11px] leading-snug text-slate-400">{meaning}</p>
    </div>
  )
}

export function KpiCards({
  point,
  forecast,
  feedback,
}: {
  point: HourlyForecastPoint
  forecast: HourlyForecastPoint[]
  feedback: AerosolFeedbackDiagnostic
}) {
  const peak = forecast.reduce((a, b) => (b.aqi > a.aqi ? b : a))
  const avgPm = Math.round(forecast.reduce((s, p) => s + p.pm25, 0) / forecast.length)
  const band = aqiBand(point.aqi)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card
        icon={<Gauge className="size-3.5" />}
        label="AQI at selected hour"
        value={point.aqi}
        accent={band.color}
        meaning={band.advice}
      >
        <AqiPill aqi={point.aqi} />
        <span>PM2.5 {point.pm25} µg/m³</span>
      </Card>
      <Card
        icon={<TrendingUp className="size-3.5" />}
        label="72h peak AQI"
        value={peak.aqi}
        accent={aqiColor(peak.aqi)}
        meaning={`Worst hour ahead: +${peak.hour_offset}h. Plan outdoor tasks away from it.`}
      >
        <span>{grapFromAqi(peak.aqi).name}</span>
        <span className="text-slate-600">·</span>
        <span>avg PM2.5 {avgPm}</span>
      </Card>
      <Card
        icon={<CloudFog className="size-3.5" />}
        label="Mixing height (PBL)"
        value={point.pbl_height_m}
        unit="m"
        accent="#818cf8"
        meaning={point.pbl_height_m < 500 ? 'Low ceiling — pollution is squeezed near the ground.' : 'Air can mix upward, diluting pollution.'}
      >
        {point.inversion_layer_active ? (
          <span className="rounded-full bg-indigo/15 px-2 py-0.5 font-medium text-indigo-300">Inversion {point.inversion_strength_c_100m}°C/100m</span>
        ) : (
          <span className="rounded-full bg-emerald/15 px-2 py-0.5 font-medium text-emerald">No inversion</span>
        )}
      </Card>
      <Card
        icon={<Flame className="size-3.5" />}
        label="Stubble smoke share"
        value={point.stubble_contribution_pct}
        unit="%"
        accent="#f59e0b"
        meaning={`About ${Math.round(point.stubble_contribution_pct / 10)} in 10 particles come from crop fires in Punjab & Haryana.`}
      >
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-amber" style={{ width: `${point.stubble_contribution_pct}%` }} />
        </div>
      </Card>
      <Card
        icon={<Sun className="size-3.5" />}
        label="Sunlight blocked"
        value={feedback.solar_dimming_w_m2}
        unit="W/m²"
        accent="#fb7185"
        meaning="Smog blocks sunlight, cooling the ground and deepening the trap."
      >
        <span>AOD {feedback.aod_550nm}</span>
        <span className="text-slate-600">·</span>
        <span>{feedback.surface_cooling_c}°C cooling</span>
      </Card>
      <Card
        icon={<Navigation className="size-3.5" style={{ transform: `rotate(${point.wind_dir_deg + 180}deg)` }} />}
        label="Surface weather"
        value={point.temp_c}
        unit="°C"
        accent="#38bdf8"
        meaning={point.wind_speed_kmh < 8 ? 'Calm winds — smoke is not being blown away.' : 'Breezy — winds help flush pollution out.'}
      >
        <span>RH {point.humidity_pct}%</span>
        <span className="text-slate-600">·</span>
        <span>
          {point.wind_speed_kmh} km/h {point.wind_dir_compass}
        </span>
      </Card>
    </div>
  )
}
