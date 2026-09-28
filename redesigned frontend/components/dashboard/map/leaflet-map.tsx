'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { CPCBStation, IndustrialAnomaly, PlumeTrajectory, StubbleFire } from '@/lib/types'
import { aqiColor, aqiBand } from '@/lib/aqi'
import { DELHI } from '@/lib/emulator'

import { BASEMAPS, PRESETS, type Basemap, type Layers } from './map-config'

const AIRSHED: [number, number][] = [
  [28.95, 76.8],
  [28.95, 77.55],
  [28.35, 77.55],
  [28.3, 77.0],
  [28.45, 76.75],
]

function FlyTo({ target }: { target: { center: [number, number]; zoom: number; key: number } }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(target.center, target.zoom, { duration: 1.1 })
  }, [map, target])
  return null
}

const fireIcon = (size: number) =>
  L.divIcon({
    className: '',
    html: `<div class="fire-marker" style="width:${size}px;height:${size}px"><span class="ring"></span><span class="core"></span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

const anomalyIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:6px;background:#ef4444;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;box-shadow:0 0 14px #ef4444">!</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

export default function LeafletMap({
  stations,
  fires,
  trajectories,
  anomalies,
  layers,
  basemap,
  target,
  onStation,
}: {
  stations: CPCBStation[]
  fires: StubbleFire[]
  trajectories: PlumeTrajectory[]
  anomalies: IndustrialAnomaly[]
  layers: Layers
  basemap: Basemap
  target: { center: [number, number]; zoom: number; key: number }
  onStation: (id: string) => void
}) {
  const fireIcons = useMemo(() => new Map(fires.map((f) => [f.id, fireIcon(Math.round(14 + f.mean_frp_mw / 2))])), [fires])
  const bm = BASEMAPS[basemap]

  return (
    <MapContainer center={PRESETS.ncr.center} zoom={PRESETS.ncr.zoom} className="size-full" zoomControl={false} scrollWheelZoom>
      <TileLayer key={basemap} url={bm.url} attribution={bm.attribution} />
      <FlyTo target={target} />

      {layers.airshed && (
        <Polygon positions={AIRSHED} pathOptions={{ color: '#38bdf8', weight: 1.5, dashArray: '6 6', fillColor: '#38bdf8', fillOpacity: 0.04 }}>
          <Tooltip sticky>Delhi-NCR airshed boundary</Tooltip>
        </Polygon>
      )}

      {layers.heat &&
        stations.map((s) => (
          <Circle
            key={`heat-${s.id}`}
            center={[s.lat, s.lon]}
            radius={3500}
            pathOptions={{ stroke: false, fillColor: aqiColor(s.current_aqi), fillOpacity: 0.22 }}
          />
        ))}

      {layers.plumes &&
        trajectories.map((t) => (
          <Polyline
            key={t.fire_id}
            positions={t.trajectory_points.map((p) => [p.lat, p.lon] as [number, number])}
            pathOptions={{ color: '#f59e0b', weight: 2 + t.frp_mw / 14, opacity: 0.55, dashArray: '2 8', lineCap: 'round' }}
          >
            <Tooltip sticky>
              <strong>{t.district} smoke plume</strong>
              <br />
              Reaches Delhi in ~{t.delhi_eta_hours} h · +{t.delhi_impact_pm25_ug_m3} µg/m³
            </Tooltip>
          </Polyline>
        ))}

      {layers.plumes && (
        <CircleMarker center={[DELHI.lat, DELHI.lon]} radius={10} pathOptions={{ color: '#f59e0b', weight: 2, fillOpacity: 0 }}>
          <Tooltip direction="top">Smoke arrival point · Central Delhi</Tooltip>
        </CircleMarker>
      )}

      {layers.fires &&
        fires.map((f) => (
          <Marker key={f.id} position={[f.lat, f.lon]} icon={fireIcons.get(f.id)}>
            <Popup>
              <div className="min-w-48 text-sm">
                <p className="font-bold">
                  {f.district}, {f.state}
                </p>
                <p className="text-xs text-slate-400">{f.crop_type} residue · {f.confidence}% confidence</p>
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <dt className="text-slate-400">Active fires</dt>
                  <dd className="text-right font-mono">{f.active_fires}</dd>
                  <dt className="text-slate-400">Fire power</dt>
                  <dd className="text-right font-mono">{f.mean_frp_mw} MW</dd>
                  <dt className="text-slate-400">Smoke height</dt>
                  <dd className="text-right font-mono">{f.plume_injection_height_m} m</dd>
                </dl>
              </div>
            </Popup>
          </Marker>
        ))}

      {layers.anomalies &&
        anomalies
          .filter((a) => a.severity !== 'watch')
          .map((a) => (
            <Marker key={a.id} position={[a.lat, a.lon]} icon={anomalyIcon}>
              <Tooltip direction="top">
                <strong>{a.zone}</strong> · +{a.excess_pct}% above expected
              </Tooltip>
            </Marker>
          ))}

      {layers.stations &&
        stations.map((s) => {
          const band = aqiBand(s.current_aqi)
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lon]}
              radius={9}
              pathOptions={{ color: '#0b1220', weight: 2, fillColor: band.color, fillOpacity: 0.95 }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {s.name} · <strong>{s.current_aqi}</strong>
              </Tooltip>
              <Popup>
                <div className="min-w-52 text-sm">
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-slate-400">
                    {s.state} · {s.type} monitor
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold" style={{ color: band.color }}>
                      {s.current_aqi}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: band.color }}>
                      {band.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    PM2.5 {s.current_pm25} · PM10 {s.current_pm10} µg/m³
                  </p>
                  <button
                    onClick={() => onStation(s.id)}
                    className="mt-3 w-full rounded-lg bg-sky px-3 py-1.5 text-xs font-semibold text-slate-950"
                  >
                    View 72h forecast
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
    </MapContainer>
  )
}
