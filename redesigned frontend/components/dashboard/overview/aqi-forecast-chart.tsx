'use client'

import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HourlyForecastPoint } from '@/lib/types'
import { AQI_BANDS, hourLabel } from '@/lib/aqi'
import { axisProps, chartTooltipStyle } from '../primitives'

export function AqiForecastChart({
  forecast,
  hour,
  onHour,
  height = 260,
}: {
  forecast: HourlyForecastPoint[]
  hour: number
  onHour?: (h: number) => void
  height?: number
}) {
  const data = forecast.map((p) => ({ h: p.hour_offset, label: hourLabel(p.timestamp), aqi: p.aqi, pm25: p.pm25 }))
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
          onClick={(state) => {
            const idx = state?.activeTooltipIndex
            if (onHour && idx !== undefined && idx !== null) onHour(Number(idx))
          }}
          style={{ cursor: onHour ? 'pointer' : undefined }}
        >
          <defs>
            <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f1f5f9" stopOpacity={0} />
            </linearGradient>
          </defs>
          {AQI_BANDS.slice(2).map((b) => (
            <ReferenceArea key={b.label} y1={b.min} y2={b.max} fill={b.color} fillOpacity={0.09} stroke="none" ifOverflow="hidden" />
          ))}
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="h" {...axisProps} tickFormatter={(h) => (h % 12 === 0 ? `+${h}h` : '')} interval={0} />
          <YAxis {...axisProps} domain={[100, 500]} ticks={[200, 300, 400, 450, 500]} />
          <Tooltip
            {...chartTooltipStyle}
            labelFormatter={(_, p) => (p?.[0]?.payload?.label as string) ?? ''}
            formatter={(v, name) => [v, name === 'aqi' ? 'AQI' : 'PM2.5 µg/m³']}
          />
          <ReferenceLine x={hour} stroke="#38bdf8" strokeWidth={2} />
          <Area type="monotone" dataKey="aqi" stroke="#f1f5f9" strokeWidth={2} fill="url(#aqiFill)" activeDot={{ r: 5, fill: '#38bdf8' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
