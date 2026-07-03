/**
 * Chat endpoint — POST /api/chat
 *
 * Full pipeline with all 10 quality dimensions addressed:
 *   - Security: rate limiting, sanitized errors, no hardcoded keys
 *   - Guardrails: input sanitization, injection detection, Zod tool validation
 *   - Scalability: Redis conversation store (with in-memory fallback)
 *   - Observability: Pino structured logging, token tracking, latency metrics
 *   - Reliability: retry with backoff, circuit breaker, graceful degradation
 *   - AI: response caching, few-shot system prompt, smart summarization
 */

import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { rateLimit } from '@/lib/security'
import { createLogger } from '@/lib/logger'
import { sseEvent, createSSEResponse, corsResponse, streamChat } from '@/lib/ai/stream'
import type { ChatMessage } from '@/lib/ai/stream'
import { loadApiSchema, callTool, schemaToOpenAITools } from '@/lib/ai/tools'
import type { ApiSchema } from '@/lib/ai/tools'
import { getHistory, saveHistory, clearHistory, trackTokenUsage } from '@/lib/ai/redis-store'
import type { StoredMessage } from '@/lib/ai/redis-store'
import { applyGuard, sanitizeError, checkOutputContent } from '@/lib/ai/guard'
import { minimizePageContext, anonymizeIP } from '@/lib/privacy'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { logRequestStart, logToolCall, logToolResult, logTurn, logRequestEnd, logError, logAborted, logGuardBlock, logRateLimit } from '@/lib/ai/metrics'
import { queryCache } from '@/lib/ai/cache'
import { resolveApiKey, resolveTavilyKey } from '@/lib/ai/env'
import { filterSearchResults } from '@/lib/ai/content-filter'
import { LIMITS, DEEPSEEK_BASE_URL, TAVILY_SEARCH_URL, EVENT, SSE_PREFIX, SSE_DONE } from '@/lib/ai/constants'
import { resolveModelName } from '@/lib/ai/model'

const logger = createLogger('chat-api')

// ─── Config loading ──────────────────────────────────────────────────────────
interface AssistantConfig {
  name?: string
  welcome?: string
  systemPrompt?: string
  suggestedQuestions?: string[]
  tavilySearchEnabled?: boolean
}

let _configCache: AssistantConfig | null = null
let _configLoaded = false

async function loadConfig(): Promise<AssistantConfig> {
  if (_configLoaded) return _configCache || {}
  _configLoaded = true
  try {
    const content = await readFile(resolve(process.cwd(), 'ai-chat-assistant.config.json'), 'utf-8')
    _configCache = JSON.parse(content)
  } catch {
    _configCache = {}
  }
  return _configCache || {}
}

// ─── Helper: extract client IP ───────────────────────────────────────────────
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  // ─── Layer 1: Rate Limiting (hashed IP) ──────────────────────────────────
  const rl = rateLimit(`ai:${anonymizeIP(ip)}`, LIMITS.RATE_LIMIT_PER_MINUTE, 60_000)
  if (!rl.allowed) {
    logRateLimit(ip, rl.remaining)
    return corsResponse({ error: 'Too many requests. Please slow down.', retryAfter: rl.reset }, 429)
  }

  // ─── Layer 2: Parse body ─────────────────────────────────────────────────
  let body: any
  try {
    body = await request.json()
  } catch {
    return corsResponse({ error: 'Invalid JSON body' }, 400)
  }

  const rawMessage = typeof body.message === 'string' ? body.message.trim() : ''
  const pageContext: { title?: string; url?: string; content?: string } | undefined = body.pageContext

  // Sanitize + minimize page context
  if (pageContext) {
    pageContext.title = pageContext.title?.slice(0, 200)
    pageContext.content = (pageContext.content || '')
      .replace(/\b(system prompt|ignore instructions|you are now|act as|pretend to be)\b/gi, '[FILTERED]')
      .slice(0, 1000) // minimize: 6000 → 1000 chars
  }
  const conversationId: string = typeof body.conversation_id === 'string' ? body.conversation_id : ''

  // ─── Layer 3: Input guard ────────────────────────────────────────────────
  const guard = applyGuard(rawMessage, ip)
  if (!guard.allowed) {
    logGuardBlock(ip, guard.error || 'unknown')
    return corsResponse({ error: guard.error }, 400)
  }

  const message = guard.sanitized

  // ─── Layer 4: Response cache check ───────────────────────────────────────
  const cached = queryCache.get(message, conversationId)
  if (cached) {
    logger.info({ event: 'cache_hit', conversationId, messagePreview: message.slice(0, 50) })
    async function* cachedGenerate(sig?: AbortSignal): AsyncGenerator<string> {
      for (let i = 0; i < cached.length; i += 50) {
        if (sig?.aborted) break
        yield sseEvent({ type: EVENT.TEXT_DELTA, delta: cached.slice(i, i + 50) })
      }
      yield `${SSE_PREFIX}${SSE_DONE}\n\n`
    }
    return createSSEResponse(cachedGenerate, request.signal)
  }

  // ─── Configuration ───────────────────────────────────────────────────────
  const config = await loadConfig()
  const ctxEnv: Record<string, string | undefined> = process.env as any
  const model = resolveModelName(ctxEnv)
  const baseURL = ctxEnv.AI_GATEWAY_BASE_URL || DEEPSEEK_BASE_URL

  // Multi-source key resolution (auto-detect EdgeOne vs local)
  const keySource = resolveApiKey()
  const apiKey = keySource.value
  const tavilySource = resolveTavilyKey()
  const tavilyKey = tavilySource.value

  if (!apiKey) {
    return corsResponse({ error: 'AI service not configured. Set AI_GATEWAY_API_KEY.' }, 503)
  }

  // ─── Assemble tools ──────────────────────────────────────────────────────
  const tools: any[] = []
  let apiSchema: ApiSchema | null = null

  apiSchema = await loadApiSchema(ctxEnv)
  if (apiSchema) {
    tools.push(...schemaToOpenAITools(apiSchema))
  }

  if (config.tavilySearchEnabled && tavilyKey) {
    tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for troubleshooting guides, error code solutions, and API documentation.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query for troubleshooting' },
          },
          required: ['query'],
        },
      },
    })
  }

  // ─── System prompt + page context ────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(config.systemPrompt, pageContext)

  // ─── Conversation history (Redis) ────────────────────────────────────────
  const rawHistory = conversationId ? await getHistory(conversationId) : []
  rawHistory.push({ role: 'user', content: message })

  // ─── Metrics ─────────────────────────────────────────────────────────────
  const metrics = logRequestStart(conversationId, model, message.length)
  const allToolNames = apiSchema ? apiSchema.tools.map(t => t.name) : []

  // ─── SSE generator ───────────────────────────────────────────────────────
  async function* generate(sig?: AbortSignal): AsyncGenerator<string> {
    const signal = sig
    let lastPing = Date.now()
    let fullResponse = ''

    try {
      let currentTools = [...tools]
      let turns = 0

      while (turns < (currentTools.length > 0 ? LIMITS.MAX_TOOL_TURNS : 1)) {
        if (signal?.aborted) { logAborted(metrics); break }
        turns++
        logTurn(metrics, turns)

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...rawHistory.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          })) as ChatMessage[],
        ]

        let assistantText = ''
        let toolCalls: Array<{ id: string; name: string; arguments: string }> = []
        let promptTokens = 0
        let completionTokens = 0

        for await (const delta of streamChat(baseURL, apiKey, model, messages, currentTools.length > 0 ? currentTools : undefined, signal)) {
          if (Date.now() - lastPing > LIMITS.PING_INTERVAL_MS) {
            yield sseEvent({ type: EVENT.PING, ts: Date.now() })
            lastPing = Date.now()
          }

          if (signal?.aborted) { logAborted(metrics); return }

          if (delta.type === 'text' && delta.text) {
            assistantText += delta.text
            fullResponse += delta.text
            yield sseEvent({ type: EVENT.TEXT_DELTA, delta: delta.text })
          }

          if (delta.type === 'tool_call' && delta.toolCall) {
            const tc = delta.toolCall
            let existing = toolCalls[tc.index]
            if (!existing) {
              existing = { id: tc.id || `tc_${tc.index}`, name: tc.name || '', arguments: '' }
              toolCalls[tc.index] = existing
            }
            if (tc.id) existing.id = tc.id
            if (tc.name) existing.name = tc.name
            existing.arguments += tc.arguments
          }

          if (delta.usage) {
            promptTokens = delta.usage.promptTokens
            completionTokens = delta.usage.completionTokens
          }
        }

        if (signal?.aborted) { logAborted(metrics); return }

        toolCalls = toolCalls.filter(Boolean)

        // Track token usage
        if (promptTokens || completionTokens) {
          metrics.promptTokens = (metrics.promptTokens || 0) + promptTokens
          metrics.completionTokens = (metrics.completionTokens || 0) + completionTokens
          trackTokenUsage(conversationId, promptTokens, completionTokens)
        }

        // Save assistant message
        if (assistantText || toolCalls.length > 0) {
          rawHistory.push({
            role: 'assistant',
            content: assistantText,
            ...(toolCalls.length > 0 ? {
              tool_calls: toolCalls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            } : {}),
          })
        }

        if (toolCalls.length === 0) break

        // ─── Execute tool calls ────────────────────────────────────────────
        let allFailed = true
        for (const tc of toolCalls) {
          if (signal?.aborted) break

          let input: Record<string, any> = {}
          try { input = JSON.parse(tc.arguments) } catch {
            input = {}
          }

          logToolCall(metrics, tc.name)
          yield sseEvent({ type: EVENT.TOOL_CALL, tool: tc.name, input })

          let result: any

          // Handle Tavily search
          if (tc.name === 'web_search') {
            try {
              const searchRes = await fetch(TAVILY_SEARCH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_key: tavilyKey,
                  query: input.query || '',
                  search_depth: 'advanced',
                  max_results: 5,
                  include_answer: true,
                }),
                signal: AbortSignal.timeout(LIMITS.TAVILY_TIMEOUT_MS),
              })
              result = await searchRes.json()
              // Content safety filter
              const rawResults = (result.results || []).slice(0, 5)
              const safeResults = filterSearchResults(rawResults.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: (r.content || '').slice(0, 300),
              })))
              result = {
                answer: result.answer,
                results: safeResults,
                _filtered: safeResults.length < rawResults.length ? `${rawResults.length - safeResults.length} results filtered for safety` : undefined,
              }
            } catch (e: any) {
              result = { error: sanitizeError(e) }
            }
          } else if (apiSchema) {
            result = await callTool(apiSchema, ctxEnv.DATA_API_BASE_URL || '', ctxEnv.DATA_API_KEY, tc.name, input)
          } else {
            result = { error: `Tool not available: ${tc.name}` }
          }

          const hasError = !!result?.error
          logToolResult(metrics, tc.name, hasError)
          if (!hasError) allFailed = false

          yield sseEvent({ type: EVENT.TOOL_RESULT, tool: tc.name, result })

          rawHistory.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: tc.id,
          })
        }

        if (allFailed) {
          logger.warn({ event: 'all_tools_failed', conversationId, turn: turns })
          currentTools = []
        }
        toolCalls = []
      }

      // Output guard: check response for code blocks, prompt leaks, roleplay
      let safeResponse = fullResponse
      if (fullResponse && fullResponse.length > 20) {
        const outputCheck = checkOutputContent(fullResponse)
        if (outputCheck.blocked) {
          logger.warn({ event: 'output_blocked', conversationId, reason: outputCheck.reason })
          safeResponse = '⚠️ I cannot provide that response — it may violate content safety guidelines. Please rephrase your request regarding API monitoring.'
        }
        queryCache.set(message, safeResponse, conversationId)
      }

    } catch (err: any) {
      if (err?.name !== 'AbortError' && !signal?.aborted) {
        const safeError = sanitizeError(err)
        logError(metrics, safeError)
        yield sseEvent({ type: EVENT.ERROR, content: safeError })
      }
    }

    // Persist history
    if (conversationId && rawHistory.length > 0) {
      saveHistory(conversationId, rawHistory)
    }

    logRequestEnd(metrics)
    yield `${SSE_PREFIX}${SSE_DONE}\n\n`
  }

  return createSSEResponse(generate, request.signal)
}

// ─── Handle OPTIONS preflight ────────────────────────────────────────────────
export async function OPTIONS() {
  return corsResponse()
}
