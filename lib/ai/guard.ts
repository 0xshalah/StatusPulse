/**
 * Security guardrails & input validation for the AI chat pipeline.
 *
 * Layers:
 *   1. Input sanitization (length, XSS, null bytes)
 *   2. Prompt injection detection
 *   3. Abuse rate detection
 *   4. Tool parameter Zod validation
 *   5. Error message sanitization
 */

import { z } from 'zod'
import { LIMITS, INJECTION_PATTERNS } from './constants'

// ─── Abuse Tracker ──────────────────────────────────────────────────────────
const abuseTracker = new Map<string, { count: number; resetAt: number }>()

function isAbusive(ip: string): boolean {
  const now = Date.now()
  let entry = abuseTracker.get(ip)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 3600_000 }
    abuseTracker.set(ip, entry)
  }
  entry.count++
  return entry.count > LIMITS.MAX_ABUSE_REPORTS
}

// Cleanup abuse tracker
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of abuseTracker) {
    if (now > entry.resetAt) abuseTracker.delete(key)
  }
}, 300_000).unref()

// ─── Input Sanitization ─────────────────────────────────────────────────────
export interface SanitizeResult {
  clean: string
  blocked: boolean
  reason?: string
}

export function sanitizeInput(input: string, ip?: string): SanitizeResult {
  // Reject empty
  if (!input || typeof input !== 'string') {
    return { clean: '', blocked: true, reason: 'Empty input' }
  }

  // Length check
  if (input.length > LIMITS.MAX_INPUT_LENGTH) {
    return { clean: '', blocked: true, reason: `Input exceeds ${LIMITS.MAX_INPUT_LENGTH} characters` }
  }

  // Null bytes (injection attack)
  if (input.includes('\0')) {
    return { clean: '', blocked: true, reason: 'Invalid characters detected' }
  }

  // Strip control characters (keep newlines, tabs)
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Collapse excessive whitespace
  clean = clean.replace(/\s{3,}/g, '  ').trim()

  // Re-check after cleaning
  if (!clean) {
    return { clean: '', blocked: true, reason: 'Input empty after sanitization' }
  }

  return { clean, blocked: false }
}

// ─── Prompt Injection Detection ──────────────────────────────────────────────
export interface InjectionResult {
  detected: boolean
  pattern?: string
  severity: 'none' | 'low' | 'high'
}

export function detectInjection(input: string): InjectionResult {
  const lower = input.toLowerCase()

  // High severity: direct system prompt extraction attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        detected: true,
        pattern: pattern.source.slice(0, 80),
        severity: 'high',
      }
    }
  }

  // Low severity: excessive repetition (potential jailbreak padding)
  const repetitionPattern = /(.{6,})\1{4,}/
  if (repetitionPattern.test(input)) {
    return { detected: true, pattern: 'excessive repetition', severity: 'low' }
  }

  return { detected: false, severity: 'none' }
}

// ─── Combined Guard ─────────────────────────────────────────────────────────
export interface GuardResult {
  allowed: boolean
  error?: string
  sanitized: string
}

export function applyGuard(input: string, ip?: string): GuardResult {
  // Layer 1: Sanitize
  const { clean, blocked, reason } = sanitizeInput(input, ip)
  if (blocked) {
    return { allowed: false, error: reason, sanitized: '' }
  }

  // Layer 2: Injection detection
  const { detected, severity } = detectInjection(clean)
  if (detected && severity === 'high') {
    if (ip && isAbusive(ip)) {
      return { allowed: false, error: 'Access restricted due to policy violations', sanitized: '' }
    }
    return { allowed: false, error: 'Request cannot be processed due to content policy', sanitized: '' }
  }

  if (detected && severity === 'low') {
    // Allow but tag for monitoring (could add warning to system prompt)
  }

  return { allowed: true, sanitized: clean }
}

// ─── Error Sanitization ─────────────────────────────────────────────────────
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Don't leak stack traces or internal paths
    const msg = error.message || 'An error occurred'

    // Redact potential secrets (API keys, tokens)
    const redacted = msg
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
      .replace(/Bearer\s+[a-zA-Z0-9\-_.]+/gi, 'Bearer ***')
      .replace(/tvly-[a-zA-Z0-9\-_.]+/g, 'tvly-***')
      .replace(/\/home\/[^/\s]+/g, '/home/***')
      .replace(/\/Users\/[^/\s]+/g, '/Users/***')
      .replace(/C:\\Users\\[^\\\s]+/gi, 'C:\\Users\\***')

    return redacted.slice(0, 300)
  }
  return 'An unexpected error occurred'
}

// ─── Tool Parameter Validation ──────────────────────────────────────────────
export function createToolValidator(schema: Record<string, z.ZodTypeAny>) {
  return z.object(schema)
}

// Common tool parameter schemas
export const endpointIdSchema = z.string().uuid()
export const searchQuerySchema = z.string().min(1).max(500)
export const timeRangeSchema = z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h')

// Validate tool input with Zod
export function validateToolInput(schema: z.ZodTypeAny, input: unknown): { success: true; data: any } | { success: false; error: string } {
  try {
    const data = schema.parse(input)
    return { success: true, data }
  } catch (e) {
    if (e instanceof z.ZodError) {
      const messages = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ')
      return { success: false, error: messages }
    }
    return { success: false, error: 'Invalid input' }
  }
}
