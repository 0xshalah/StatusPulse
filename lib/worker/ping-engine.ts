const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
import { CONFIG } from '@/lib/config'

export interface PingResult {
  statusCode: number
  responseTime: number
  errored: boolean
  attempts: number
  contentMismatch?: boolean
  dnsFailed?: boolean
}

export async function pingWithRetry(url: string, expectedStatus: number, expectedContent?: string): Promise<PingResult> {
  // DNS pre-check to avoid local DNS cache false positives
  let dnsFailed = false
  try {
    const hostname = new URL(url).hostname
    const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
      signal: AbortSignal.timeout(5000),
    })
    if (dnsRes.ok) {
      const dnsData = await dnsRes.json()
      dnsFailed = !dnsData.Answer || dnsData.Answer.length === 0
    }
  } catch { /* skip DNS check */ }

  if (dnsFailed) {
    return { statusCode: 0, responseTime: 0, errored: true, attempts: 0, contentMismatch: false, dnsFailed: true }
  }

  const backoffs = CONFIG.ping.retryBackoff
  let last: PingResult = { statusCode: 0, responseTime: 0, errored: true, attempts: 0, contentMismatch: false }

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
      const responseTime = Date.now() - start
      // Content verification
      let contentMismatch = false
      if (r.status === expectedStatus) {
        try {
          const text = await r.text()
          if (expectedContent) {
            contentMismatch = !text.includes(expectedContent)
          } else {
            const lower = text.toLowerCase()
            const errorIndicators = [
              /<title>.*(error|maintenance|unavailable|suspended|not found|parked).*<\/title>/i,
              /error establishing a database connection/i,
              /fatal error/i,
              /service unavailable/i,
              /under maintenance/i,
              /account suspended/i,
              /site not found/i,
              /no such app/i,
              /deployment not found/i,
              /\b(stack trace|exception|panic|segfault)\b/i,
            ]
            const isTinyResponse = text.trim().length < 100
            contentMismatch = isTinyResponse || errorIndicators.some(p => p.test(lower))
          }
        } catch {}
      }
      last = { statusCode: r.status, responseTime, errored: false, attempts: i + 1, contentMismatch }
      if (r.status === expectedStatus && !contentMismatch) return last
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
  const failed = result.errored || result.statusCode !== expectedStatus || result.contentMismatch
  const consecutive = failed ? consecutiveFailures + 1 : 0

  let verdict: string
  if (failed) {
    verdict = consecutive >= 3 ? 'down' : 'degraded'
  } else {
    verdict = result.responseTime > CONFIG.ping.degradedThresholdMs ? 'degraded' : 'up'
  }
  return { verdict, consecutive }
}
