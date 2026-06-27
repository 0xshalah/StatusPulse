'use client'

import { statusOf } from '@/lib/statuspulse'

// Lightweight SVG sparkline for response times.
export default function Sparkline({ pings = [], verdict = 'up', width = 240, height = 48 }) {
  const color = statusOf(verdict).color
  const data = pings.map((p) => p.responseTime)
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-muted-foreground font-mono"
        style={{ width: '100%', height }}
      >
        collecting data…
      </div>
    )
  }
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const pts = data.map((d, i) => {
    const x = i * stepX
    const y = height - 4 - ((d - min) / range) * (height - 12)
    return [x, y]
  })
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  const gid = `spark-${verdict}-${Math.round(max)}`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  )
}
