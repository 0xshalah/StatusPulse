/**
 * Response cache for AI queries.
 * Uses LRU eviction with TTL. Caches by message hash.
 */

import { CACHE } from './constants'
import { createHash } from 'crypto'

interface CacheEntry {
  response: string
  timestamp: number
  hits: number
}

class LRUCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private ttlMs: number

  constructor(maxSize = CACHE.MAX_ENTRIES, ttlMs = CACHE.TTL_MS) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex').slice(0, 16)
  }

  get(message: string): string | null {
    const key = this.hashKey(message.toLowerCase().trim())
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    entry.hits++
    return entry.response
  }

  set(message: string, response: string): void {
    const key = this.hashKey(message.toLowerCase().trim())

    if (this.cache.size >= this.maxSize) {
      // Evict oldest (LRU)
      let oldestKey = ''
      let oldestTime = Infinity
      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp
          oldestKey = k
        }
      }
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 1,
    })
  }

  stats(): { size: number; maxSize: number; hits: number } {
    let totalHits = 0
    for (const entry of this.cache.values()) {
      totalHits += entry.hits
    }
    return { size: this.cache.size, maxSize: this.maxSize, hits: totalHits }
  }

  clear(): void {
    this.cache.clear()
  }
}

export const queryCache = new LRUCache()

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of (queryCache as any).cache) {
    if (now - entry.timestamp > CACHE.TTL_MS * 2) {
      (queryCache as any).cache.delete(key)
    }
  }
}, 60_000).unref()
