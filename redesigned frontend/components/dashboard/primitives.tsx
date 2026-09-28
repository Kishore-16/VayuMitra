'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { aqiBand } from '@/lib/aqi'

export function Panel({
  children,
  className,
  glow = false,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return <section className={cn('rounded-2xl p-5', glow ? 'glass-glow' : 'glass', className)}>{children}</section>
}

export function SectionTitle({
  icon,
  eyebrow,
  title,
  action,
}: {
  icon?: ReactNode
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky/10 text-sky ring-1 ring-sky/20">
            {icon}
          </div>
        )}
        <div>
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}
          <h2 className="text-balance text-lg font-bold leading-tight text-foreground">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  )
}

export function Explainer({ title = 'In plain words', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber/20 bg-amber/[0.06] p-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden />
      <div className="text-sm leading-relaxed text-slate-300">
        <p className="mb-0.5 font-semibold text-amber">{title}</p>
        {children}
      </div>
    </div>
  )
}

export function AqiPill({ aqi, className }: { aqi: number; className?: string }) {
  const band = aqiBand(aqi)
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}
      style={{ backgroundColor: `${band.color}22`, color: band.color, boxShadow: `inset 0 0 0 1px ${band.color}55` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: band.color }} aria-hidden />
      {band.label}
    </span>
  )
}

export function Stat({
  label,
  value,
  unit,
  hint,
  color,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  color?: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="ml-1 font-sans text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  size?: 'lg' | 'xl'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'glass-glow scrollbar-thin max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-5 outline-none sm:rounded-3xl sm:p-7',
          size === 'xl' ? 'max-w-5xl' : 'max-w-3xl',
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const chartTooltipStyle = {
  contentStyle: {
    background: 'rgba(15,23,42,0.96)',
    border: '1px solid rgba(56,189,248,0.25)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontSize: 12,
  },
  labelStyle: { color: '#94a3b8', marginBottom: 4 },
  itemStyle: { padding: 0 },
}

export const axisProps = {
  stroke: '#475569',
  tick: { fill: '#94a3b8', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
}
