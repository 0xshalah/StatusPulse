'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const start = prev.current
    const end = value
    const duration = 600
    const startTime = performance.now()
    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    prev.current = value
  }, [value])
  return <span className="font-mono-nums">{display}</span>
}

export default function HealthScore({ health = {}, lastPing }) {
  const { healthy = 0, total = 0, up = 0, degraded = 0, down = 0, maintenance = 0, paused = 0 } = health
  const pct = total ? Math.round((healthy / total) * 100) : 0
  const allGood = down === 0 && total > 0
  const bar = allGood ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171'
  const chips = [
    { n: up, c: '#34D399', l: 'up' },
    { n: degraded, c: '#FBBF24', l: 'degraded' },
    { n: down, c: '#F87171', l: 'down' },
    ...(maintenance ? [{ n: maintenance, c: '#A78BFA', l: 'maint' }] : []),
    ...(paused ? [{ n: paused, c: '#9CA3AF', l: 'paused' }] : []),
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2px] text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> System Health</div>
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="font-display text-5xl font-bold leading-none sm:text-6xl">
          <AnimatedNumber value={healthy} /><span className="text-muted-foreground">/{total}</span>
        </div>
        <div className="pb-1">
          <p className="text-sm text-muted-foreground">endpoints healthy</p>
          <p className="font-mono text-sm font-semibold" style={{ color: bar }}>{pct}% operational</p>
        </div>
      </div>
      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full" style={{ background: bar }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span key={c.l} className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs" style={{ backgroundColor: `${c.c}1f`, color: c.c }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.c }} /> {c.n} {c.l}
          </span>
        ))}
      </div>
      {lastPing && <p className="mt-3 font-mono text-[11px] text-muted-foreground">last sweep · {lastPing}</p>}
    </motion.div>
  )
}
