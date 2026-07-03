const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
import { CONFIG } from '@/lib/config'

export interface PingResult {
  statusCode: number
  responseTime: number
  errored: boolean
  attempts: number
}

export async function pingWithRetry(url: string, expectedStatus: number): Promise<PingResult> {
  const backoffs = CONFIG.ping.retryBackoff
  let last: PingResult = { statusCode: 0, responseTime: 0, errored: true, attempts: 0 }

  for (let i = 0; i < CONFIG.ping.maxAttempts; i++) {
    if (backoffs[i]) await sleep(backoffs[i])
    const start = Date.now()
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), CONFIG.ping.timeoutMs)
      const r = await fetch(url, {
        signal: c.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'StatusPulse/2.0 (+worker)' },
      })
      clearTimeout(t)
      last = { statusCode: r.status, responseTime: Date.now() - start, errored: false, attempts: i + 1 }
      if (r.status === expectedStatus) return last
    } catch {
      last = { statusCode: 0, responseTime: Date.now() - start, errored: true, attempts: i + 1 }
    }
  }
  return last
}

export function computeVerdict(
  result: PingResult,
  expectedStatus: number,
  consecutiveFailures: number
): { verdict: string; consecutive: number } {
  const failed = result.errored || result.statusCode !== expectedStatus
  const consecutive = failed ? consecutiveFailures + 1 : 0

  let verdict: string
  if (failed) {
    verdict = consecutive >= 3 ? 'down' : 'degraded'
  } else {
    verdict = result.responseTime > 2000 ? 'degraded' : 'up'
  }
  return { verdict, consecutive }
}
