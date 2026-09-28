'use client'

import { useEffect, useRef } from 'react'

export function WindCanvas({ dirDeg, speedKmh }: { dirDeg: number; speedKmh: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vector = useRef({ dx: 0, dy: 0 })

  const toRad = (((dirDeg + 180) % 360) * Math.PI) / 180
  const mag = 0.4 + speedKmh * 0.12
  vector.current = { dx: Math.sin(toRad) * mag, dy: -Math.cos(toRad) * mag }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles = Array.from({ length: 420 }, () => ({ x: Math.random() * w, y: Math.random() * h, age: Math.random() * 120 }))
    let raf = 0

    const tick = () => {
      ctx.globalCompositeOperation = 'destination-in'
      ctx.fillStyle = 'rgba(0,0,0,0.92)'
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(186,230,253,0.55)'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      const { dx, dy } = vector.current
      for (const p of particles) {
        const curl = Math.sin(p.y / 60 + p.x / 90) * 0.35
        const nx = p.x + dx + curl * dy
        const ny = p.y + dy - curl * dx
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(nx, ny)
        p.x = nx
        p.y = ny
        p.age++
        if (p.age > 140 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w
          p.y = Math.random() * h
          p.age = 0
        }
      }
      ctx.stroke()
      if (!reduced) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[450] size-full" aria-hidden />
}
