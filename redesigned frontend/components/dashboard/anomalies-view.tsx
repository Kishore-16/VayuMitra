'use client'

import { useState } from 'react'
import { Bell, CircleCheck, Factory, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IndustrialAnomaly } from '@/lib/types'
import { Explainer, Panel, SectionTitle } from './primitives'

const SEVERITY = {
  critical: { label: 'Critical', color: '#ef4444' },
  elevated: { label: 'Elevated', color: '#f97316' },
  watch: { label: 'Watch', color: '#eab308' },
}

export function AnomaliesView({
  anomalies,
  onLocate,
}: {
  anomalies: IndustrialAnomaly[]
  onLocate: (a: IndustrialAnomaly) => void
}) {
  const [notified, setNotified] = useState<Set<string>>(new Set())
  const critical = anomalies.filter((a) => a.severity === 'critical').length
  const maxActual = Math.max(...anomalies.map((a) => a.actual_pm25))

  return (
    <div className="grid gap-4">
      <Panel glow>
        <SectionTitle
          icon={<Factory className="size-4" />}
          eyebrow="Context-aware spike detector"
          title={critical ? `${critical} industrial zone${critical > 1 ? 's' : ''} emitting far above expected` : 'No critical industrial spikes'}
          action={
            <div className="flex gap-2 text-xs">
              {Object.entries(SEVERITY).map(([k, s]) => (
                <span key={k} className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          }
        />
        <ul className="flex flex-col gap-3">
          {anomalies.map((a) => {
            const sev = SEVERITY[a.severity]
            const isNotified = notified.has(a.id)
            return (
              <li key={a.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4" style={{ borderLeft: `3px solid ${sev.color}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.zone}</h3>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${sev.color}22`, color: sev.color }}>
                        {sev.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.sector} · Likely source: {a.likely_source}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onLocate(a)}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/5"
                    >
                      <MapPin className="size-3.5" aria-hidden /> View on map
                    </button>
                    <button
                      onClick={() => setNotified((s) => new Set(s).add(a.id))}
                      disabled={isNotified}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        isNotified ? 'bg-emerald/15 text-emerald' : 'bg-rose/15 text-rose hover:bg-rose/25',
                      )}
                    >
                      {isNotified ? <CircleCheck className="size-3.5" aria-hidden /> : <Bell className="size-3.5" aria-hidden />}
                      {isNotified ? 'Authorities notified' : 'Notify DPCC'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-muted-foreground">Expected</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${(a.expected_pm25 / maxActual) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right font-mono tabular-nums">{a.expected_pm25} µg/m³</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-muted-foreground">Measured</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${(a.actual_pm25 / maxActual) * 100}%`, backgroundColor: sev.color }} />
                    </div>
                    <span className="w-24 text-right font-mono tabular-nums" style={{ color: sev.color }}>
                      {a.actual_pm25} µg/m³
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  <strong className="font-mono" style={{ color: sev.color }}>
                    +{a.excess_pct}%
                  </strong>{' '}
                  above what weather and background pollution explain · z-score {a.z_score}
                </p>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Explainer>
        On a bad-air day, every monitor reads high — so a high number alone doesn&apos;t mean someone is breaking rules. This detector first predicts
        what each industrial zone <em>should</em> read given today&apos;s weather and smoke, then flags zones reading far above that. A large gap points
        to a local source worth inspecting.
      </Explainer>
    </div>
  )
}
