'use client'

import { useState } from 'react'
import { statusOf } from '@/lib/statuspulse'

export default function Sparkline({ pings = [], verdict = 'up', width = 240, height = 48 }) {
  const [hover, setHover] = useState(null)
  const color = statusOf(verdict).color
  const data = pings.map((p) => p.responseTime)
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-[10px] text-muted-foreground font-mono" style={{ width: '100%', height }}>
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

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const i = Math.round(px / stepX)
    if (i >= 0 && i < pings.length) setHover(i)
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      {hover !== null && (
        <g>
          <line x1={pts[hover][0]} y1={0} x2={pts[hover][0]} y2={height} stroke={color} strokeWidth="1" strokeOpacity="0.4" />
          <circle cx={pts[hover][0]} cy={pts[hover][1]} r="3" fill={color} stroke="hsl(var(--card))" strokeWidth="1.5" />
          <rect x={Math.min(width - 70, Math.max(0, pts[hover][0] - 35))} y={2} width="70" height="18" rx="4" fill="hsl(var(--foreground))" opacity="0.9" />
          <text x={Math.min(width - 35, Math.max(35, pts[hover][0]))} y="14" textAnchor="middle" fontSize="10" fill="hsl(var(--background))" fontFamily="JetBrains Mono, monospace">
            {data[hover]}ms
          </text>
        </g>
      )}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  )
}
