'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLiveSounding, useDashboard } from '@/lib/api'
import { buildAnomalies, buildSounding } from '@/lib/emulator'
import { aqiBand, formatIST, grapFromAqi, pm25ToAqi } from '@/lib/aqi'
import type { CPCBStation, InversionSounding, TabId } from '@/lib/types'
import { Navbar, TABS } from './navbar'
import { KpiCards } from './kpi-cards'
import { TimelineSlider } from './timeline-slider'
import { OverviewView } from './overview/overview-view'
import { MapView } from './map/map-view'
import { PRESETS } from './map/map-config'
import { SoundingView } from './sounding-view'
import { FeedbackView } from './feedback-view'
import { PlumesView } from './plumes-view'
import { GrapView } from './grap-view'
import { AnomaliesView } from './anomalies-view'
import { PolicySimulatorModal } from './policy-simulator-modal'
import { StationDetailModal } from './station-detail-modal'

export function Dashboard() {
  const { data, isValidating, mutate } = useDashboard()
  const [tab, setTab] = useState<TabId>('overview')
  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [sandbox, setSandbox] = useState(false)
  const [stationId, setStationId] = useState<string | null>(null)
  const [liveSounding, setLiveSounding] = useState<InversionSounding | null>(null)
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number; key: number }>({
    center: PRESETS.ncr.center,
    zoom: PRESETS.ncr.zoom,
    key: 0,
  })

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setHour((h) => (h >= 71 ? 0 : h + 1)), 900 / speed)
    return () => clearInterval(id)
  }, [playing, speed])

  const point = data?.forecast[hour]

  useEffect(() => {
    if (!point) return
    if (data?.source === 'live') {
      fetchLiveSounding(hour, point).then(setLiveSounding)
    } else {
      setLiveSounding(buildSounding(point))
    }
  }, [data?.source, hour, point])

  const stations = useMemo<CPCBStation[]>(() => {
    if (!data || !point) return []
    return data.stations.map((s, i) => {
      const wobble = 1 + Math.sin(hour / 5 + i) * 0.05
      const pm25 = Math.round(point.pm25 * s.multiplier * wobble)
      const aqi = pm25ToAqi(pm25)
      return {
        ...s,
        current_pm25: pm25,
        current_pm10: Math.round(point.pm10 * s.multiplier * wobble),
        current_aqi: aqi,
        aqi_category: aqiBand(aqi).label,
        grap_stage: grapFromAqi(aqi).name,
      }
    })
  }, [data, point, hour])

  const anomalies = useMemo(() => (data ? (data.source === 'emulated' ? buildAnomalies(data.forecast, hour) : data.anomalies) : []), [data, hour])
  const sounding = liveSounding || (point ? buildSounding(point) : null)
  const onTab = useCallback((t: TabId) => {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (!data || !point || !sounding) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-10 animate-spin rounded-full border-2 border-sky/20 border-t-sky" />
          <p className="text-sm">Running coupled WRF-Chem forecast…</p>
        </div>
      </div>
    )
  }

  const stage = grapFromAqi(point.aqi)
  const activeTab = TABS.find((t) => t.id === tab)!
  const station = stations.find((s) => s.id === stationId) ?? null

  return (
    <div className="min-h-dvh">
      <Navbar
        tab={tab}
        onTab={onTab}
        stage={stage}
        onSandbox={() => setSandbox(true)}
        onRefresh={() => mutate()}
        refreshing={isValidating}
        source={data.source}
      />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky">{activeTab.blurb}</p>
            <h1 className="text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              Delhi-NCR 72-hour Coupled Air Quality Forecast
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Forecast issued {formatIST(data.issuedAt)} IST · 3 km WRF-Chem grid · 19 CPCB/DPCC stations
          </p>
        </div>

        <KpiCards point={point} forecast={data.forecast} feedback={data.feedback[hour]} />
        <TimelineSlider
          forecast={data.forecast}
          hour={hour}
          onHour={setHour}
          playing={playing}
          onPlaying={setPlaying}
          speed={speed}
          onSpeed={setSpeed}
        />

        <div key={tab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {tab === 'overview' && (
            <OverviewView point={point} forecast={data.forecast} feedback={data.feedback[hour]} hour={hour} onHour={setHour} onTab={onTab} />
          )}
          {tab === 'map' && (
            <MapView
              point={point}
              stations={stations}
              fires={data.fires}
              trajectories={data.trajectories}
              anomalies={anomalies}
              target={mapTarget}
              onTarget={setMapTarget}
              onStation={setStationId}
            />
          )}
          {tab === 'sounding' && <SoundingView sounding={sounding} />}
          {tab === 'feedback' && <FeedbackView feedback={data.feedback} hour={hour} />}
          {tab === 'plumes' && (
            <PlumesView
              fires={data.fires}
              trajectories={data.trajectories}
              onShowMap={() => {
                setMapTarget({ ...PRESETS.airshed, key: Date.now() })
                onTab('map')
              }}
            />
          )}
          {tab === 'grap' && <GrapView point={point} />}
          {tab === 'anomalies' && (
            <AnomaliesView
              anomalies={anomalies}
              onLocate={(a) => {
                setMapTarget({ center: [a.lat, a.lon], zoom: 13, key: Date.now() })
                onTab('map')
              }}
            />
          )}
        </div>

        <footer className="mt-6 border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
          DELHI-AIR-COUPLED · Two-way coupled meteorology–chemistry forecasting · Data: CPCB, DPCC, NASA FIRMS, ECMWF CAMS
        </footer>
      </main>

      <PolicySimulatorModal open={sandbox} onClose={() => setSandbox(false)} forecast={data.forecast} isLive={data.source === 'live'} />
      <StationDetailModal station={station} forecast={data.forecast} hour={hour} onClose={() => setStationId(null)} />
    </div>
  )
}
