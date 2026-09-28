'use client'

import { AlertTriangle, CloudFog, Flame, Layers, LayoutDashboard, Map, RefreshCw, ShieldAlert, SlidersHorizontal, Sun, Tornado } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabId } from '@/lib/types'
import type { GrapStage } from '@/lib/aqi'

export const TABS: { id: TabId; label: string; icon: typeof Map; blurb: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, blurb: 'What is happening and why' },
  { id: 'map', label: 'Live Map', icon: Map, blurb: 'Stations, fires and wind' },
  { id: 'heatmap', label: 'Thermal Heatmap', icon: Layers, blurb: 'Spatial pollution & AQI distribution' },
  { id: 'sounding', label: 'Inversion', icon: CloudFog, blurb: 'The lid trapping smog' },
  { id: 'feedback', label: 'Aerosol Feedback', icon: Sun, blurb: 'How smog makes itself worse' },
  { id: 'plumes', label: 'Stubble Smoke', icon: Flame, blurb: 'Crop fires upwind' },
  { id: 'grap', label: 'GRAP Advisor', icon: ShieldAlert, blurb: 'Rules in force' },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle, blurb: 'Suspicious local spikes' },
]

export function Navbar({
  tab,
  onTab,
  stage,
  onSandbox,
  onRefresh,
  refreshing,
  source,
}: {
  tab: TabId
  onTab: (t: TabId) => void
  stage: GrapStage
  onSandbox: () => void
  onRefresh: () => void
  refreshing: boolean
  source?: 'live' | 'emulated'
}) {
  return (
    <header className="sticky top-0 z-[1000] border-b border-white/5 bg-[#080d1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky to-indigo text-white shadow-lg shadow-sky/20">
            <Tornado className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-wide sm:text-base">DELHI-AIR-COUPLED</p>
            <p className="text-[11px] text-muted-foreground">
              WRF-Chem v4.5+ Emulated
              <span className="mx-1.5 text-slate-600">·</span>
              <span className={source === 'live' ? 'text-emerald' : 'text-sky'}>{source === 'live' ? 'Live backend' : 'In-browser model'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
            style={{ backgroundColor: `${stage.color}1f`, color: stage.color, boxShadow: `inset 0 0 0 1px ${stage.color}66, 0 0 20px -4px ${stage.color}` }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: stage.color }} />
              <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: stage.color }} />
            </span>
            GRAP {stage.name.replace('Stage ', '')} · {stage.short}
          </div>
          <button
            onClick={onSandbox}
            className="flex items-center gap-2 rounded-full bg-indigo px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo/30 transition hover:brightness-110 sm:text-sm"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <span className="hidden sm:inline">What-If Sandbox</span>
            <span className="sm:hidden">What-If</span>
          </button>
          <button
            onClick={onRefresh}
            className="rounded-full border border-white/10 p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            aria-label="Refresh data"
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <nav aria-label="Dashboard sections" className="mx-auto max-w-[1600px] px-4 lg:px-6">
        <ul className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = id === tab
            return (
              <li key={id}>
                <button
                  onClick={() => onTab(id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition',
                    active ? 'border-sky text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4', active && 'text-sky')} aria-hidden />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
