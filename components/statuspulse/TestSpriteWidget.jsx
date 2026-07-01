'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react'

export default function TestSpriteWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/testsprite/status')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
    const iv = setInterval(() => {
      fetch('/api/testsprite/status').then(r => r.json()).then(setData).catch(() => {})
    }, 300000)
    return () => clearInterval(iv)
  }, [])

  if (loading || !data) return null

  return (
    <a
      href={data.dashboardUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-lime" />
          TestSprite Verification
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="flex items-end gap-4">
        <div className="font-display text-3xl font-bold">
          <span className={data.health >= 80 ? 'text-lime' : data.health >= 50 ? 'text-status-degraded' : 'text-status-down'}>
            {data.health}%
          </span>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-status-up" />
            {data.passed}
          </span>
          {data.failed > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-status-down" />
              {data.failed}
            </span>
          )}
          {data.running > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-status-degraded" />
              {data.running}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${data.health}%`,
            background: data.health >= 80 ? '#C2EF4E' : data.health >= 50 ? '#FBBF24' : '#F87171',
          }}
        />
      </div>

      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        {data.total} tests · {data.passed} passed · {data.failed} failed · {data.running} running
      </p>
    </a>
  )
}
