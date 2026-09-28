'use client'

import 'mapbox-gl/dist/mapbox-gl.css'
import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import type { CPCBStation, PlumeTrajectory, StubbleFire } from '@/lib/types'
import { aqiBand } from '@/lib/aqi'
import { PRESETS } from './map-config'

const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Noida', lat: 28.5355, lon: 77.391 },
  { name: 'Ghaziabad', lat: 28.6692, lon: 77.4538 },
  { name: 'Gurugram', lat: 28.4595, lon: 77.0266 },
  { name: 'Faridabad', lat: 28.4089, lon: 77.3178 },
]

// Accurate Delhi-NCR Geographic Boundary Polygon [longitude, latitude]
const DELHI_NCR_BOUNDARY: [number, number][] = [
  [76.85, 28.88],
  [77.05, 28.94],
  [77.28, 28.90],
  [77.46, 28.78],
  [77.56, 28.65],
  [77.58, 28.48],
  [77.44, 28.30],
  [77.24, 28.20],
  [76.98, 28.24],
  [76.80, 28.38],
  [76.75, 28.60],
  [76.80, 28.78],
  [76.85, 28.88],
]

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// Color Gradient matching Reference Image 2:
// > 300: Red (#ef4444)
// 201 - 300: Orange (#f97316)
// 101 - 200: Yellow (#eab308)
// 51 - 100: Green (#84cc16)
// 0 - 50: Cyan (#06b6d4)
function getExactHeatColor(val: number, isPm25: boolean): string {
  const pm25 = isPm25 ? val : val * 0.6

  if (pm25 > 300) return 'rgba(239, 68, 68, 0.88)'   // Red
  if (pm25 > 200) return 'rgba(249, 115, 22, 0.85)'  // Orange
  if (pm25 > 100) return 'rgba(234, 179, 8, 0.82)'   // Yellow
  if (pm25 > 50)  return 'rgba(132, 204, 22, 0.78)'  // Green
  return 'rgba(6, 182, 212, 0.75)'                    // Cyan
}

export default function MapboxThermalMap({
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const cityMarkersRef = useRef<mapboxgl.Marker[]>([])

  const interpolatedValuesRef = useRef<number[]>([])
  const animFrameRef = useRef<number | null>(null)

  // 1. Initialize Mapbox Map ONCE on Mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [PRESETS.ncr.center[1], PRESETS.ncr.center[0]], // [lon, lat]
      zoom: PRESETS.ncr.zoom - 0.2,
      attributionControl: false,
    })

    mapRef.current = map

    // Canvas overlay for strict polygon-clipped spatial heatmap rendering
    const container = containerRef.current
    const canvas = document.createElement('canvas')
    canvas.className = 'pointer-events-none absolute inset-0 z-[400]'
    container.appendChild(canvas)
    canvasRef.current = canvas

    map.on('load', () => {
      // Add NCR Boundary Polygon GeoJSON Layer (White Outline matching Image 1 & 2)
      map.addSource('ncr-boundary-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [DELHI_NCR_BOUNDARY] },
          properties: {},
        },
      })

      map.addLayer({
        id: 'ncr-boundary-stroke',
        type: 'line',
        source: 'ncr-boundary-source',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.8,
          'line-opacity': 0.95,
        },
      })

      // Add City Labels (Delhi, Noida, Ghaziabad, Gurugram, Faridabad)
      CITIES.forEach((c) => {
        const el = document.createElement('div')
        el.style.cssText = `
          background: rgba(8, 13, 26, 0.92);
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          padding: 3px 10px;
          border-radius: 14px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 0 14px rgba(0, 0, 0, 0.85);
          transform: translate(-50%, -50%);
        `
        el.textContent = c.name

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([c.lon, c.lat])
          .addTo(map)

        cityMarkersRef.current.push(marker)
      })
    })

    const handleRender = () => {
      drawThermalMesh()
    }

    map.on('render', handleRender)
    map.on('move', handleRender)
    map.on('zoom', handleRender)
    map.on('resize', handleRender)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      cityMarkersRef.current.forEach((m) => m.remove())
      cityMarkersRef.current = []
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // 2. Spatial IDW Thermal Heatmap Renderer (Polygon Clipped Across Full Container)
  const drawThermalMesh = () => {
    const map = mapRef.current
    const canvas = canvasRef.current
    if (!map || !canvas || !stations.length) return

    const container = containerRef.current
    if (!container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const isPm25 = metric === 'pm25'
    const values = interpolatedValuesRef.current.length === stations.length
      ? interpolatedValuesRef.current
      : stations.map((s) => (isPm25 ? s.current_pm25 : s.current_aqi))

    // CLIP CANVAS STRICTLY TO DELHI-NCR POLYGON BOUNDARY (No square box!)
    ctx.save()
    ctx.beginPath()
    DELHI_NCR_BOUNDARY.forEach(([lon, lat], idx) => {
      const pt = map.project([lon, lat])
      if (idx === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.closePath()
    ctx.clip()

    // Spatial Grid IDW Interpolation across full map container
    const step = 6
    const cols = Math.ceil(w / step)
    const rows = Math.ceil(h / step)

    const targetOpacity = mode === 'dual_plume' ? 0.65 : 0.88

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = c * step + step / 2
        const py = r * step + step / 2

        const latLng = map.unproject([px, py])
        const lat = latLng.lat
        const lon = latLng.lng

        let num = 0
        let den = 0

        for (let i = 0; i < stations.length; i++) {
          const s = stations[i]
          const dLat = lat - s.lat
          const dLon = lon - s.lon
          const distSq = dLat * dLat + dLon * dLon + 0.00008
          const weight = 1 / (distSq * distSq) // Weighting power 4
          const val = values[i] ?? (isPm25 ? s.current_pm25 : s.current_aqi)

          num += weight * val
          den += weight
        }

        const interpVal = den > 0 ? num / den : 0
        ctx.fillStyle = getExactHeatColor(interpVal, isPm25)
        ctx.globalAlpha = targetOpacity
        ctx.fillRect(c * step, r * step, step + 0.5, step + 0.5)
      }
    }

    ctx.restore()
    ctx.globalAlpha = 1.0
  }

  // 3. Smooth Lerp Animation on Timeline Scrubber Change (60fps fluid morphing)
  useEffect(() => {
    if (!stations.length) return
    const isPm25 = metric === 'pm25'
    const targetValues = stations.map((s) => (isPm25 ? s.current_pm25 : s.current_aqi))

    if (!interpolatedValuesRef.current.length || interpolatedValuesRef.current.length !== targetValues.length) {
      interpolatedValuesRef.current = [...targetValues]
      drawThermalMesh()
      return
    }

    const startValues = [...interpolatedValuesRef.current]
    const startTime = performance.now()
    const duration = 220 // 220ms smooth fluid transition

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      interpolatedValuesRef.current = startValues.map((startVal, i) => {
        const targetVal = targetValues[i] ?? startVal
        return startVal + (targetVal - startVal) * easeProgress
      })

      drawThermalMesh()

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(animate)
  }, [stations, metric, mode])

  // 4. Update Station Markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    stations.forEach((s) => {
      const band = aqiBand(s.current_aqi)
      const val = metric === 'pm25' ? s.current_pm25 : s.current_aqi

      const el = document.createElement('div')
      el.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${band.color};
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px ${band.color};
        cursor: pointer;
      `

      const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(`
        <div style="color:#0f172a;font-family:sans-serif;padding:4px">
          <strong style="font-size:14px">${s.name}</strong><br/>
          <span style="color:${band.color};font-weight:bold;font-size:16px">${val} ${metric === 'pm25' ? 'µg/m³' : 'AQI'}</span> (${band.label})
        </div>
      `)

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([s.lon, s.lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [stations, metric])

  // 5. Update Plume Trajectories Layer in Place
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    if (mode === 'dual_plume' && trajectories.length) {
      const plumeFeatures = trajectories.map((t) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: t.trajectory_points.map((p) => [p.lon, p.lat]),
        },
        properties: { district: t.district, eta: t.delhi_eta_hours, impact: t.delhi_impact_pm25_ug_m3 },
      }))

      const geojson: any = { type: 'FeatureCollection', features: plumeFeatures }

      if (map.getSource('plumes-source')) {
        ;(map.getSource('plumes-source') as mapboxgl.GeoJSONSource).setData(geojson)
      } else {
        map.addSource('plumes-source', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'plumes-lines',
          type: 'line',
          source: 'plumes-source',
          paint: {
            'line-color': '#f59e0b',
            'line-width': 3.5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.85,
          },
        })
      }
    } else if (map.getLayer('plumes-lines')) {
      map.removeLayer('plumes-lines')
      if (map.getSource('plumes-source')) map.removeSource('plumes-source')
    }
  }, [mode, trajectories])

  return <div ref={containerRef} className="size-full rounded-2xl overflow-hidden relative" />
}
