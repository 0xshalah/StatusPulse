/**
 * Unit tests: AI Stream — SSE helpers, stream types.
 */

import { describe, it, expect, beforeEach } from 'vitest'

describe('SSE Event Formatting', () => {
  let sseEvent: Function

  beforeEach(async () => {
    const mod = await import('../../lib/ai/stream')
    sseEvent = mod.sseEvent
  })

  it('formats simple event', () => {
    const result = sseEvent({ type: 'text_delta', delta: 'Hello' })
    expect(result).toBe('data: {"type":"text_delta","delta":"Hello"}\n\n')
  })

  it('formats event with nested object', () => {
    const result = sseEvent({ type: 'tool_call', tool: 'web_search', input: { query: 'test' } })
    expect(result).toContain('data: ')
    expect(result).toContain('"tool":"web_search"')
    expect(result).toContain('"query":"test"')
  })

  it('ends with double newline', () => {
    const result = sseEvent({ type: 'ping', ts: 123 })
    expect(result.endsWith('\n\n')).toBe(true)
  })

  it('handles empty object', () => {
    const result = sseEvent({})
    expect(result).toBe('data: {}\n\n')
  })
})

describe('CORS Response', () => {
  let corsResponse: Function

  beforeEach(async () => {
    const mod = await import('../../lib/ai/stream')
    corsResponse = mod.corsResponse
  })

  it('returns 204 for OPTIONS preflight', () => {
    const response = corsResponse()
    expect(response.status).toBe(204)
  })

  it('returns JSON with CORS headers', () => {
    const response = corsResponse({ ok: true })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('returns custom status code', () => {
    const response = corsResponse({ error: 'not found' }, 404)
    expect(response.status).toBe(404)
  })
})

describe('ChatMessage Type', () => {
  it('accepts valid system message', () => {
    const msg = { role: 'system' as const, content: 'You are helpful' }
    expect(msg.role).toBe('system')
    expect(msg.content).toBe('You are helpful')
  })

  it('accepts user message', () => {
    const msg = { role: 'user' as const, content: 'Hello' }
    expect(msg.role).toBe('user')
  })

  it('accepts assistant with tool_calls', () => {
    const msg = {
      role: 'assistant' as const,
      content: '',
      tool_calls: [{ id: 'tc1', type: 'function' as const, function: { name: 'get', arguments: '{}' } }],
    }
    expect(msg.tool_calls).toHaveLength(1)
  })

  it('accepts tool result', () => {
    const msg = {
      role: 'tool' as const,
      content: JSON.stringify({ status: 'ok' }),
      tool_call_id: 'tc1',
    }
    expect(msg.tool_call_id).toBe('tc1')
  })
})
