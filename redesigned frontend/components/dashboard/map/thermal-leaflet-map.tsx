'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { CPCBStation, HourlyForecastPoint, PlumeTrajectory, StubbleFire } from '@/lib/types'
import { aqiBand, pm25ToAqi } from '@/lib/aqi'
import { BASEMAPS, PRESETS } from './map-config'

const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Noida', lat: 28.5355, lon: 77.391 },
  { name: 'Ghaziabad', lat: 28.6692, lon: 77.4538 },
  { name: 'Gurugram', lat: 28.4595, lon: 77.0266 },
  { name: 'Faridabad', lat: 28.4089, lon: 77.3178 },
]

// Detailed Delhi-NCR Region Boundary Polygon
const DELHI_NCR_BOUNDARY: [number, number][] = [
  [28.88, 76.92],
  [28.92, 77.10],
  [28.88, 77.28],
  [28.78, 77.42],
  [28.68, 77.50],
  [28.55, 77.54],
  [28.35, 77.40],
  [28.25, 77.20],
  [28.28, 77.02],
  [28.42, 76.82],
  [28.62, 76.78],
  [28.80, 76.85],
  [28.88, 76.92],
]

// Exact Color Scale matching Reference Image 2:
// > 300: Red (#ef4444)
// 201 - 300: Orange (#f97316)
// 101 - 200: Yellow (#eab308)
// 51 - 100: Green (#84cc16)
// 0 - 50: Cyan (#06b6d4)
function getHeatColorExact(val: number, isPm25: boolean): string {
  const pm25 = isPm25 ? val : val * 0.6 // Convert AQI to PM2.5 scale if needed

  if (pm25 > 300) return 'rgb(239, 68, 68)'    // > 300 Red
  if (pm25 > 200) return 'rgb(249, 115, 22)'   // 201 - 300 Orange
  if (pm25 > 100) return 'rgb(234, 179, 8)'    // 101 - 200 Yellow
  if (pm25 > 50) return 'rgb(132, 204, 22)'    // 51 - 100 Green
  return 'rgb(6, 182, 212)'                    // 0 - 50 Cyan
}

function ThermalOverlayCanvas({
  stations,
  metric,
  opacity,
}: {
  stations: CPCBStation[]
  metric: 'pm25' | 'aqi'
  opacity: number
}) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = map.getContainer()
    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.className = 'pointer-events-none absolute inset-0 z-[400]'
      container.appendChild(canvas)
      canvasRef.current = canvas
    }

    const isPm25 = metric === 'pm25'

    const render = () => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const size = map.getSize()
      const dpr = window.devicePixelRatio || 1
      canvas.width = size.x * dpr
      canvas.height = size.y * dpr
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size.x, size.y)

      if (!stations.length) return

      // Clip canvas strictly inside Delhi-NCR boundary polygon (just like in uploaded image)
      ctx.save()
      ctx.beginPath()
      DELHI_NCR_BOUNDARY.forEach(([lat, lon], idx) => {
        const pt = map.latLngToContainerPoint([lat, lon])
        if (idx === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      ctx.closePath()
      ctx.clip()

      // Calculate grid steps across screen bounds
      const step = 4
      const cols = Math.ceil(size.x / step)
      const rows = Math.ceil(size.y / step)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * step
          const py = r * step

          // Convert screen pixel (px, py) to geographic lat/lon
          const latLng = map.containerPointToLatLng([px, py])
          const lat = latLng.lat
          const lon = latLng.lng

          // Geographic Inverse Distance Weighting (IDW)
          let num = 0
          let den = 0

          for (let i = 0; i < stations.length; i++) {
            const s = stations[i]
            const dLat = lat - s.lat
            const dLon = lon - s.lon
            const distSq = dLat * dLat + dLon * dLon + 0.0001
            const w = 1 / (distSq * distSq) // Weighting power 4 for smooth geographic contours
            const val = isPm25 ? s.current_pm25 : s.current_aqi
            num += w * val
            den += w
          }

          const interpVal = den > 0 ? num / den : 0
          ctx.fillStyle = getHeatColorExact(interpVal, isPm25)
          ctx.globalAlpha = opacity
          ctx.fillRect(px, py, step, step)
        }
      }

      ctx.restore()
      ctx.globalAlpha = 1.0
    }

    render()
    map.on('move', render)
    map.on('zoom', render)
    map.on('resize', render)

    return () => {
      map.off('move', render)
      map.off('zoom', render)
      map.off('resize', render)
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
        canvasRef.current = null
      }
    }
  }, [map, stations, metric, opacity])

  return null
}

export default function ThermalLeafletMap({
  stations,
  metric,
  mode,
  fires,
  trajectories,
}: {
  stations: CPCBStation[]
  metric: 'pm25' | 'aqi'
  mode: 'thermal' | 'dual_plume'
  fires: StubbleFire[]
  trajectories: PlumeTrajectory[]
}) {
  const bm = BASEMAPS.dark

  return (
    <MapContainer center={PRESETS.ncr.center} zoom={PRESETS.ncr.zoom} className="size-full" zoomControl={false} scrollWheelZoom>
      <TileLayer url={bm.url} attribution={bm.attribution} />
      
      {/* Delhi-NCR Masked Spatial Thermal Overlay */}
      <ThermalOverlayCanvas stations={stations} metric={metric} opacity={mode === 'dual_plume' ? 0.65 : 0.82} />

      {/* Crisp White/Cyan Border outlining Delhi-NCR (Image 1 & 2 Style) */}
      <Polygon
        positions={DELHI_NCR_BOUNDARY}
        pathOptions={{
          color: '#ffffff',
          weight: 2.5,
          fillColor: 'transparent',
          fillOpacity: 0,
        }}
      />

      {/* City Labels Overlay (Image 1 Style) */}
      {CITIES.map((c) => (
        <Marker
          key={c.name}
          position={[c.lat, c.lon]}
          icon={L.divIcon({
            className: '',
            html: `<div style="transform:translate(-50%,-50%);background:rgba(8,13,26,0.9);border:1.5px solid rgba(255,255,255,0.8);padding:3px 10px;border-radius:14px;color:#ffffff;font-size:13px;font-weight:900;white-space:nowrap;box-shadow:0 0 12px rgba(0,0,0,0.8)">${c.name}</div>`,
            iconSize: [0, 0],
          })}
        />
      ))}

      {/* Dual Plume Satellite Smoke Mode (Image 3 Style) */}
      {mode === 'dual_plume' &&
        trajectories.map((t) => (
          <Polyline
            key={`plume-${t.fire_id}`}
            positions={t.trajectory_points.map((p) => [p.lat, p.lon] as [number, number])}
            pathOptions={{ color: '#f59e0b', weight: 4 + t.frp_mw / 10, opacity: 0.8, dashArray: '6 8' }}
          >
            <Tooltip sticky>
              <strong>{t.district} Smoke Plume</strong> · ETA ~{t.delhi_eta_hours}h · +{t.delhi_impact_pm25_ug_m3} µg/m³
            </Tooltip>
          </Polyline>
        ))}

      {/* Station Indicators */}
      {stations.map((s) => {
        const val = metric === 'pm25' ? s.current_pm25 : s.current_aqi
        const band = aqiBand(s.current_aqi)
        return (
          <CircleMarker
            key={`st-${s.id}`}
            center={[s.lat, s.lon]}
            radius={6}
            pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: band.color, fillOpacity: 1.0 }}
          >
            <Tooltip direction="top">
              <strong>{s.name}</strong> · {val} {metric === 'pm25' ? 'µg/m³' : 'AQI'} ({band.label})
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
