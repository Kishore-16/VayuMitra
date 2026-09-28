'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Car, Factory, Flame, Wind } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HourlyForecastPoint, SimulationInput, SimulationResult } from '@/lib/types'
import { aqiColor, grapFromAqi } from '@/lib/aqi'
import { runSimulation } from '@/lib/emulator'
import { runLiveOrEmulatedSimulation } from '@/lib/api'
import { Modal, axisProps, chartTooltipStyle } from './primitives'

const CONTROLS: {
  key: keyof SimulationInput
  label: string
  help: string
  icon: typeof Flame
  min: number
  max: number
  step: number
  format: (v: number) => string
  color: string
}[] = [
  { key: 'stubbleBan', label: 'Stubble-burning enforcement', help: 'Share of crop fires stopped', icon: Flame, min: 0, max: 100, step: 5, format: (v) => `${v}%`, color: '#f59e0b' },
  { key: 'vehicleCut', label: 'Vehicle emission cut (odd-even)', help: 'Reduction in traffic emissions', icon: Car, min: 0, max: 80, step: 5, format: (v) => `${v}%`, color: '#38bdf8' },
  { key: 'industrialCut', label: 'Industrial & construction curfew', help: 'Reduction in factory & C&D dust', icon: Factory, min: 0, max: 80, step: 5, format: (v) => `${v}%`, color: '#818cf8' },
  { key: 'windMultiplier', label: 'Weather: wind speed', help: 'What if winds were stronger or calmer?', icon: Wind, min: 0.3, max: 2.5, step: 0.1, format: (v) => `${v.toFixed(1)}x`, color: '#10b981' },
]

const SCENARIOS: { label: string; value: SimulationInput }[] = [
  { label: 'Do nothing', value: { stubbleBan: 0, vehicleCut: 0, industrialCut: 0, windMultiplier: 1 } },
  { label: 'Stubble ban only', value: { stubbleBan: 80, vehicleCut: 0, industrialCut: 0, windMultiplier: 1 } },
  { label: 'Odd-even + curfew', value: { stubbleBan: 0, vehicleCut: 40, industrialCut: 50, windMultiplier: 1 } },
  { label: 'Full emergency', value: { stubbleBan: 90, vehicleCut: 50, industrialCut: 60, windMultiplier: 1 } },
]

export function PolicySimulatorModal({
  open,
  onClose,
  forecast,
  isLive = false,
}: {
  open: boolean
  onClose: () => void
  forecast: HourlyForecastPoint[]
  isLive?: boolean
}) {
  const [input, setInput] = useState<SimulationInput>({ stubbleBan: 50, vehicleCut: 20, industrialCut: 30, windMultiplier: 1 })
  const fallbackResult = useMemo(() => runSimulation(forecast, input), [forecast, input])
  const [liveResult, setLiveResult] = useState<SimulationResult | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    runLiveOrEmulatedSimulation(forecast, input, isLive).then((res) => {
      if (active) setLiveResult(res)
    })
    return () => {
      active = false
    }
  }, [open, forecast, input, isLive])

  const result = liveResult || fallbackResult
  const baseStage = grapFromAqi(result.baselinePeakAqi)
  const mitStage = grapFromAqi(result.mitigatedPeakAqi)

  return (
    <Modal open={open} onClose={onClose} size="xl" title="What-If Policy Sandbox" subtitle="Drag the sliders to test interventions and see how the next 72 hours could change.">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button key={s.label} onClick={() => setInput(s.value)} className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10">
                {s.label}
              </button>
            ))}
          </div>
          {CONTROLS.map(({ key, label, help, icon: Icon, min, max, step, format, color }) => (
            <div key={key} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`sim-${key}`} className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4" style={{ color }} aria-hidden />
                  {label}
                </label>
                <span className="font-mono text-sm tabular-nums" style={{ color }}>
                  {format(input[key])}
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{help}</p>
              <input
                id={`sim-${key}`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={input[key]}
                onChange={(e) => setInput((s) => ({ ...s, [key]: Number(e.target.value) }))}
                className="w-full"
                style={{ accentColor: color }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="grid grid-cols-3 items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Peak AQI now</p>
              <p className="font-mono text-4xl font-bold tabular-nums" style={{ color: aqiColor(result.baselinePeakAqi) }}>
                {result.baselinePeakAqi}
              </p>
              <p className="text-xs font-semibold" style={{ color: baseStage.color }}>
                {baseStage.name}
              </p>
            </div>
            <ArrowRight className="mx-auto size-6 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">With your policy</p>
              <p className="font-mono text-4xl font-bold tabular-nums" style={{ color: aqiColor(result.mitigatedPeakAqi) }}>
                {result.mitigatedPeakAqi}
              </p>
              <p className="text-xs font-semibold" style={{ color: mitStage.color }}>
                {mitStage.name}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald/10 p-3">
              <p className="text-xs text-emerald">Peak PM2.5 avoided</p>
              <p className="font-mono text-2xl font-bold text-emerald">{result.pm25Avoided} µg/m³</p>
            </div>
            <div className="rounded-xl bg-sky/10 p-3">
              <p className="text-xs text-sky">GRAP outcome</p>
              <p className="text-sm font-semibold text-sky">
                {baseStage.id === mitStage.id ? 'Stage unchanged' : `Downshifted ${baseStage.name.replace('Stage ', '')} → ${mitStage.name.replace('Stage ', '')}`}
              </p>
            </div>
          </div>
          <div className="h-64 rounded-2xl border border-white/5 bg-white/[0.02] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.points} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="simBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="simMit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="hour_offset" {...axisProps} tickFormatter={(h) => (h % 12 === 0 ? `+${h}h` : '')} interval={0} />
                <YAxis {...axisProps} domain={[0, 500]} />
                <ReferenceLine y={400} stroke="#a855f7" strokeDasharray="4 4" label={{ value: 'Severe', fill: '#a855f7', fontSize: 10, position: 'insideTopLeft' }} />
                <ReferenceLine y={300} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Very Poor', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                <Tooltip {...chartTooltipStyle} labelFormatter={(h) => `+${h}h`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="baseline_aqi" name="Unmitigated AQI" stroke="#ef4444" fill="url(#simBase)" strokeWidth={2} />
                <Area type="monotone" dataKey="mitigated_aqi" name="With policy" stroke="#10b981" fill="url(#simMit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Modal>
  )
}
