/**
 * Circuit breaker for AI API calls.
 * After FAILURE_THRESHOLD consecutive failures, trips open for COOLDOWN_MS.
 * Allows limited HALF_OPEN probes to test recovery.
 */

import { CIRCUIT } from './constants'

interface CircuitState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
  halfOpenCount: number
}

const circuits = new Map<string, CircuitState>()

function getCircuit(name: string): CircuitState {
  let c = circuits.get(name)
  if (!c) {
    c = { failures: 0, lastFailure: 0, state: 'closed', halfOpenCount: 0 }
    circuits.set(name, c)
  }
  return c
}

export function isCircuitOpen(name: string): boolean {
  const c = getCircuit(name)
  const now = Date.now()

  if (c.state === 'open') {
    if (now - c.lastFailure > CIRCUIT.COOLDOWN_MS) {
      c.state = 'half-open'
      c.halfOpenCount = 0
      return false
    }
    return true
  }

  return false
}

export function recordSuccess(name: string): void {
  const c = getCircuit(name)
  if (c.state === 'half-open') {
    c.halfOpenCount++
    if (c.halfOpenCount >= CIRCUIT.HALF_OPEN_MAX) {
      c.state = 'closed'
      c.failures = 0
    }
  }
  c.failures = 0
}

export function recordFailure(name: string): void {
  const c = getCircuit(name)
  c.failures++
  c.lastFailure = Date.now()

  if (c.state === 'half-open') {
    c.state = 'open'
  } else if (c.failures >= CIRCUIT.FAILURE_THRESHOLD) {
    c.state = 'open'
  }
}

export function getCircuitState(name: string): { state: string; failures: number } {
  const c = getCircuit(name)
  return { state: c.state, failures: c.failures }
}

// Cleanup old circuits periodically
setInterval(() => {
  const now = Date.now()
  const stale = CIRCUIT.COOLDOWN_MS * 3
  for (const [name, c] of circuits) {
    if (c.state === 'closed' && now - c.lastFailure > stale) {
      circuits.delete(name)
    }
  }
}, 60_000).unref()
