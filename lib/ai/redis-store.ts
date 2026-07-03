/**
 * Redis-based conversation store with TTL, size limits, and graceful fallback.
 * Replaces the old in-memory Map — scalable across instances.
 */

import Redis from 'ioredis'
import { LIMITS } from './constants'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

// Singleton Redis client for AI conversation store
const globalForRedis = globalThis as unknown as { aiRedis: Redis | undefined }

export const aiRedis = globalForRedis.aiRedis ?? new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy(times) {
    if (times > 5) return null // stop retrying
    return Math.min(times * 200, 2000)
  },
})

if (process.env.NODE_ENV !== 'production') globalForRedis.aiRedis = aiRedis

// ─── Redis Conversation Store ────────────────────────────────────────────────

const KEY_PREFIX = 'sp:ai:conv:'

function conversationKey(conversationId: string): string {
  return `${KEY_PREFIX}${conversationId}`
}

interface StoredMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

interface ConversationStore {
  messages: StoredMessage[]
  createdAt: number
  lastActivity: number
  messageCount: number
}

let redisAvailable = true

aiRedis.on('error', () => {
  redisAvailable = false
})

aiRedis.on('connect', () => {
  redisAvailable = true
})

// In-memory fallback when Redis is down — each entry: { messages, timestamp }
const _fallbackStore = new Map<string, { messages: StoredMessage[]; timestamp: number }>()

export type { StoredMessage }

export async function getHistory(conversationId: string): Promise<StoredMessage[]> {
  if (!conversationId) return []

  if (!redisAvailable) {
    const entry = _fallbackStore.get(conversationId)
    if (!entry) return []
    // Check TTL
    if (Date.now() - entry.timestamp > LIMITS.CONVERSATION_TTL_SECONDS * 1000) {
      _fallbackStore.delete(conversationId)
      return []
    }
    return entry.messages.slice(-LIMITS.MAX_HISTORY)
  }

  try {
    const raw = await aiRedis.get(conversationKey(conversationId))
    if (!raw) return []
    const store: ConversationStore = JSON.parse(raw)
    if (!Array.isArray(store.messages)) return []

    // Update last activity
    store.lastActivity = Date.now()
    await aiRedis.set(conversationKey(conversationId), JSON.stringify(store), 'EX', LIMITS.CONVERSATION_TTL_SECONDS)

    return store.messages.slice(-LIMITS.MAX_HISTORY)
  } catch {
    const entry = _fallbackStore.get(conversationId)
    return entry ? entry.messages.slice(-LIMITS.MAX_HISTORY) : []
  }
}

export async function saveHistory(conversationId: string, messages: StoredMessage[]): Promise<void> {
  if (!conversationId) return

  const trimmed = messages.slice(-LIMITS.MAX_HISTORY)

  if (!redisAvailable) {
    _fallbackStore.set(conversationId, { messages: trimmed, timestamp: Date.now() })
    return
  }

  try {
    const store: ConversationStore = {
      messages: trimmed,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: trimmed.length,
    }
    await aiRedis.set(conversationKey(conversationId), JSON.stringify(store), 'EX', LIMITS.CONVERSATION_TTL_SECONDS)
  } catch {
    _fallbackStore.set(conversationId, { messages: trimmed, timestamp: Date.now() })
  }
}

export async function clearHistory(conversationId: string): Promise<void> {
  if (!conversationId) return

  if (!redisAvailable) {
    _fallbackStore.delete(conversationId)
    return
  }

  try {
    await aiRedis.del(conversationKey(conversationId))
  } catch {
    _fallbackStore.delete(conversationId)
  }
}

export async function exportHistory(conversationId: string): Promise<StoredMessage[]> {
  return getHistory(conversationId)
}

// ─── Fallback TTL cleanup (runs every 5 min) ──────────────────────────────────
setInterval(() => {
  const now = Date.now()
  const ttlMs = LIMITS.CONVERSATION_TTL_SECONDS * 1000
  for (const [key, entry] of _fallbackStore) {
    if (now - entry.timestamp > ttlMs) {
      _fallbackStore.delete(key)
    }
  }
}, 300_000).unref()

// ─── Token Usage Tracking ────────────────────────────────────────────────────

const USAGE_KEY_PREFIX = 'sp:ai:usage:'

export async function trackTokenUsage(conversationId: string, promptTokens: number, completionTokens: number): Promise<void> {
  if (!redisAvailable || !conversationId) return
  try {
    const dayKey = `sp:ai:usage:daily:${new Date().toISOString().slice(0, 10)}`
    await aiRedis.hincrby(dayKey, 'prompt_tokens', promptTokens)
    await aiRedis.hincrby(dayKey, 'completion_tokens', completionTokens)
    await aiRedis.hincrby(dayKey, 'total_requests', 1)
    await aiRedis.expire(dayKey, 86400 * 7) // keep 7 days
  } catch {}
}

export async function getDailyUsage(): Promise<{ promptTokens: number; completionTokens: number; totalRequests: number }> {
  if (!redisAvailable) return { promptTokens: 0, completionTokens: 0, totalRequests: 0 }
  try {
    const dayKey = `sp:ai:usage:daily:${new Date().toISOString().slice(0, 10)}`
    const raw = await aiRedis.hgetall(dayKey)
    return {
      promptTokens: parseInt(raw.prompt_tokens || '0', 10),
      completionTokens: parseInt(raw.completion_tokens || '0', 10),
      totalRequests: parseInt(raw.total_requests || '0', 10),
    }
  } catch {
    return { promptTokens: 0, completionTokens: 0, totalRequests: 0 }
  }
}
