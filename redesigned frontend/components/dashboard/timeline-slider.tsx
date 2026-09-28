'use client'

import { Moon, Pause, Play, RotateCcw, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HourlyForecastPoint } from '@/lib/types'
import { aqiColor, formatIST, istHour } from '@/lib/aqi'

const JUMPS = [6, 12, 24, 48, 71]

export function TimelineSlider({
  forecast,
  hour,
  onHour,
  playing,
  onPlaying,
  speed,
  onSpeed,
}: {
  forecast: HourlyForecastPoint[]
  hour: number
  onHour: (h: number) => void
  playing: boolean
  onPlaying: (p: boolean) => void
  speed: number
  onSpeed: (s: number) => void
}) {
  const point = forecast[hour]
  const lh = istHour(point.timestamp)
  const night = lh < 7 || lh > 18
  const gradient = `linear-gradient(90deg, ${forecast.map((p, i) => `${aqiColor(p.aqi)} ${(i / 71) * 100}%`).join(', ')})`

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlaying(!playing)}
            className="flex size-10 items-center justify-center rounded-full bg-sky text-primary-foreground shadow-lg shadow-sky/30 transition hover:brightness-110"
            aria-label={playing ? 'Pause forecast playback' : 'Play forecast playback'}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
          </button>
          <button
            onClick={() => {
              onPlaying(false)
              onHour(0)
            }}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            aria-label="Reset to now"
          >
            <RotateCcw className="size-4" />
          </button>
          <div className="ml-1 flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Playback speed">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onSpeed(s)}
                aria-pressed={speed === s}
                className={cn('rounded-full px-2.5 py-1 text-xs font-semibold transition', speed === s ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-xs tabular-nums text-foreground">{formatIST(point.timestamp)} IST</span>
          <span className="rounded-lg bg-sky/10 px-2.5 py-1.5 text-xs font-semibold text-sky">{hour === 0 ? 'Now' : `+${hour}h ahead`}</span>
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
              night ? 'bg-indigo/15 text-indigo-300' : 'bg-amber/15 text-amber',
            )}
          >
            {night ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            {night ? 'Night inversion trap' : 'Daytime convective mixing'}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full opacity-80" style={{ background: gradient }} />
          <input
            type="range"
            min={0}
            max={71}
            value={hour}
            onChange={(e) => onHour(Number(e.target.value))}
            aria-label="Forecast hour"
            aria-valuetext={`${formatIST(point.timestamp)}, AQI ${point.aqi}`}
            className="range-track absolute inset-0 w-full"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Now</span>
          <div className="flex items-center gap-1">
            <span className="mr-1 hidden sm:inline">Jump to</span>
            {JUMPS.map((j) => (
              <button
                key={j}
                onClick={() => onHour(j)}
                className={cn('rounded-md px-2 py-0.5 font-medium transition hover:bg-white/5 hover:text-foreground', hour === j && 'bg-white/10 text-foreground')}
              >
                +{j}h
              </button>
            ))}
          </div>
          <span>+72h</span>
        </div>
      </div>
    </div>
  )
}
