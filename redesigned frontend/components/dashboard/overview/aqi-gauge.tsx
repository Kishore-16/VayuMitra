import { AQI_BANDS, aqiBand } from '@/lib/aqi'

const CX = 120
const CY = 120
const R = 96

function polar(value: number) {
  const angle = Math.PI * (1 - value / 500)
  return [CX + R * Math.cos(angle), CY - R * Math.sin(angle)] as const
}

function arc(from: number, to: number) {
  const [x1, y1] = polar(from)
  const [x2, y2] = polar(to)
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`
}

export function AqiGauge({ aqi }: { aqi: number }) {
  const band = aqiBand(aqi)
  const [nx, ny] = polar(Math.min(aqi, 500))
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 240 140" className="w-full" role="img" aria-label={`AQI ${aqi}, ${band.label}`}>
        {AQI_BANDS.map((b) => (
          <path key={b.label} d={arc(b.min, b.max)} stroke={b.color} strokeWidth={16} fill="none" opacity={b.label === band.label ? 1 : 0.28} />
        ))}
        <circle cx={nx} cy={ny} r={13} fill={band.color} opacity={0.25} />
        <circle cx={nx} cy={ny} r={8} fill="#f1f5f9" stroke={band.color} strokeWidth={4} />
        <text x={CX - R} y={CY + 16} textAnchor="middle" fontSize={10} fill="#64748b">
          0
        </text>
        <text x={CX + R} y={CY + 16} textAnchor="middle" fontSize={10} fill="#64748b">
          500
        </text>
      </svg>
      <div className="-mt-20 text-center">
        <p className="font-mono text-5xl font-bold tabular-nums" style={{ color: band.color }}>
          {aqi}
        </p>
        <p className="text-sm font-semibold" style={{ color: band.color }}>
          {band.label}
        </p>
      </div>
    </div>
  )
}
