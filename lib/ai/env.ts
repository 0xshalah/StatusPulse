/**
 * Multi-layer API Key Resolver with Rotation Support.
 *
 * Strategy (2025 industry best practice):
 *   1. Platform secrets manager (EdgeOne dashboard) — encrypted at rest
 *   2. Fallback key for zero-downtime rotation
 *   3. Dev keys for local development (.env file, gitignored)
 *   4. Auto-switch on authentication failure (401/403)
 *   5. Hashed audit fingerprint — never log raw keys
 *   6. Health check endpoint for key status
 */

import { createHash } from 'crypto'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ai-env')

// ─── Types ───────────────────────────────────────────────────────────────────
export interface KeySource {
  value: string
  source: 'platform_primary' | 'platform_fallback' | 'dev_file' | 'none'
  fingerprint: string // SHA-256 hash for audit (not the key itself)
  rotated: boolean
}

interface RotationState {
  primaryFailures: number
  fallbackActive: boolean
  lastRotation: number
}

const rotation: RotationState = {
  primaryFailures: 0,
  fallbackActive: false,
  lastRotation: 0,
}

const MAX_FAILURES_BEFORE_ROTATION = 3
const ROTATION_COOLDOWN_MS = 300_000 // 5 min before switching back

// ─── Runtime detection ──────────────────────────────────────────────────────
function isEdgeOne(): boolean {
  return !!(process.env.EDGEONE === 'true' || process.env.EDGEONE_DEPLOY === 'true')
}

// ─── Key fingerprint (for audit, not the key itself) ────────────────────────
function fingerprint(key: string): string {
  if (!key || key.length < 10) return 'empty'
  return createHash('sha256').update(key.slice(0, 8) + '***' + key.slice(-4)).digest('hex').slice(0, 8)
}

// ─── DeepSeek API Key — Multi-source with rotation ──────────────────────────
export function resolveApiKey(): KeySource {
  // Priority 1: EdgeOne dashboard (encrypted, recommended for production)
  const platformKey = process.env.AI_GATEWAY_API_KEY
  if (platformKey && platformKey.length > 10) {
    return {
      value: platformKey,
      source: 'platform_primary',
      fingerprint: fingerprint(platformKey),
      rotated: false,
    }
  }

  // Priority 2: Fallback key for rotation (set during key rotation window)
  const fallbackKey = process.env.AI_GATEWAY_API_KEY_FALLBACK
  if (fallbackKey && fallbackKey.length > 10) {
    rotation.fallbackActive = true
    return {
      value: fallbackKey,
      source: 'platform_fallback',
      fingerprint: fingerprint(fallbackKey),
      rotated: true,
    }
  }

  // Priority 3: Dev key for local development (.env file, gitignored)
  const devKey = process.env.DEEPSEEK_DEV_KEY
  if (devKey && devKey.length > 10 && !isEdgeOne()) {
    return {
      value: devKey,
      source: 'dev_file',
      fingerprint: fingerprint(devKey),
      rotated: false,
    }
  }

  logger.error({ event: 'key_missing', source: 'all', platform: isEdgeOne() ? 'EdgeOne' : 'local' })
  return { value: '', source: 'none', fingerprint: 'empty', rotated: false }
}

// ─── Tavily API Key — Multi-source with rotation ────────────────────────────
export function resolveTavilyKey(): KeySource {
  const platformKey = process.env.TAVILY_API_KEY
  if (platformKey && platformKey.length > 10) {
    return { value: platformKey, source: 'platform_primary', fingerprint: fingerprint(platformKey), rotated: false }
  }

  const fallbackKey = process.env.TAVILY_API_KEY_FALLBACK
  if (fallbackKey && fallbackKey.length > 10) {
    return { value: fallbackKey, source: 'platform_fallback', fingerprint: fingerprint(fallbackKey), rotated: true }
  }

  const devKey = process.env.TAVILY_DEV_KEY
  if (devKey && devKey.length > 10 && !isEdgeOne()) {
    return { value: devKey, source: 'dev_file', fingerprint: fingerprint(devKey), rotated: false }
  }

  return { value: '', source: 'none', fingerprint: 'empty', rotated: false }
}

// ─── Rotation: auto-switch on auth failure ──────────────────────────────────
export function handleAuthFailure(service: 'deepseek' | 'tavily'): void {
  rotation.primaryFailures++
  const now = Date.now()

  logger.warn({
    event: 'auth_failure',
    service,
    failures: rotation.primaryFailures,
    fallbackActive: rotation.fallbackActive,
  })

  // Auto-rotate after threshold failures
  if (rotation.primaryFailures >= MAX_FAILURES_BEFORE_ROTATION && !rotation.fallbackActive) {
    rotation.fallbackActive = true
    rotation.lastRotation = now
    logger.warn({ event: 'key_rotation_triggered', service, reason: `${rotation.primaryFailures} consecutive failures` })
  }
}

export function handleAuthSuccess(_service: 'deepseek' | 'tavily'): void {
  rotation.primaryFailures = 0

  // Switch back to primary after cooldown
  if (rotation.fallbackActive && Date.now() - rotation.lastRotation > ROTATION_COOLDOWN_MS) {
    rotation.fallbackActive = false
    logger.info({ event: 'key_rotation_restored', reason: 'cooldown elapsed, primary key restored' })
  }
}

// ─── Get current key with rotation awareness ────────────────────────────────
export function getActiveApiKey(): KeySource {
  const primary = resolveApiKey()
  if (!rotation.fallbackActive) return primary

  // Fallback is active — use fallback key
  const fallbackKey = process.env.AI_GATEWAY_API_KEY_FALLBACK
  if (fallbackKey && fallbackKey.length > 10) {
    return { value: fallbackKey, source: 'platform_fallback', fingerprint: fingerprint(fallbackKey), rotated: true }
  }
  return primary
}

export function getActiveTavilyKey(): KeySource {
  const primary = resolveTavilyKey()
  if (!rotation.fallbackActive && primary.value) return primary

  const fallbackKey = process.env.TAVILY_API_KEY_FALLBACK
  if (fallbackKey && fallbackKey.length > 10) {
    return { value: fallbackKey, source: 'platform_fallback', fingerprint: fingerprint(fallbackKey), rotated: true }
  }
  return primary
}

// ─── Rotation health ────────────────────────────────────────────────────────
export function getRotationStatus() {
  return {
    deepseek: {
      active: getActiveApiKey().source,
      fingerprint: getActiveApiKey().fingerprint,
      fallbackActive: rotation.fallbackActive,
      failures: rotation.primaryFailures,
    },
    tavily: {
      active: getActiveTavilyKey().source,
      fingerprint: getActiveTavilyKey().fingerprint,
    },
    lastRotation: rotation.lastRotation ? new Date(rotation.lastRotation).toISOString() : null,
  }
}

// ─── Runtime info ────────────────────────────────────────────────────────────
export function getRuntimeInfo() {
  return {
    platform: isEdgeOne() ? 'EdgeOne' : 'Local',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    keySource: getActiveApiKey().source,
  }
}
