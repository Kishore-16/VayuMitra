'use client'

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CPCBStation, HourlyForecastPoint } from '@/lib/types'
import { aqiBand, hourLabel, pm25ToAqi } from '@/lib/aqi'
import { AqiPill, Modal, Stat, axisProps, chartTooltipStyle } from './primitives'

export function StationDetailModal({
  station,
  forecast,
  hour,
  onClose,
}: {
  station: CPCBStation | null
  forecast: HourlyForecastPoint[]
  hour: number
  onClose: () => void
}) {
  if (!station) return null
  const band = aqiBand(station.current_aqi)
  const series = forecast.map((p, i) => {
    const pm = Math.round(p.pm25 * station.multiplier * (1 + Math.sin(i / 5) * 0.05))
    return { h: p.hour_offset, label: hourLabel(p.timestamp), pm25: pm, aqi: pm25ToAqi(pm) }
  })

  return (
    <Modal open onClose={onClose} title={station.name} subtitle={`${station.city}, ${station.state} · ${station.type} continuous monitor · ${station.lat.toFixed(3)}°N ${station.lon.toFixed(3)}°E`}>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <p className="font-mono text-5xl font-bold tabular-nums" style={{ color: band.color }}>
          {station.current_aqi}
        </p>
        <div>
          <AqiPill aqi={station.current_aqi} />
          <p className="mt-1 max-w-sm text-sm text-slate-300">{band.advice}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="PM2.5" value={station.current_pm25} unit="µg/m³" color="#ef4444" />
        <Stat label="PM10" value={station.current_pm10} unit="µg/m³" color="#f97316" />
        <Stat label="NO₂" value={station.current_no2} unit="µg/m³" color="#818cf8" />
        <Stat label="O₃" value={station.current_o3} unit="µg/m³" color="#38bdf8" />
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">72-hour downscaled forecast for this station</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="h" {...axisProps} tickFormatter={(h) => (h % 12 === 0 ? `+${h}h` : '')} interval={0} />
            <YAxis {...axisProps} />
            <Tooltip {...chartTooltipStyle} labelFormatter={(_, p) => (p?.[0]?.payload?.label as string) ?? ''} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={hour} stroke="#38bdf8" strokeWidth={2} />
            <Line type="monotone" dataKey="aqi" name="AQI" stroke="#f1f5f9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pm25" name="PM2.5 µg/m³" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Modal>
  )
}
