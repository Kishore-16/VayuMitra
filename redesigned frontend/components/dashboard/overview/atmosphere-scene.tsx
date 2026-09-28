'use client'

import type { AerosolFeedbackDiagnostic, HourlyForecastPoint } from '@/lib/types'
import { aqiColor, istHour } from '@/lib/aqi'

const W = 800
const H = 380
const GROUND = 320
const MAX_ALT = 1600
const altToY = (alt: number) => GROUND - (Math.min(alt, MAX_ALT) / MAX_ALT) * (GROUND - 40)

const BUILDINGS = [
  [40, 60, 34], [80, 95, 26], [112, 70, 30], [150, 120, 22], [178, 80, 36], [222, 140, 28], [256, 90, 30],
  [292, 110, 24], [322, 70, 40], [368, 150, 26], [400, 95, 34], [440, 125, 24], [470, 75, 38], [514, 105, 26],
  [546, 160, 30], [582, 85, 32], [620, 115, 24], [650, 70, 36], [692, 130, 26], [724, 90, 34], [764, 65, 30],
]

const PARTICLES = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 97) % W,
  f: ((i * 53) % 100) / 100,
  r: 1 + ((i * 7) % 3) * 0.6,
  d: 3 + ((i * 13) % 5),
}))

export function AtmosphereScene({ point, feedback }: { point: HourlyForecastPoint; feedback: AerosolFeedbackDiagnostic }) {
  const lh = istHour(point.timestamp)
  const night = lh < 7 || lh > 18
  const smogColor = aqiColor(point.aqi)
  const invTop = point.inversion_layer_active ? 180 + point.inversion_strength_c_100m * 180 : undefined
  const mixTop = Math.max(point.pbl_height_m, invTop ?? 0)
  const smogY = altToY(mixTop)
  const pblY = altToY(point.pbl_height_m)
  const smogOpacity = Math.min(0.75, 0.2 + point.pm25 / 600)
  const sunX = night ? 660 : 120 + ((lh - 7) / 11) * 560
  const sunY = night ? 70 : 150 - Math.sin((Math.PI * (lh - 7)) / 11) * 100
  const stubbleOpacity = point.stubble_contribution_pct / 60
  const windLen = 40 + point.wind_speed_kmh * 6

  return (
    <figure className="relative overflow-hidden rounded-2xl border border-white/5">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Diagram of the air above Delhi: pollution is trapped up to about ${Math.round(mixTop)} metres.`}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={night ? '#050816' : '#0c2a4a'} />
            <stop offset="100%" stopColor={night ? '#141a3a' : '#3b5a7a'} />
          </linearGradient>
          <linearGradient id="smog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={smogColor} stopOpacity={smogOpacity * 0.4} />
            <stop offset="100%" stopColor={smogColor} stopOpacity={smogOpacity} />
          </linearGradient>
          <linearGradient id="plume" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9 * stubbleOpacity} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="sunGlow">
            <stop offset="0%" stopColor={night ? '#e2e8f0' : '#fde68a'} stopOpacity="0.9" />
            <stop offset="100%" stopColor={night ? '#e2e8f0' : '#fde68a'} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={W} height={H} fill="url(#sky)" />
        {night &&
          Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={(i * 131) % W} cy={(i * 47) % 140 + 10} r={0.8} fill="#cbd5e1" opacity={0.5} />
          ))}

        <circle cx={sunX} cy={sunY} r={60} fill="url(#sunGlow)" opacity={night ? 0.35 : Math.max(0.25, 1 + feedback.solar_dimming_w_m2 / 90)} />
        <circle cx={sunX} cy={sunY} r={night ? 16 : 22} fill={night ? '#e2e8f0' : '#fcd34d'} />
        {!night &&
          [0, 1, 2].map((i) => (
            <line
              key={i}
              x1={sunX - 10 + i * 10}
              y1={sunY + 30}
              x2={sunX - 40 + i * 30}
              y2={smogY - 4}
              stroke="#fcd34d"
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={0.5}
            />
          ))}

        <path
          d={`M0 ${GROUND - 120} C 120 ${GROUND - 160}, 200 ${GROUND - 60}, 360 ${GROUND - 110} L 360 ${GROUND - 60} C 200 ${GROUND - 20}, 120 ${GROUND - 90}, 0 ${GROUND - 50} Z`}
          fill="url(#plume)"
        >
          <animateTransform attributeName="transform" type="translate" values="-20 0; 10 0; -20 0" dur="9s" repeatCount="indefinite" />
        </path>

        <rect x={0} y={smogY} width={W} height={GROUND - smogY} fill="url(#smog)" />
        {PARTICLES.map((p, i) => {
          const y = smogY + 8 + p.f * (GROUND - smogY - 16)
          return (
            <circle key={i} cx={p.x} cy={y} r={p.r} fill={smogColor} opacity={0.7}>
              <animate attributeName="cx" values={`${p.x};${p.x + 24};${p.x}`} dur={`${p.d}s`} repeatCount="indefinite" />
            </circle>
          )
        })}

        {invTop !== undefined && (
          <g>
            <rect x={0} y={altToY(invTop) - 6} width={W} height={12} fill="#6366f1" opacity={0.18} />
            <line x1={0} x2={W} y1={altToY(invTop)} y2={altToY(invTop)} stroke="#818cf8" strokeWidth={2.5} strokeDasharray="10 6" />
          </g>
        )}
        <line x1={0} x2={W} y1={pblY} y2={pblY} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.8} />

        <g transform={`translate(24 ${GROUND - 170})`}>
          <line x1={0} y1={0} x2={windLen} y2={0} stroke="#e0f2fe" strokeWidth={3} strokeLinecap="round" />
          <path d={`M${windLen} 0 l-10 -7 l0 14 z`} fill="#e0f2fe" />
        </g>

        {BUILDINGS.map(([x, h, w], i) => (
          <rect key={i} x={x} y={GROUND - h * 0.7} width={w} height={h * 0.7} fill="#0b1220" stroke="#1e293b" />
        ))}
        {BUILDINGS.map(([x, h, w], i) =>
          Array.from({ length: Math.floor(h / 30) }, (_, j) => (
            <rect key={`${i}-${j}`} x={x + w / 2 - 3} y={GROUND - h * 0.7 + 8 + j * 16} width={6} height={4} fill={night ? '#fbbf24' : '#334155'} opacity={night ? 0.6 : 0.8} />
          )),
        )}
        <rect x={0} y={GROUND} width={W} height={H - GROUND} fill="#060a14" />

        <g fontFamily="var(--font-jakarta)" fontSize={13} fontWeight={600}>
          <Callout n={1} x={30} y={GROUND - 190} color="#e0f2fe" text={`Wind ${point.wind_speed_kmh} km/h from ${point.wind_dir_compass}`} />
          <Callout n={2} x={30} y={GROUND - 128} color="#f59e0b" text={`Crop-fire smoke · ${point.stubble_contribution_pct}%`} />
          {invTop !== undefined ? (
            <Callout n={3} x={W - 290} y={altToY(invTop) - 16} color="#a5b4fc" text={`Warm-air lid at ~${Math.round(invTop)} m`} />
          ) : (
            <Callout n={3} x={W - 290} y={pblY - 16} color="#7dd3fc" text={`Mixing ceiling at ${point.pbl_height_m} m`} />
          )}
          <Callout n={4} x={W - 290} y={GROUND - 30} color="#f1f5f9" text={`Trapped PM2.5 · ${point.pm25} µg/m³`} />
        </g>
      </svg>
    </figure>
  )
}

function Callout({ n, x, y, color, text }: { n: number; x: number; y: number; color: string; text: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={-13} width={text.length * 7.4 + 36} height={24} rx={12} fill="rgba(8,13,26,0.8)" stroke="rgba(255,255,255,0.12)" />
      <circle cx={12} cy={-1} r={8} fill={color} />
      <text x={12} y={3} textAnchor="middle" fontSize={10} fill="#080d1a" fontWeight={800}>
        {n}
      </text>
      <text x={26} y={3} fill={color}>
        {text}
      </text>
    </g>
  )
}
