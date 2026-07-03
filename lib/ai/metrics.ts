/**
 * AI metrics & structured logging using Pino.
 * Privacy-first: all IPs are hashed, no user input in logs.
 */
import { createLogger } from '@/lib/logger'
import { anonymizeIP, redactLogData } from '@/lib/privacy'

const aiLogger = createLogger('ai')

export interface RequestMetrics {
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
  const m: RequestMetrics = { conversationId, model, inputLength, startTime: Date.now(), toolCalls: 0, turns: 0, status: 'success' }
  aiLogger.info(redactLogData({ event: 'ai_request_start', conversationId: anonymizeIP(conversationId), model, inputLength }))
  return m
}

export function logToolCall(metrics: RequestMetrics, toolName: string): void {
  metrics.toolCalls++
  aiLogger.info(redactLogData({ event: 'ai_tool_call', conversationId: anonymizeIP(metrics.conversationId), tool: toolName }))
}

export function logToolResult(metrics: RequestMetrics, toolName: string, hasError: boolean): void {
  aiLogger.info(redactLogData({ event: 'ai_tool_result', conversationId: anonymizeIP(metrics.conversationId), tool: toolName, hasError }))
}

export function logTurn(metrics: RequestMetrics, turnNumber: number): void {
  metrics.turns = turnNumber
  aiLogger.info(redactLogData({ event: 'ai_turn', conversationId: anonymizeIP(metrics.conversationId), turn: turnNumber }))
}

export function logRequestEnd(metrics: RequestMetrics): void {
  metrics.latencyMs = Date.now() - metrics.startTime
  aiLogger.info(redactLogData({ event: 'ai_request_end', conversationId: anonymizeIP(metrics.conversationId), latencyMs: metrics.latencyMs, toolCalls: metrics.toolCalls, turns: metrics.turns, status: metrics.status, ...(metrics.promptTokens ? { promptTokens: metrics.promptTokens } : {}), ...(metrics.completionTokens ? { completionTokens: metrics.completionTokens } : {}) }))
}

export function logError(metrics: RequestMetrics, sanitized: string): void {
  metrics.status = 'error'; metrics.errorMessage = sanitized
  aiLogger.error(redactLogData({ event: 'ai_error', conversationId: anonymizeIP(metrics.conversationId), message: sanitized, latencyMs: Date.now() - metrics.startTime }))
}

export function logAborted(metrics: RequestMetrics): void {
  metrics.status = 'aborted'
  aiLogger.info(redactLogData({ event: 'ai_aborted', conversationId: anonymizeIP(metrics.conversationId), latencyMs: Date.now() - metrics.startTime, turns: metrics.turns }))
}

export function logGuardBlock(ip: string, reason: string): void {
  aiLogger.warn(redactLogData({ event: 'ai_guard_block', ip: anonymizeIP(ip), reason }))
}

export function logRateLimit(ip: string, remaining: number): void {
  aiLogger.warn(redactLogData({ event: 'ai_rate_limit_hit', ip: anonymizeIP(ip), remaining }))
}
