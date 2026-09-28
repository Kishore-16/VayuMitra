'use client'

import { Activity, Baby, Workflow, Brain, CloudFog, Flame, HardHat, HeartPulse, Satellite, ShieldAlert, Users } from 'lucide-react'
import type { AerosolFeedbackDiagnostic, HourlyForecastPoint, TabId } from '@/lib/types'
import { aqiBand, grapFromAqi } from '@/lib/aqi'
import { Explainer, Panel, SectionTitle } from '../primitives'
import { AtmosphereScene } from './atmosphere-scene'
import { AqiGauge } from './aqi-gauge'
import { AqiForecastChart } from './aqi-forecast-chart'

function headline(p: HourlyForecastPoint) {
  const band = aqiBand(p.aqi)
  const reasons: string[] = []
  if (p.inversion_layer_active) reasons.push('a warm-air lid is trapping pollution near the ground')
  else if (p.pbl_height_m < 600) reasons.push('the mixing layer is shallow')
  if (p.wind_speed_kmh < 8) reasons.push('winds are too weak to clear it')
  if (p.stubble_contribution_pct > 30) reasons.push('crop-fire smoke is drifting in from Punjab & Haryana')
  return {
    title: `Air is ${band.label.toLowerCase()} — ${band.advice.split('.')[0].toLowerCase()}.`,
    why: reasons.length ? `Why: ${reasons.join(', ')}.` : 'Sunshine and wind are helping pollution mix and disperse.',
  }
}

function healthAdvice(aqi: number) {
  const sev = aqi > 400 ? 3 : aqi > 300 ? 2 : aqi > 200 ? 1 : 0
  return [
    { icon: Users, group: 'Everyone', text: ['Normal activity is fine.', 'Cut long or heavy outdoor exercise.', 'Wear an N95 mask outdoors; keep windows shut.', 'Stay indoors. Run air purifiers. Avoid all exertion.'][sev] },
    { icon: Baby, group: 'Children & elderly', text: ['Take regular breaks outdoors.', 'Keep outdoor play short.', 'Move play and walks indoors.', 'No outdoor exposure. Schools may go online.'][sev] },
    { icon: HeartPulse, group: 'Asthma & heart patients', text: ['Keep medication handy.', 'Keep inhalers close, avoid traffic areas.', 'Avoid going out; consult a doctor if symptoms rise.', 'Medical emergency risk — stay in a filtered room.'][sev] },
    { icon: HardHat, group: 'Outdoor workers', text: ['No special precautions.', 'Take indoor breaks every hour.', 'Employers must supply N95 masks.', 'Limit shifts; N95 mandatory.'][sev] },
  ]
}

const URBAN_SPLIT = [
  { label: 'Vehicles', share: 0.42, color: '#38bdf8' },
  { label: 'Industry', share: 0.24, color: '#818cf8' },
  { label: 'Road & C&D dust', share: 0.22, color: '#94a3b8' },
  { label: 'Other local', share: 0.12, color: '#475569' },
]

const PIPELINE = [
  { icon: Satellite, title: 'Observe', text: 'CPCB ground stations, NASA VIIRS fire detections and ECMWF CAMS satellite aerosols.' },
  { icon: Brain, title: 'Couple', text: 'WRF-Chem links weather and chemistry so smog can change the weather that traps it.' },
  { icon: Activity, title: 'Forecast', text: 'Hour-by-hour AQI, inversion depth and smoke arrival for the next 72 hours.' },
  { icon: ShieldAlert, title: 'Act', text: 'Translates the forecast into CAQM GRAP stages and plain health guidance.' },
]

export function OverviewView({
  point,
  forecast,
  feedback,
  hour,
  onHour,
  onTab,
}: {
  point: HourlyForecastPoint
  forecast: HourlyForecastPoint[]
  feedback: AerosolFeedbackDiagnostic
  hour: number
  onHour: (h: number) => void
  onTab: (t: TabId) => void
}) {
  const h = headline(point)
  const stage = grapFromAqi(point.aqi)
  const urban = point.urban_contribution_pct

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel glow className="xl:col-span-8">
        <SectionTitle icon={<CloudFog className="size-4" />} eyebrow="The air above Delhi, right now" title={h.title} />
        <p className="-mt-2 mb-4 text-pretty text-sm leading-relaxed text-slate-300">{h.why}</p>
        <AtmosphereScene point={point} feedback={feedback} />
        <ol className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          <li><span className="font-bold text-sky-200">1 Wind</span> — faster winds sweep pollution away. Below 8 km/h it lingers.</li>
          <li><span className="font-bold text-amber">2 Smoke</span> — north-west winds carry crop-fire smoke from Punjab and Haryana.</li>
          <li><span className="font-bold text-indigo-300">3 The lid</span> — at night, warm air sits on cold air and acts like a lid on a pot.</li>
          <li><span className="font-bold text-foreground">4 Trapped</span> — everything below the lid is what Delhi breathes.</li>
        </ol>
      </Panel>

      <div className="flex flex-col gap-4 xl:col-span-4">
        <Panel>
          <SectionTitle eyebrow="Air Quality Index" title="How bad is it?" />
          <AqiGauge aqi={point.aqi} />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Rules in force</p>
              <p className="font-semibold" style={{ color: stage.color }}>
                GRAP {stage.name} · {stage.short}
              </p>
            </div>
            <button onClick={() => onTab('grap')} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10">
              See actions
            </button>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={<Flame className="size-4" />} eyebrow="Source apportionment" title="Where is the smoke from?" />
          <div className="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label="Pollution source shares">
            <div className="bg-amber" style={{ width: `${point.stubble_contribution_pct}%` }} />
            {URBAN_SPLIT.map((s) => (
              <div key={s.label} style={{ width: `${urban * s.share}%`, backgroundColor: s.color }} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-amber" />Crop fires</span>
              <span className="font-mono tabular-nums">{point.stubble_contribution_pct}%</span>
            </li>
            {URBAN_SPLIT.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}</span>
                <span className="font-mono tabular-nums">{Math.round(urban * s.share)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Local split is an estimated breakdown of the urban share.</p>
        </Panel>
      </div>

      <Panel className="xl:col-span-8">
        <SectionTitle
          icon={<Activity className="size-4" />}
          eyebrow="Next 72 hours"
          title="When will it be worst?"
          action={<span className="text-xs text-muted-foreground">Click the chart to jump to any hour</span>}
        />
        <AqiForecastChart forecast={forecast} hour={hour} onHour={onHour} />
        <div className="mt-3">
          <Explainer>
            The line rises every night when the air stops mixing, and falls each afternoon when sunshine stirs it up. The coloured bands show
            the AQI category — anything in the red or purple zones is unhealthy for everyone.
          </Explainer>
        </div>
      </Panel>

      <Panel className="xl:col-span-4">
        <SectionTitle icon={<HeartPulse className="size-4" />} eyebrow="Health guidance" title="What should I do?" />
        <ul className="flex flex-col gap-3">
          {healthAdvice(point.aqi).map(({ icon: Icon, group, text }) => (
            <li key={group} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{group}</p>
                <p className="text-sm text-slate-300">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="xl:col-span-12">
        <SectionTitle icon={<Workflow className="size-4" />} eyebrow="How DELHI-AIR-COUPLED works" title="From satellites to street-level advice" />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sky/10 text-sky ring-1 ring-sky/20">
                  <Icon className="size-4" aria-hidden />
                </span>
                <p className="font-semibold">
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  {title}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}
