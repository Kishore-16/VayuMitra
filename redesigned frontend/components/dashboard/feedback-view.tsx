'use client'

import { ArrowRight, CloudFog, RefreshCcw, Snowflake, Sun, Wind } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AerosolFeedbackDiagnostic } from '@/lib/types'
import { hourLabel } from '@/lib/aqi'
import { Explainer, Panel, SectionTitle, Stat, axisProps, chartTooltipStyle } from './primitives'

const LOOP = [
  { icon: CloudFog, title: 'Smog thickens', color: '#ef4444' },
  { icon: Sun, title: 'Sunlight blocked', color: '#f59e0b' },
  { icon: Snowflake, title: 'Ground cools', color: '#38bdf8' },
  { icon: Wind, title: 'Mixing layer shrinks', color: '#818cf8' },
]

export function FeedbackView({ feedback, hour }: { feedback: AerosolFeedbackDiagnostic[]; hour: number }) {
  const cur = feedback[hour]
  const data = feedback.map((f) => ({ ...f, label: hourLabel(f.timestamp) }))
  const totalTrapped = Math.round(feedback.reduce((s, f) => s + f.feedback_delta_pm25, 0) / feedback.length)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel glow className="lg:col-span-2">
        <SectionTitle icon={<RefreshCcw className="size-4" />} eyebrow="Two-way aerosol–radiation–PBL coupling" title="A vicious cycle: smog makes the weather that traps smog" />
        <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {LOOP.map(({ icon: Icon, title, color }, i) => (
            <li key={title} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <span className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold">{title}</span>
              </div>
              {i < LOOP.length - 1 ? (
                <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground md:block" aria-hidden />
              ) : (
                <RefreshCcw className="hidden size-4 shrink-0 text-rose md:block" aria-hidden />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-300">
          Averaged over the 72 hours, this feedback loop adds{' '}
          <strong className="font-mono text-rose">+{totalTrapped} µg/m³</strong> of PM2.5 that a traditional (uncoupled) model would miss.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
        <Stat label="Solar dimming" value={cur.solar_dimming_w_m2} unit="W/m²" color="#f59e0b" hint="Less sunshine reaching ground" />
        <Stat label="Surface cooling" value={cur.surface_cooling_c} unit="°C" color="#38bdf8" hint="Colder ground = weaker mixing" />
        <Stat label="PBL suppressed by" value={cur.pbl_suppression_m} unit="m" color="#818cf8" hint={`${cur.baseline_pbl_m} → ${cur.coupled_pbl_m} m`} />
        <Stat label="Feedback PM2.5" value={`+${cur.feedback_delta_pm25}`} unit="µg/m³" color="#fb7185" hint={`AOD ${cur.aod_550nm} at 550 nm`} />
      </div>

      <Panel>
        <SectionTitle eyebrow="PM2.5 µg/m³" title="Traditional vs coupled forecast" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="coupled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="uncoupled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="hour_offset" {...axisProps} tickFormatter={(h) => (h % 12 === 0 ? `+${h}h` : '')} interval={0} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} labelFormatter={(_, p) => (p?.[0]?.payload?.label as string) ?? ''} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={hour} stroke="#38bdf8" strokeWidth={2} />
              <Area type="monotone" dataKey="uncoupled_pm25" name="Uncoupled (traditional)" stroke="#94a3b8" strokeDasharray="4 3" fill="url(#uncoupled)" />
              <Area type="monotone" dataKey="coupled_pm25" name="Coupled (DELHI-AIR)" stroke="#ef4444" strokeWidth={2} fill="url(#coupled)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <SectionTitle eyebrow="Boundary layer height, m" title="How much the lid is pushed down" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="pblBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pblCoupled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="hour_offset" {...axisProps} tickFormatter={(h) => (h % 12 === 0 ? `+${h}h` : '')} interval={0} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipStyle} labelFormatter={(_, p) => (p?.[0]?.payload?.label as string) ?? ''} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={hour} stroke="#38bdf8" strokeWidth={2} />
              <Area type="monotone" dataKey="baseline_pbl_m" name="Clean-air PBL" stroke="#38bdf8" strokeDasharray="4 3" fill="url(#pblBase)" />
              <Area type="monotone" dataKey="coupled_pbl_m" name="Compressed PBL (with smog)" stroke="#a855f7" strokeWidth={2} fill="url(#pblCoupled)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="lg:col-span-2">
        <Explainer>
          Most forecasts treat weather and pollution separately. In reality, thick smog acts like a sunshade: the ground heats up less during the
          day, so the mixing layer stays shallow and pollution stays concentrated. The gap between the grey and red curves is the extra pollution
          caused purely by this effect — which is why coupled models forecast Delhi&apos;s worst days more accurately.
        </Explainer>
      </div>
    </div>
  )
}
