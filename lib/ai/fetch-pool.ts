/**
 * Connection pooling for AI API fetch calls.
 * Uses a global dispatcher to reuse connections.
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('ai-fetch')

// In-memory agent for connection reuse (Node.js 18+)
let _agent: any = null

function getAgent() {
  if (!_agent) {
    try {
      // Dynamic import to avoid bundling issues
      const { Agent } = require('https') as typeof import('https')
      _agent = new Agent({
        keepAlive: true,
        keepAliveMsecs: 30_000,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60_000,
      })
    } catch {
      _agent = undefined
    }
  }
  return _agent
}

// ─── Pooled fetch ────────────────────────────────────────────────────────────
export async function pooledFetch(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const agent = getAgent()

  const mergedOptions: RequestInit = {
    ...options,
    ...(agent ? { agent } : {}),
  }

  // Node.js fetch doesn't support signal.timeout natively in all versions,
  // so we add our own timeout wrapper
  const timeoutMs = options.timeout || 15_000
  const controller = new AbortController()
  const originalSignal = options.signal

  // Chain signals
  if (originalSignal) {
    originalSignal.addEventListener('abort', () => controller.abort())
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...mergedOptions,
      signal: controller.signal,
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── Pool stats ──────────────────────────────────────────────────────────────
export function getPoolStats() {
  const agent = getAgent()
  if (!agent) return { available: false }
  return {
    available: true,
    maxSockets: agent.maxSockets,
    maxFreeSockets: agent.maxFreeSockets,
    keepAlive: agent.keepAlive,
  }
}
