import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Must import AFTER mock is set up (the module uses fetch at top level)
import { pingWithRetry, computeVerdict } from './ping-engine'

// pingWithRetry first performs a DNS pre-check (fetch to dns.google) before the
// actual ping attempts. Tests that assert exact attempt counts must account for
// that leading fetch call by mocking a successful DNS resolution first.
const dnsOk = () =>
  ({ ok: true, json: async () => ({ Answer: [{ data: '93.184.216.34' }] }) }) as unknown as Response
// A healthy body long enough to pass the tiny-response heuristic and free of
// error indicators, so it is treated as genuine success (not a holding page).
const okBody = (status: number) =>
  ({ status, text: async () => 'ok '.repeat(50) }) as unknown as Response

describe('pingWithRetry', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns success when endpoint responds 200 OK', async () => {
    mockFetch
      .mockResolvedValueOnce(dnsOk())
      .mockResolvedValueOnce(okBody(200))

    const result = await pingWithRetry('https://example.com', 200)

    expect(result.errored).toBe(false)
    expect(result.statusCode).toBe(200)
    expect(result.attempts).toBe(1)
    expect(result.responseTime).toBeGreaterThanOrEqual(0)
  })

  it('retries up to 3 times on failure', async () => {
    mockFetch
      .mockResolvedValueOnce(dnsOk())
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(okBody(200))

    const result = await pingWithRetry('https://example.com', 200)

    expect(result.attempts).toBe(3)
    expect(result.errored).toBe(false)
    expect(result.statusCode).toBe(200)
  })

  it('returns errored true after 3 failed attempts', async () => {
    mockFetch
      .mockRejectedValue(new Error('ENOTFOUND'))

    const result = await pingWithRetry('https://nonexistent.invalid', 200)

    expect(result.errored).toBe(true)
    expect(result.attempts).toBe(3)
    expect(result.statusCode).toBe(0)
  })

  it('considers mismatched status code as failure', async () => {
    mockFetch.mockResolvedValue({ status: 500 } as Response)

    const result = await pingWithRetry('https://example.com', 200)

    expect(result.errored).toBe(false)
    expect(result.statusCode).toBe(500)
    expect(result.attempts).toBe(3)
  })

  it('handles AbortError from timeout gracefully', async () => {
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'))

    const result = await pingWithRetry('https://slow.example.com', 200)

    expect(result.errored).toBe(true)
    expect(result.attempts).toBe(3)
  })
})

describe('computeVerdict', () => {
  it('returns up when ping succeeds within threshold', () => {
    const result = { statusCode: 200, responseTime: 150, errored: false, attempts: 1 }
    const { verdict, consecutive } = computeVerdict(result, 200, 0)

    expect(verdict).toBe('up')
    expect(consecutive).toBe(0)
  })

  it('returns degraded when response time exceeds 2000ms', () => {
    const result = { statusCode: 200, responseTime: 2500, errored: false, attempts: 1 }
    const { verdict, consecutive } = computeVerdict(result, 200, 0)

    expect(verdict).toBe('degraded')
    expect(consecutive).toBe(0)
  })

  it('returns degraded on first failure', () => {
    const result = { statusCode: 500, responseTime: 100, errored: false, attempts: 1 }
    const { verdict, consecutive } = computeVerdict(result, 200, 0)

    expect(verdict).toBe('degraded')
    expect(consecutive).toBe(1)
  })

  it('returns degraded on second consecutive failure', () => {
    const result = { statusCode: 500, responseTime: 100, errored: false, attempts: 1 }
    const { verdict, consecutive } = computeVerdict(result, 200, 1)

    expect(verdict).toBe('degraded')
    expect(consecutive).toBe(2)
  })

  it('returns down on third consecutive failure', () => {
    const result = { statusCode: 0, responseTime: 100, errored: true, attempts: 1 }
    const { verdict, consecutive } = computeVerdict(result, 200, 2)

    expect(verdict).toBe('down')
    expect(consecutive).toBe(3)
  })

  it('resets consecutive counter on recovery', () => {
    const result = { statusCode: 200, responseTime: 150, errored: false, attempts: 1 }
    const { verdict, consecutive } = computeVerdict(result, 200, 5)

    expect(verdict).toBe('up')
    expect(consecutive).toBe(0)
  })

  it('handles zero response time on error', () => {
    const result = { statusCode: 0, responseTime: 0, errored: true, attempts: 3 }
    const { verdict, consecutive } = computeVerdict(result, 200, 0)

    expect(verdict).toBe('degraded')
    expect(consecutive).toBe(1)
  })
})
