'use client'

import { Clock, Flame, Map as MapIcon } from 'lucide-react'
import type { PlumeTrajectory, StubbleFire } from '@/lib/types'
import { Explainer, Panel, SectionTitle, Stat } from './primitives'

export function PlumesView({
  fires,
  trajectories,
  onShowMap,
}: {
  fires: StubbleFire[]
  trajectories: PlumeTrajectory[]
  onShowMap: () => void
}) {
  const total = fires.reduce((s, f) => s + (f.active_fires || 0), 0)
  const meanFrp = total > 0 ? Math.round(fires.reduce((s, f) => s + (f.mean_frp_mw || 0) * (f.active_fires || 1), 0) / total) : 0
  const flux = Math.round(fires.reduce((s, f) => s + (f.estimated_emission_rate_kg_s || 0), 0))

  const rows = fires
    .map((f) => {
      const t = trajectories.find((tr) => tr.fire_id === f.id) || {
        fire_id: f.id,
        district: f.district,
        state: f.state,
        origin_lat: f.lat,
        origin_lon: f.lon,
        frp_mw: f.mean_frp_mw || 0,
        delhi_eta_hours: 18,
        delhi_impact_pm25_ug_m3: Math.round((f.active_fires || 1) * 1.5),
        trajectory_points: [],
      }
      return { f, t }
    })
    .sort((a, b) => (b.t?.delhi_impact_pm25_ug_m3 || 0) - (a.t?.delhi_impact_pm25_ug_m3 || 0))

  const maxImpact = Math.max(...rows.map((r) => r.t?.delhi_impact_pm25_ug_m3 || 0), 1)
  const soonest = rows.length ? [...rows].sort((a, b) => (a.t?.delhi_eta_hours || 0) - (b.t?.delhi_eta_hours || 0))[0] : null

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active fire hotspots" value={total.toLocaleString('en-IN')} color="#f97316" hint="NASA VIIRS / MODIS · last 24h" />
        <Stat label="Mean fire radiative power" value={meanFrp} unit="MW" color="#f59e0b" hint="How intensely fields burn" />
        <Stat label="Smoke emission flux" value={flux} unit="kg/s" color="#fb7185" hint="PM2.5 released per second" />
        <Stat
          label="First smoke arrival"
          value={soonest?.t?.delhi_eta_hours !== undefined ? `${soonest.t.delhi_eta_hours} h` : '—'}
          color="#38bdf8"
          hint={soonest?.f?.district ? `From ${soonest.f.district}` : 'No active plumes detected'}
        />
      </div>

      <Panel>
        <SectionTitle
          icon={<Flame className="size-4" />}
          eyebrow="Hotspots & forward trajectories"
          title="Which fires hit Delhi hardest?"
          action={
            <button onClick={onShowMap} className="flex items-center gap-2 rounded-full bg-amber/15 px-3 py-1.5 text-xs font-semibold text-amber transition hover:bg-amber/25">
              <MapIcon className="size-3.5" aria-hidden /> See plumes on map
            </button>
          }
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">District</th>
                <th className="py-2 pr-3 text-right font-medium">Fires</th>
                <th className="py-2 pr-3 text-right font-medium">FRP (MW)</th>
                <th className="py-2 pr-3 text-right font-medium">Smoke height</th>
                <th className="py-2 pr-3 text-right font-medium">ETA to Delhi</th>
                <th className="py-2 font-medium">Impact on Delhi PM2.5</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ f, t }) => (
                <tr key={f.id} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-semibold">{f.district}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.state} · {f.crop_type}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">{f.active_fires}</td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">{f.mean_frp_mw}</td>
                  <td className="py-3 pr-3 text-right font-mono tabular-nums">{(f.plume_injection_height_m || 0).toLocaleString('en-IN')} m</td>
                  <td className="py-3 pr-3 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky/10 px-2 py-0.5 font-mono text-xs text-sky">
                      <Clock className="size-3" aria-hidden />
                      {t?.delhi_eta_hours ?? '—'} h
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber to-rose" style={{ width: `${((t?.delhi_impact_pm25_ug_m3 || 0) / maxImpact) * 100}%` }} />
                      </div>
                      <span className="w-20 text-right font-mono text-xs tabular-nums text-rose">+{t?.delhi_impact_pm25_ug_m3 || 0} µg/m³</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Explainer>
        After the rice harvest, farmers in Punjab and Haryana burn leftover straw. Satellites detect each fire and measure how hot it burns (FRP).
        North-westerly winds then carry the smoke 250–400 km to Delhi. <strong className="text-foreground">ETA</strong> is how long that smoke takes
        to arrive; <strong className="text-foreground">impact</strong> is how much it adds to the PM2.5 Delhi breathes.
      </Explainer>
    </div>
  )
}
