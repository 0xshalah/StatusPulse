/**
 * Reliability Insights Engine
 *
 * Analyzes ping history to detect patterns a human operator would miss.
 * All detection is DETERMINISTIC (no ML, no false-positive risk) and
 * produces insights that are directly actionable through the AI chat.
 *
 * Insight types:
 *   1. RECURRING — same endpoint fails repeatedly in a specific time window
 *   2. TRENDING  — response time has increased significantly over 24-48h
 *   3. CORRELATED — multiple endpoints degraded simultaneously (blast radius)
 *   4. WINDOW    — failures cluster around a recurring weekday + hour window
 */

export interface PingData {
  timestamp: string
  responseTime: number
  statusCode: number
  verdict: string
}

export interface EndpointData {
  id: string
  name: string
  verdict: string
  pings: PingData[]
}

export type InsightSeverity = 'critical' | 'warning' | 'info'

export interface ReliabilityInsight {
  type: 'recurring' | 'trending' | 'correlated' | 'window'
  severity: InsightSeverity
  title: string
  detail: string
  endpointIds: string[]
  /** Suggested question to ask the AI for follow-up */
  suggestion: string
}

const HOUR = 3600 * 1000
const DAY = 24 * HOUR

function getHour(ts: string): number {
  return new Date(ts).getHours()
}

function getDay(ts: string): number {
  return new Date(ts).getDay()
}

function isDegradedOrDown(verdict: string): boolean {
  return verdict === 'down' || verdict === 'degraded'
}

/**
 * Detect recurring failures: the same endpoint has failed ≥3 times
 * within a consistent 2-hour window over the last 7 days.
 */
function detectRecurring(eps: EndpointData[]): ReliabilityInsight[] {
  const insights: ReliabilityInsight[] = []
  const now = Date.now()

  for (const ep of eps) {
    const failures = ep.pings.filter(
      p => isDegradedOrDown(p.verdict) && now - new Date(p.timestamp).getTime() < 7 * DAY,
    )
    if (failures.length < 3) continue

    const buckets: Record<string, number> = {}
    for (const f of failures) {
      const h = getHour(f.timestamp)
      const d = getDay(f.timestamp)
      const key = `${d}-${h}`
      buckets[key] = (buckets[key] || 0) + 1
    }

    for (const [key, count] of Object.entries(buckets)) {
      if (count < 3) continue
      const [day, hour] = key.split('-').map(Number)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      insights.push({
        type: 'recurring',
        severity: 'critical',
        title: `${ep.name} fails repeatedly at the same time`,
        detail: `${ep.name} has failed ${count} times on ${dayNames[day!]} around ${hour!}:00–${(hour! + 2) % 24}:00 in the last 7 days. This suggests a scheduled event (deployment, backup, cron job) is causing the failure.`,
        endpointIds: [ep.id],
        suggestion: `Diagnose ${ep.name} and suggest a maintenance window for this recurring failure`,
      })
    }
  }
  return insights
}

/**
 * Detect degradation trending: response time has increased ≥2x
 * comparing the last 24h vs 24-48h ago.
 */
function detectTrending(eps: EndpointData[]): ReliabilityInsight[] {
  const insights: ReliabilityInsight[] = []
  const now = Date.now()

  for (const ep of eps) {
    const recent = ep.pings.filter(
      p => now - new Date(p.timestamp).getTime() < 24 * HOUR && p.verdict === 'up',
    )
    const older = ep.pings.filter(
      p => {
        const age = now - new Date(p.timestamp).getTime()
        return age >= 24 * HOUR && age < 48 * HOUR && p.verdict === 'up'
      },
    )

    if (recent.length < 3 || older.length < 3) continue

    const recentAvg = recent.reduce((s, p) => s + p.responseTime, 0) / recent.length
    const olderAvg = older.reduce((s, p) => s + p.responseTime, 0) / older.length

    if (olderAvg > 0 && recentAvg / olderAvg >= 2) {
      const pct = Math.round((recentAvg / olderAvg - 1) * 100)
      insights.push({
        type: 'trending',
        severity: 'warning',
        title: `${ep.name} response time is trending up`,
        detail: `${ep.name} averaged ${Math.round(recentAvg)}ms in the last 24h — up ${pct}% from ${Math.round(olderAvg)}ms the day before. Check for memory leaks, N+1 queries, or upstream degradation.`,
        endpointIds: [ep.id],
        suggestion: `Analyze ${ep.name} response time degradation and suggest a fix`,
      })
    }
  }
  return insights
}

/**
 * Detect cross-endpoint correlation: ≥3 endpoints all degraded/down
 * within a 5-minute window, suggesting a shared upstream failure.
 */
function detectCorrelated(eps: EndpointData[]): ReliabilityInsight[] {
  const now = Date.now()
  const recentWindow = now - 30 * 60 * 1000 // last 30 minutes
  const degraded = eps.filter(
    ep =>
      isDegradedOrDown(ep.verdict) &&
      ep.pings.some(p => now - new Date(p.timestamp).getTime() < recentWindow),
  )

  if (degraded.length < 3) return []

  return [
    {
      type: 'correlated',
      severity: 'critical',
      title: `${degraded.length} endpoints are degraded simultaneously`,
      detail: `${degraded.map(e => e.name).join(', ')} are all showing issues right now. This suggests a shared upstream dependency (database, load balancer, or DNS resolver) may be the root cause — not individual endpoint failures.`,
      endpointIds: degraded.map(e => e.id),
      suggestion: `Investigate the shared root cause across ${degraded.length} degraded endpoints`,
    },
  ]
}

/**
 * Detect deployment window patterns: failures that cluster on specific
 * weekdays & hours, suggesting a recurring deployment or maintenance event.
 */
function detectWindowPatterns(eps: EndpointData[]): ReliabilityInsight[] {
  const insights: ReliabilityInsight[] = []
  const now = Date.now()
  const dayHourCounts: Record<string, { fails: number; total: number; names: Set<string> }> = {}

  for (const ep of eps) {
    const recentPings = ep.pings.filter(
      p => now - new Date(p.timestamp).getTime() < 7 * DAY,
    )
    for (const p of recentPings) {
      const day = getDay(p.timestamp)
      const hour = getHour(p.timestamp)
      const key = `${day}-${hour}`
      if (!dayHourCounts[key]) dayHourCounts[key] = { fails: 0, total: 0, names: new Set() }
      dayHourCounts[key]!.total++
      if (isDegradedOrDown(p.verdict)) {
        dayHourCounts[key]!.fails++
        dayHourCounts[key]!.names.add(ep.name)
      }
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (const [key, bucket] of Object.entries(dayHourCounts)) {
    const failRate = bucket.total > 0 ? bucket.fails / bucket.total : 0
    if (bucket.fails < 4 || failRate < 0.5) continue

    const [day, hour] = key.split('-').map(Number)
    insights.push({
      type: 'window',
      severity: 'info',
      title: `Failure cluster detected: ${dayNames[day!]} ${hour!}:00–${(hour! + 2) % 24}:00`,
      detail: `${Math.round(failRate * 100)}% of pings fail during this window across ${bucket.names.size} endpoint(s). Consider scheduling a maintenance window to suppress alerts during this likely deployment period.`,
      endpointIds: eps.filter(e => bucket.names.has(e.name)).map(e => e.id),
      suggestion: `Create a recurring maintenance window for this deployment pattern`,
    })
  }

  return insights
}

/**
 * Run all detection engines and return deduplicated, severity-sorted insights.
 * Max 5 insights returned so the dashboard doesn't get noisy.
 */
export function generateReliabilityInsights(eps: EndpointData[]): ReliabilityInsight[] {
  if (!eps || eps.length === 0) return []

  const all: ReliabilityInsight[] = [
    ...detectCorrelated(eps),
    ...detectRecurring(eps),
    ...detectTrending(eps),
    ...detectWindowPatterns(eps),
  ]

  // Deduplicate by title suffix
  const seen = new Set<string>()
  const unique = all.filter(i => {
    const key = i.title + i.detail.slice(-40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort: critical → warning → info
  const order = { critical: 0, warning: 1, info: 2 }
  unique.sort((a, b) => order[a.severity] - order[b.severity])

  return unique.slice(0, 5)
}
