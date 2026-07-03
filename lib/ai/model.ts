/**
 * AI Model configuration for StatusPulse.
 * Primary: DeepSeek V4 Pro. Fallback: DeepSeek Chat.
 */

const DEFAULT_MODEL = 'deepseek-v4-pro'
const FALLBACK_MODEL = 'deepseek-chat'

export function resolveModelName(env?: Record<string, string | undefined>): string {
  return env?.AI_GATEWAY_MODEL || DEFAULT_MODEL
}

export function resolveFallbackModel(): string {
  return FALLBACK_MODEL
}

export function shouldUseFallback(errorMessage: string): boolean {
  // Use fallback if primary model is overloaded or unavailable
  const lower = errorMessage.toLowerCase()
  return (
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('capacity') ||
    lower.includes('unavailable') ||
    lower.includes('timeout')
  )
}
