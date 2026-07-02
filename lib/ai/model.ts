/**
 * AI Model configuration for StatusPulse
 * Uses DeepSeek V4 Pro by default (OpenAI-compatible)
 */

const DEFAULT_MODEL = 'deepseek-v4-pro'

export function resolveModelName(env?: Record<string, string | undefined>): string {
  return env?.AI_GATEWAY_MODEL || DEFAULT_MODEL
}
