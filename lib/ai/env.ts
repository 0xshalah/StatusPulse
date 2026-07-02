/**
 * Environment-aware API key resolver.
 * Auto-detects EdgeOne vs local vs Docker and resolves keys from multiple sources.
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('ai-env')

// ─── Runtime detection ──────────────────────────────────────────────────────
function isEdgeOne(): boolean {
  return !!(
    process.env.EDGEONE === 'true'
    || process.env.EDGEONE_DEPLOY === 'true'
    || process.env.NEXT_RUNTIME === 'edge'
  )
}

function isLocal(): boolean {
  return !isEdgeOne() && (
    process.env.NODE_ENV === 'development'
    || !process.env.VERCEL
    || process.env.LOCAL === 'true'
  )
}

// ─── Multi-source key resolution ────────────────────────────────────────────
// Fallback keys — set AI_GATEWAY_API_KEY and TAVILY_API_KEY in EdgeOne dashboard
// or .env file for production. These are development-only placeholders.
const DEEPSEEK_FALLBACK_KEY = process.env.DEEPSEEK_DEV_KEY || ''
const TAVILY_FALLBACK_KEY = process.env.TAVILY_DEV_KEY || ''

interface KeySource {
  value: string
  source: 'edgeone_env' | 'edgeone_fallback' | 'process_env' | 'env_file' | 'hardcoded' | 'none'
}

export function resolveApiKey(): KeySource {
  // Priority 1: EdgeOne dashboard env var
  if (process.env.AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_API_KEY.length > 10) {
    return { value: process.env.AI_GATEWAY_API_KEY, source: isEdgeOne() ? 'edgeone_env' : 'process_env' }
  }

  // Priority 2: Alternative env var naming (some platforms)
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 10) {
    return { value: process.env.DEEPSEEK_API_KEY, source: 'process_env' }
  }

  // Priority 3: .env file (local dev)
  if (process.env.AI_GATEWAY_API_KEY_DEEPSEEK && process.env.AI_GATEWAY_API_KEY_DEEPSEEK.length > 10) {
    return { value: process.env.AI_GATEWAY_API_KEY_DEEPSEEK, source: 'env_file' }
  }

  // Priority 4: Hardcoded fallback (EdgeOne doesn't expose process.env reliably)
  if (isEdgeOne()) {
    logger.warn({ event: 'key_source', source: 'edgeone_fallback', note: 'Set AI_GATEWAY_API_KEY in EdgeOne dashboard for production' })
    return { value: DEEPSEEK_FALLBACK_KEY, source: 'edgeone_fallback' }
  }

  // Priority 5: Local fallback
  if (isLocal()) {
    logger.warn({ event: 'key_source', source: 'hardcoded', note: 'Using hardcoded dev key' })
    return { value: DEEPSEEK_FALLBACK_KEY, source: 'hardcoded' }
  }

  logger.error({ event: 'key_missing', source: 'none' })
  return { value: '', source: 'none' }
}

export function resolveTavilyKey(): KeySource {
  if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length > 10) {
    return { value: process.env.TAVILY_API_KEY, source: isEdgeOne() ? 'edgeone_env' : 'process_env' }
  }

  if (isEdgeOne() || isLocal()) {
    return { value: TAVILY_FALLBACK_KEY, source: isEdgeOne() ? 'edgeone_fallback' : 'hardcoded' }
  }

  return { value: '', source: 'none' }
}

// ─── Runtime info ────────────────────────────────────────────────────────────
export function getRuntimeInfo() {
  return {
    platform: isEdgeOne() ? 'EdgeOne' : isLocal() ? 'Local' : 'Unknown',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    keySource: resolveApiKey().source,
  }
}
