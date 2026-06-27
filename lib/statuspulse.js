export const STATUS = {
  up: { label: 'Operational', short: 'up', color: '#34D399', glow: 'rgba(52,211,153,0.55)' },
  degraded: { label: 'Degraded', short: 'degraded', color: '#FBBF24', glow: 'rgba(251,191,36,0.55)' },
  down: { label: 'Down', short: 'down', color: '#F87171', glow: 'rgba(248,113,113,0.55)' },
  maintenance: { label: 'Maintenance', short: 'maintenance', color: '#A78BFA', glow: 'rgba(167,139,250,0.55)' },
  paused: { label: 'Paused', short: 'paused', color: '#9CA3AF', glow: 'rgba(156,163,175,0.4)' },
  unknown: { label: 'Unknown', short: 'unknown', color: '#9CA3AF', glow: 'rgba(156,163,175,0.4)' },
}

export function statusOf(v) {
  return STATUS[v] || STATUS.unknown
}

export function fmtMs(ms) {
  if (ms === null || ms === undefined) return '\u2014'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
export function fmtPct(p) {
  if (p === null || p === undefined) return '\u2014'
  return `${p.toFixed(1)}%`
}
export function fmtDuration(ms) {
  if (!ms) return '\u2014'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}
export function timeAgo(date) {
  if (!date) return '\u2014'
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
export async function api(path, options) {
  const res = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}
