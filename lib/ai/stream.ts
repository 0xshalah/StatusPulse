/**
 * Shared utilities: SSE helpers, OpenAI-compatible streaming client with retry,
 * circuit breaker integration, error sanitization.
 */
import { createLogger } from '@/lib/logger'
import { isCircuitOpen, recordSuccess, recordFailure } from './circuit-breaker'
import { sanitizeError } from './guard'
import { RETRY, LIMITS, DEEPSEEK_BASE_URL, EVENT, SSE_PREFIX, SSE_DONE } from './constants'

const logger = createLogger('ai-stream')

// ─── CORS headers ────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_URL || 'https://statuspulse.edgeone.dev'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, makers-conversation-id, Authorization',
}

// ─── SSE helpers ─────────────────────────────────────────────────────────────
export function sseEvent(data: Record<string, any>): string {
  return `${SSE_PREFIX}${JSON.stringify(data)}\n\n`
}

export function createSSEResponse(
  generator: (signal?: AbortSignal) => AsyncGenerator<string>,
  signal?: AbortSignal,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator(signal)) {
          if (signal?.aborted) break
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          const safe = sanitizeError(err)
          controller.enqueue(encoder.encode(sseEvent({ type: EVENT.ERROR, content: safe })))
        }
      } finally {
        try { controller.close() } catch {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...CORS_HEADERS,
    },
  })
}

export function corsResponse(body?: any, status = 200): Response {
  if (body === undefined) {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | any[]
  tool_call_id?: string
  tool_calls?: any[]
}

export interface StreamDelta {
  type: 'text' | 'tool_call' | 'done'
  text?: string
  toolCall?: { index: number; id: string; name: string; arguments: string }
  finishReason?: string | null
  usage?: { promptTokens: number; completionTokens: number }
}

// ─── Retry with exponential backoff ──────────────────────────────────────────
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  circuitName: string,
): Promise<Response> {
  if (isCircuitOpen(circuitName)) {
    throw new Error('Service temporarily unavailable — circuit breaker open')
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < RETRY.MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, options)

      if (res.ok) {
        recordSuccess(circuitName)
        return res
      }

      // Don't retry 4xx errors (client errors)
      if (res.status >= 400 && res.status < 500) {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status} ${text.slice(0, 200)}`)
      }

      // 5xx — retryable
      if (attempt < RETRY.MAX_ATTEMPTS - 1) {
        const delay = Math.min(RETRY.BASE_DELAY_MS * Math.pow(2, attempt), RETRY.MAX_DELAY_MS)
        logger.info({ event: 'retry', attempt: attempt + 1, delay, circuit: circuitName })
        await sleep(delay)
      } else {
        const text = await res.text().catch(() => '')
        throw new Error(`${res.status} ${text.slice(0, 200)}`)
      }
    } catch (err: any) {
      lastError = err
      if (attempt < RETRY.MAX_ATTEMPTS - 1) {
        const delay = Math.min(RETRY.BASE_DELAY_MS * Math.pow(2, attempt), RETRY.MAX_DELAY_MS)
        logger.info({ event: 'retry', attempt: attempt + 1, delay, circuit: circuitName, error: sanitizeError(err) })
        await sleep(delay)
      }
    }
  }

  recordFailure(circuitName)
  throw lastError || new Error('All retry attempts failed')
}

// ─── OpenAI-compatible streaming chat ─────────────────────────────────────────
export async function* streamChat(
  baseURL: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools?: any[],
  signal?: AbortSignal,
): AsyncGenerator<StreamDelta> {
  const url = `${(baseURL || DEEPSEEK_BASE_URL).replace(/\/+$/, '')}/chat/completions`

  const body: any = {
    model,
    messages,
    stream: true,
    max_tokens: LIMITS.MAX_TOKENS,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
  }

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  }, 'deepseek')

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let promptTokens = 0
  let completionTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith(SSE_PREFIX)) continue
      const payload = trimmed.slice(SSE_PREFIX.length)
      if (payload === SSE_DONE) {
        yield { type: 'done', usage: { promptTokens, completionTokens } }
        return
      }
      try {
        const chunk = JSON.parse(payload)
        const choice = chunk.choices?.[0]
        if (!choice) continue

        // Track token usage
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens || 0
          completionTokens = chunk.usage.completion_tokens || 0
        }

        const delta = choice.delta
        if (delta?.content) {
          yield { type: 'text', text: delta.content }
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            yield {
              type: 'tool_call',
              toolCall: {
                index: tc.index ?? 0,
                id: tc.id || '',
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              },
            }
          }
        }
        if (choice.finish_reason) {
          yield { type: 'done', finishReason: choice.finish_reason, usage: { promptTokens, completionTokens } }
        }
      } catch {}
    }
  }
}
