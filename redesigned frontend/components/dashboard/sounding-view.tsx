'use client'

import { ArrowDown, ArrowUp, CloudFog, Thermometer } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'
import type { InversionSounding } from '@/lib/types'
import { Explainer, Panel, SectionTitle, Stat, axisProps, chartTooltipStyle } from './primitives'

function dispersion(vc: number) {
  if (vc < 2000) return { label: 'Very poor dispersion', color: '#ef4444' }
  if (vc < 4000) return { label: 'Poor dispersion', color: '#f97316' }
  if (vc < 6000) return { label: 'Moderate dispersion', color: '#eab308' }
  return { label: 'Good dispersion', color: '#10b981' }
}

export function SoundingView({ sounding }: { sounding: InversionSounding }) {
  const disp = dispersion(sounding.ventilation_coefficient_m2_s)
  const inv = sounding.inversion_top_m !== undefined

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4">
        <Stat
          label="Inversion strength"
          value={sounding.inversion_strength_c_100m}
          unit="°C / 100 m"
          color="#818cf8"
          hint={inv ? 'Air warms as you go up — a lid' : 'Air cools with height — normal'}
        />
        <Stat
          label="Inversion layer"
          value={inv ? `${sounding.inversion_base_m}–${sounding.inversion_top_m}` : '—'}
          unit="m AGL"
          color="#a5b4fc"
          hint={sounding.capping_inversion ? 'Elevated capping inversion' : inv ? 'Ground-based inversion' : 'No inversion at this hour'}
        />
        <Stat
          label="Ventilation coefficient"
          value={sounding.ventilation_coefficient_m2_s.toLocaleString('en-IN')}
          unit="m²/s"
          color={disp.color}
          hint={<span style={{ color: disp.color }}>{disp.label}</span>}
        />
        <Stat label="Trapping efficiency" value={sounding.trapping_efficiency_pct} unit="%" color="#fb7185" hint="Share of emissions held near ground" />
      </div>

      <Panel className="lg:col-span-8">
        <SectionTitle icon={<Thermometer className="size-4" />} eyebrow="Vertical profile · 0–3000 m" title="Temperature vs height (sounding)" />
        <div className="h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sounding.levels} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" {...axisProps} domain={['dataMin - 2', 'dataMax + 2']} unit="°C" tickFormatter={(v) => Math.round(v).toString()} />
              <YAxis type="number" dataKey="altitude_m" {...axisProps} domain={[0, 3000]} ticks={[0, 500, 1000, 1500, 2000, 2500, 3000]} unit="m" width={60} />
              {inv && (
                <ReferenceArea
                  y1={sounding.inversion_base_m}
                  y2={sounding.inversion_top_m}
                  fill="#6366f1"
                  fillOpacity={0.18}
                  label={{ value: 'INVERSION TRAP LAYER', fill: '#a5b4fc', fontSize: 11, fontWeight: 700, position: 'insideTopRight' }}
                />
              )}
              <ReferenceLine
                y={sounding.pbl_height_m}
                stroke="#38bdf8"
                strokeDasharray="6 4"
                label={{ value: `PBL ceiling ${sounding.pbl_height_m} m`, fill: '#38bdf8', fontSize: 11, position: 'insideBottomRight' }}
              />
              <Tooltip {...chartTooltipStyle} labelFormatter={(_, p) => `${p?.[0]?.payload?.altitude_m ?? ''} m · ${p?.[0]?.payload?.pressure_hpa ?? ''} hPa`} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Line dataKey="temp_c" name="Temperature °C" stroke="#fb7185" strokeWidth={2.5} dot={false} />
              <Line dataKey="dew_point_c" name="Dew point °C" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel className="lg:col-span-4">
        <SectionTitle icon={<CloudFog className="size-4" />} eyebrow="PM2.5 stratification" title="Where the smog sits" />
        <div className="h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sounding.levels} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="pmVert" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" {...axisProps} dataKey="pm25_ug_m3" />
              <YAxis type="number" dataKey="altitude_m" {...axisProps} domain={[0, 3000]} ticks={[0, 1000, 2000, 3000]} width={44} />
              <ReferenceLine y={sounding.pbl_height_m} stroke="#38bdf8" strokeDasharray="6 4" />
              <Tooltip {...chartTooltipStyle} labelFormatter={(_, p) => `${p?.[0]?.payload?.altitude_m ?? ''} m`} formatter={(v) => [`${v} µg/m³`, 'PM2.5']} />
              <Area dataKey="pm25_ug_m3" type="monotone" stroke="#ef4444" strokeWidth={2} fill="url(#pmVert)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2 lg:col-span-12">
        <div className="glass flex gap-4 rounded-2xl p-4">
          <div className="flex w-14 shrink-0 flex-col items-center justify-between rounded-xl bg-gradient-to-b from-sky-900/60 to-rose-500/40 py-2 text-[10px] font-semibold">
            <span>Cool</span>
            <ArrowUp className="size-4 text-emerald" aria-hidden />
            <span>Warm</span>
          </div>
          <div>
            <p className="font-semibold text-emerald">Normal day: air cools with height</p>
            <p className="mt-1 text-sm text-slate-300">Warm polluted air near the ground is lighter, so it rises and spreads out — like steam leaving an open pot.</p>
          </div>
        </div>
        <div className="glass flex gap-4 rounded-2xl p-4">
          <div className="flex w-14 shrink-0 flex-col items-center justify-between rounded-xl bg-gradient-to-b from-rose-500/40 to-sky-900/60 py-2 text-[10px] font-semibold">
            <span>Warm</span>
            <ArrowDown className="size-4 text-rose" aria-hidden />
            <span>Cold</span>
          </div>
          <div>
            <p className="font-semibold text-rose">Inversion: air warms with height</p>
            <p className="mt-1 text-sm text-slate-300">Cold, heavy air is stuck under a warm layer. Smoke can&apos;t rise past it — the lid is on the pot.</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-12">
        <Explainer>
          Follow the red temperature line upward. Where it <strong className="text-foreground">leans right</strong> (getting warmer with height), that&apos;s the
          inversion lid shaded in purple. The blue dashed line is the mixing ceiling — pollution is mixed evenly below it and drops sharply above
          it, as the PM2.5 chart on the right shows. A ventilation coefficient under 6,000 m²/s means the air can&apos;t flush pollution effectively.
        </Explainer>
      </div>
    </div>
  )
}
