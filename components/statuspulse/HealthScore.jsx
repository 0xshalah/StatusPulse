'use client'

import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

export default function HealthScore({ healthy = 0, total = 0, lastPing }) {
  const pct = total ? Math.round((healthy / total) * 100) : 0
  const allGood = healthy === total && total > 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2px] text-muted-foreground">
        <Activity className="h-4 w-4 text-primary" />
        System Health
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="font-display text-5xl font-bold leading-none sm:text-6xl">
          <span className="font-mono-nums">{healthy}</span>
          <span className="text-muted-foreground">/{total}</span>
        </div>
        <div className="pb-1">
          <p className="text-sm text-muted-foreground">endpoints healthy</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: allGood ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171' }}
          >
            {pct}% operational
          </p>
        </div>
      </div>
      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: allGood ? '#34D399' : pct >= 50 ? '#FBBF24' : '#F87171' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {lastPing && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">last sweep · {lastPing}</p>
      )}
    </motion.div>
  )
}
