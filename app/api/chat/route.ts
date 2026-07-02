/**
 * Chat endpoint — POST /api/chat
 *
 * Two-layer context acquisition:
 *   A. Page context — embed.js extracts current page content, injected into system prompt
 *   B. Monitoring API — StatusPulse tools via api-schema.json
 *
 * Uses DeepSeek V4 Pro (OpenAI-compatible streaming API).
 * When tools are available, runs a tool-calling loop (max 4 turns).
 */

import { NextRequest } from 'next/server'
import { resolveModelName } from '@/lib/ai/model'
import { createLogger, sseEvent, createSSEResponse, corsResponse, streamChat } from '@/lib/ai/stream'
import type { ChatMessage } from '@/lib/ai/stream'
import { loadApiSchema, callTool, schemaToOpenAITools } from '@/lib/ai/tools'
import type { ApiSchema } from '@/lib/ai/tools'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

const logger = createLogger('chat')

const MAX_HISTORY = 20
const MAX_TOOL_TURNS = 4

// In-process conversation history
const _history = new Map<string, ChatMessage[]>()

// ─── Load config file ────────────────────────────────────────────────────────
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
    logger.log(`[config] loaded ai-chat-assistant.config.json`)
  } catch {
    _configCache = {}
  }
  return _configCache || {}
}

// ─── System prompt builder (Layer A: page context) ───────────────────────────
function buildSystemPrompt(
  config: AssistantConfig,
  env: Record<string, string | undefined>,
  pageContext?: { title?: string; url?: string; content?: string },
): string {
  const basePrompt = env.SYSTEM_PROMPT || config.systemPrompt ||
    'You are a helpful, friendly AI assistant. Answer questions clearly and concisely. Use Markdown formatting when appropriate.'

  let prompt = basePrompt

  prompt += '\n\n## Tool Usage Guidelines\n'
  prompt += 'When using tools, always provide all required parameters. '
  prompt += 'If a tool call fails due to missing parameters, do NOT retry with the same empty input — '
  prompt += 'instead, try a different tool or answer based on available information. '
  prompt += 'When presenting monitoring data, use bullet points for clarity and include relevant metrics like response time and uptime percentages.'

  if (pageContext && (pageContext.title || pageContext.content)) {
    prompt += `\n\n---\n## Current Page Context\n`
    if (pageContext.title) prompt += `**Title:** ${pageContext.title}\n`
    if (pageContext.url) prompt += `**URL:** ${pageContext.url}\n`
    if (pageContext.content) {
      prompt += `\n**Page Content:**\n${pageContext.content.slice(0, 6000)}\n`
    }
    prompt += `\n---\nUse the page context above to answer questions about the current page. If the question is unrelated, still answer helpfully.\n`
  }

  return prompt
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const pageContext: { title?: string; url?: string; content?: string } | undefined = body.pageContext

    if (!message) {
      return corsResponse({ error: "'message' is required" }, 400)
    }

    const signal: AbortSignal = request.signal
    const conversationId: string = body.conversation_id || ''
    const ctxEnv: Record<string, string | undefined> = process.env as any
    const config = await loadConfig()
    const model = resolveModelName(ctxEnv)
    const baseURL = ctxEnv.AI_GATEWAY_BASE_URL || ''
    const apiKey = ctxEnv.AI_GATEWAY_API_KEY || ''

    // ─── Assemble available tools ──────────────────────────────────────────
    const tools: any[] = []
    let apiSchema: ApiSchema | null = null

    logger.log(`[tools] attempting to load API schema...`)
    apiSchema = await loadApiSchema(ctxEnv)
    if (apiSchema) {
      tools.push(...schemaToOpenAITools(apiSchema))
      logger.log(`[tools] loaded ${apiSchema.tools.length} API tools`)
    }

    // Add Tavily web search if enabled
    if (config.tavilySearchEnabled && ctxEnv.TAVILY_API_KEY) {
      tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information about APIs, incidents, error codes, or troubleshooting guides.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query' },
            },
            required: ['query'],
          },
        },
      })
      logger.log(`[tools] Tavily web search enabled`)
    }

    const systemPrompt = buildSystemPrompt(config, ctxEnv, pageContext)

    // ─── Conversation history ──────────────────────────────────────────────
    if (!_history.has(conversationId)) {
      _history.set(conversationId, [])
    }
    const history = _history.get(conversationId)!
    history.push({ role: 'user', content: message })
    while (history.length > MAX_HISTORY) history.shift()

    logger.log(`[request] cid=${conversationId}, model=${model}, tools=${tools.length}, msg="${message.slice(0, 80)}"`)

    // ─── SSE generator ─────────────────────────────────────────────────────
    async function* generate(sig?: AbortSignal): AsyncGenerator<string> {
      let lastPing = Date.now()

      try {
        let currentTools = [...tools]
        let turns = 0

        while (turns < (currentTools.length > 0 ? MAX_TOOL_TURNS : 1)) {
          if (sig?.aborted) break
          turns++

          const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history,
          ]

          let assistantText = ''
          let toolCalls: Array<{ id: string; name: string; arguments: string }> = []

          for await (const delta of streamChat(baseURL, apiKey, model, messages, currentTools.length > 0 ? currentTools : undefined, sig)) {
            if (Date.now() - lastPing > 5000) {
              yield sseEvent({ type: 'ping', ts: Date.now() })
              lastPing = Date.now()
            }

            if (delta.type === 'text' && delta.text) {
              assistantText += delta.text
              yield sseEvent({ type: 'text_delta', delta: delta.text })
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
          }

          toolCalls = toolCalls.filter(Boolean)

          if (assistantText || toolCalls.length > 0) {
            history.push({
              role: 'assistant',
              content: assistantText,
              ...(toolCalls.length > 0 ? {
                tool_calls: toolCalls.map((tc) => ({
                  id: tc.id,
                  type: 'function',
                  function: { name: tc.name, arguments: tc.arguments },
                })),
              } : {}),
            })
            while (history.length > MAX_HISTORY) history.shift()
          }

          if (toolCalls.length === 0) {
            break
          }

          // ─── Execute tool calls ──────────────────────────────────────────
          let allFailed = true
          for (const tc of toolCalls) {
            if (sig?.aborted) break

            let input: Record<string, any> = {}
            try { input = JSON.parse(tc.arguments) } catch {}

            yield sseEvent({ type: 'tool_call', tool: tc.name, input })

            let result: any

            // Handle Tavily web search
            if (tc.name === 'web_search') {
              const tavilyKey = ctxEnv.TAVILY_API_KEY
              if (tavilyKey) {
                try {
                  const searchRes = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      api_key: tavilyKey,
                      query: input.query || '',
                      search_depth: 'basic',
                      max_results: 5,
                    }),
                    signal: AbortSignal.timeout(15000),
                  })
                  result = await searchRes.json()
                } catch (e: any) {
                  result = { error: `Web search failed: ${e.message}` }
                }
              } else {
                result = { error: 'Tavily API key not configured' }
              }
            } else if (apiSchema) {
              result = await callTool(apiSchema, ctxEnv.DATA_API_BASE_URL || '', ctxEnv.DATA_API_KEY, tc.name, input)
            } else {
              result = { error: `Unknown tool: ${tc.name}` }
            }

            if (!result.error) allFailed = false

            yield sseEvent({ type: 'tool_result', tool: tc.name, result })

            history.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: tc.id,
            })
            while (history.length > MAX_HISTORY) history.shift()
          }

          if (!allFailed) {
            const recentResults = history.slice(-toolCalls.length)
            const hasAnyError = recentResults.some(h => {
              if (h.role !== 'tool') return false
              try { return !!JSON.parse(h.content as string).error } catch { return false }
            })
            if (hasAnyError) {
              logger.log(`[stream] some tool calls failed, disabling tools for final answer`)
              currentTools = []
            }
          } else {
            logger.log(`[stream] all ${toolCalls.length} tool calls failed, disabling tools for final answer`)
            currentTools = []
          }

          toolCalls = []
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError' && !sig?.aborted) {
          logger.error('[stream] error:', err?.message || err)
          yield sseEvent({ type: 'error_message', content: err?.message || 'An error occurred' })
        }
      }

      yield 'data: [DONE]\n\n'
    }

    return createSSEResponse(generate, signal)
  } catch (err: any) {
    return corsResponse({ error: err?.message || 'Internal server error' }, 500)
  }
}

// Handle OPTIONS preflight
export async function OPTIONS() {
  return corsResponse()
}
