/**
 * AI metrics & structured logging using Pino.
 * Tracks request count, latency, token usage, tool calls, error rates.
 */

import { createLogger } from '@/lib/logger'

const aiLogger = createLogger('ai')

// ─── Request Metrics ────────────────────────────────────────────────────────

interface RequestMetrics {
  conversationId: string
  model: string
  inputLength: number
  startTime: number
  toolCalls: number
  turns: number
  status: 'success' | 'error' | 'aborted'
  promptTokens?: number
  completionTokens?: number
  latencyMs?: number
  errorMessage?: string
}

export function logRequestStart(conversationId: string, model: string, inputLength: number): RequestMetrics {
  const metrics: RequestMetrics = {
    conversationId,
    model,
    inputLength,
    startTime: Date.now(),
    toolCalls: 0,
    turns: 0,
    status: 'success',
  }

  aiLogger.info({
    event: 'ai_request_start',
    conversationId,
    model,
    inputLength,
  })

  return metrics
}

export function logToolCall(metrics: RequestMetrics, toolName: string): void {
  metrics.toolCalls++

  aiLogger.info({
    event: 'ai_tool_call',
    conversationId: metrics.conversationId,
    tool: toolName,
    toolCallIndex: metrics.toolCalls,
  })
}

export function logToolResult(metrics: RequestMetrics, toolName: string, hasError: boolean): void {
  aiLogger.info({
    event: 'ai_tool_result',
    conversationId: metrics.conversationId,
    tool: toolName,
    hasError,
  })
}

export function logTurn(metrics: RequestMetrics, turnNumber: number): void {
  metrics.turns = turnNumber

  aiLogger.info({
    event: 'ai_turn',
    conversationId: metrics.conversationId,
    turn: turnNumber,
  })
}

export function logRequestEnd(metrics: RequestMetrics): void {
  metrics.latencyMs = Date.now() - metrics.startTime

  aiLogger.info({
    event: 'ai_request_end',
    conversationId: metrics.conversationId,
    latencyMs: metrics.latencyMs,
    toolCalls: metrics.toolCalls,
    turns: metrics.turns,
    status: metrics.status,
    ...(metrics.promptTokens ? { promptTokens: metrics.promptTokens } : {}),
    ...(metrics.completionTokens ? { completionTokens: metrics.completionTokens } : {}),
  })
}

export function logError(metrics: RequestMetrics, error: Error | string, sanitized: string): void {
  metrics.status = 'error'
  metrics.errorMessage = sanitized

  aiLogger.error({
    event: 'ai_error',
    conversationId: metrics.conversationId,
    message: sanitized,
    latencyMs: Date.now() - metrics.startTime,
  })
}

export function logAborted(metrics: RequestMetrics): void {
  metrics.status = 'aborted'

  aiLogger.info({
    event: 'ai_aborted',
    conversationId: metrics.conversationId,
    latencyMs: Date.now() - metrics.startTime,
    turns: metrics.turns,
  })
}

export function logGuardBlock(ip: string, reason: string, inputPreview: string): void {
  aiLogger.warn({
    event: 'ai_guard_block',
    ip,
    reason,
    inputPreview: inputPreview.slice(0, 100),
  })
}

export function logRateLimit(ip: string, remaining: number): void {
  aiLogger.warn({
    event: 'ai_rate_limit_hit',
    ip,
    remaining,
  })
}
