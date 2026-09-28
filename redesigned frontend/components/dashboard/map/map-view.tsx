'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Crosshair, Layers as LayersIcon, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CPCBStation, HourlyForecastPoint, IndustrialAnomaly, PlumeTrajectory, StubbleFire } from '@/lib/types'
import { AQI_BANDS, aqiBand } from '@/lib/aqi'
import { Explainer, Panel } from '../primitives'
import { WindCanvas } from './wind-canvas'
import { BASEMAPS, PRESETS, type Basemap, type Layers, type Preset } from './map-config'

const LeafletMap = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
})

const LAYER_LABELS: { id: keyof Layers; label: string; swatch: string }[] = [
  { id: 'stations', label: 'Monitoring stations', swatch: '#ef4444' },
  { id: 'heat', label: 'AQI halo', swatch: '#a855f7' },
  { id: 'fires', label: 'Crop fires (VIIRS)', swatch: '#f97316' },
  { id: 'plumes', label: 'Smoke trajectories', swatch: '#f59e0b' },
  { id: 'wind', label: 'Wind flow', swatch: '#bae6fd' },
  { id: 'anomalies', label: 'Industrial spikes', swatch: '#ef4444' },
  { id: 'airshed', label: 'Airshed boundary', swatch: '#38bdf8' },
]

export function MapView({
  point,
  stations,
  fires,
  trajectories,
  anomalies,
  target,
  onTarget,
  onStation,
}: {
  point: HourlyForecastPoint
  stations: CPCBStation[]
  fires: StubbleFire[]
  trajectories: PlumeTrajectory[]
  anomalies: IndustrialAnomaly[]
  target: { center: [number, number]; zoom: number; key: number }
  onTarget: (t: { center: [number, number]; zoom: number; key: number }) => void
  onStation: (id: string) => void
}) {
  const [basemap, setBasemap] = useState<Basemap>('dark')
  const [layers, setLayers] = useState<Layers>({ stations: true, fires: true, plumes: true, wind: true, heat: true, airshed: true, anomalies: true })
  const [panelOpen, setPanelOpen] = useState(true)
  const [preset, setPreset] = useState<Preset>('ncr')

  const sorted = [...stations].sort((a, b) => b.current_aqi - a.current_aqi).slice(0, 12)

  return (
    <div className="flex flex-col gap-4">
      <Panel className="relative overflow-hidden p-0">
        <div className="relative h-[520px] md:h-[680px]">
          <LeafletMap
            stations={stations}
            fires={fires}
            trajectories={trajectories}
            anomalies={anomalies}
            layers={layers}
            basemap={basemap}
            target={target}
            onStation={onStation}
          />
          {layers.wind && <WindCanvas dirDeg={point.wind_dir_deg} speedKmh={point.wind_speed_kmh} />}

          <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-2">
            {(Object.keys(PRESETS) as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPreset(p)
                  onTarget({ ...PRESETS[p], key: Date.now() })
                }}
                className={cn(
                  'glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  preset === p ? 'text-sky ring-1 ring-sky/50' : 'text-slate-300 hover:text-foreground',
                )}
              >
                <Crosshair className="size-3.5" aria-hidden />
                {PRESETS[p].label}
              </button>
            ))}
          </div>

          <div className="absolute right-3 top-3 z-[500] w-60">
            <button
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              className="glass ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              <LayersIcon className="size-3.5" aria-hidden /> Layers
            </button>
            {panelOpen && (
              <div className="glass-glow mt-2 rounded-2xl p-3">
                <fieldset>
                  <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Show on map</legend>
                  {LAYER_LABELS.map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-white/5">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: l.swatch }} />
                        {l.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={layers[l.id]}
                        onChange={(e) => setLayers((s) => ({ ...s, [l.id]: e.target.checked }))}
                        className="size-3.5 accent-sky-400"
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset className="mt-3 border-t border-white/5 pt-3">
                  <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Basemap</legend>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(BASEMAPS) as Basemap[]).map((b) => (
                      <button
                        key={b}
                        onClick={() => setBasemap(b)}
                        aria-pressed={basemap === b}
                        className={cn('rounded-lg px-2 py-1.5 text-[11px] font-medium transition', basemap === b ? 'bg-sky/15 text-sky' : 'bg-white/5 text-slate-300 hover:bg-white/10')}
                      >
                        {BASEMAPS[b].label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </div>

          <div className="glass absolute bottom-3 left-3 z-[500] flex flex-col gap-2 rounded-2xl p-3">
            <div className="flex items-center gap-2 text-xs">
              <Navigation className="size-4 text-sky" style={{ transform: `rotate(${point.wind_dir_deg + 180}deg)` }} aria-hidden />
              <span>
                Wind <strong>{point.wind_speed_kmh} km/h</strong> from {point.wind_dir_compass}
              </span>
            </div>
            <div className="flex gap-0.5" aria-label="AQI colour legend">
              {AQI_BANDS.map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1">
                  <span className="h-2 w-9 rounded-sm first:rounded-l-full" style={{ backgroundColor: b.color }} />
                  <span className="text-[9px] text-muted-foreground">{b.label.replace('Satisfactory', 'Satisf.')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Explainer title="How to read this map">
        Each <strong className="text-foreground">coloured dot</strong> is an air monitor — its colour is the AQI category. Pulsing{' '}
        <strong className="text-orange">orange rings</strong> are crop fires seen by satellite; the dotted amber lines show where their smoke drifts. The
        moving streaks show wind direction. Use <strong className="text-foreground">Punjab stubble belt</strong> to zoom out and see the fires feeding Delhi.
      </Explainer>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Most polluted stations at this hour</h3>
        <ul className="scrollbar-thin flex snap-x gap-3 overflow-x-auto pb-2">
          {sorted.map((s, i) => {
            const band = aqiBand(s.current_aqi)
            return (
              <li key={s.id} className="snap-start">
                <button
                  onClick={() => {
                    onTarget({ center: [s.lat, s.lon], zoom: 13, key: Date.now() })
                    onStation(s.id)
                  }}
                  className="glass flex w-48 flex-col items-start rounded-2xl p-3 text-left transition hover:ring-1 hover:ring-sky/40"
                >
                  <span className="text-[11px] font-mono text-muted-foreground">#{i + 1}</span>
                  <span className="truncate text-sm font-semibold">{s.name}</span>
                  <span className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold" style={{ color: band.color }}>
                      {s.current_aqi}
                    </span>
                    <span className="text-xs" style={{ color: band.color }}>
                      {band.label}
                    </span>
                  </span>
                  <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full" style={{ width: `${(s.current_aqi / 500) * 100}%`, backgroundColor: band.color }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
