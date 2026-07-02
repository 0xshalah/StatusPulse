/**
 * Unit tests: Circuit Breaker pattern.
 */

import { describe, it, expect, beforeEach } from 'vitest'

// We test the circuit breaker by importing and resetting between tests
// Since it uses module-level state, we need to be careful

describe('Circuit Breaker', () => {
  let isCircuitOpen: Function
  let recordSuccess: Function
  let recordFailure: Function
  let getCircuitState: Function

  beforeEach(async () => {
    // Re-import to reset state
    const mod = await import('../../lib/ai/circuit-breaker')
    isCircuitOpen = mod.isCircuitOpen
    recordSuccess = mod.recordSuccess
    recordFailure = mod.recordFailure
    getCircuitState = mod.getCircuitState
  })

  it('starts closed', () => {
    expect(isCircuitOpen('test-cb')).toBe(false)
    const state = getCircuitState('test-cb')
    expect(state.state).toBe('closed')
    expect(state.failures).toBe(0)
  })

  it('records failures', () => {
    recordFailure('test-cb')
    recordFailure('test-cb')
    const state = getCircuitState('test-cb')
    expect(state.failures).toBe(2)
    expect(state.state).toBe('closed')
  })

  it('opens after threshold failures', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure('test-cb')
    }
    expect(isCircuitOpen('test-cb')).toBe(true)
    const state = getCircuitState('test-cb')
    expect(state.state).toBe('open')
  })

  it('stays open while cooldown is active', () => {
    // Trip the breaker
    for (let i = 0; i < 5; i++) {
      recordFailure('test-cb')
    }
    expect(isCircuitOpen('test-cb')).toBe(true)

    // Success while open doesn't close immediately (still in cooldown)
    recordSuccess('test-cb')
    expect(isCircuitOpen('test-cb')).toBe(true)
  })

  it('resets failures on success while closed', () => {
    recordFailure('test-cb')
    recordFailure('test-cb')
    recordSuccess('test-cb')
    const state = getCircuitState('test-cb')
    expect(state.failures).toBe(0)
  })

  it('isolates circuits by name', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure('circuit-a')
    }
    expect(isCircuitOpen('circuit-a')).toBe(true)
    expect(isCircuitOpen('circuit-b')).toBe(false)
  })
})
