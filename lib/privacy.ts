/**
 * Privacy & Anonymity module for StatusPulse.
 * Centralized identity protection, data minimization, log redaction.
 */
import { createHash } from 'crypto'

// ─── IP Anonymization ───────────────────────────────────────────────────────
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'statuspulse-v1'

export function anonymizeIP(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  // One-way hash — cannot recover original IP
  return createHash('sha256')
    .update(`${ip}:${IP_HASH_SALT}`)
    .digest('hex')
    .slice(0, 12)
}

// ─── Session Data Minimization ──────────────────────────────────────────────
export function minimizeUserProfile(profile: any): { id: string; name: string } {
  return {
    id: profile?.id || profile?.sub || 'unknown',
    name: profile?.name?.split(' ')[0] || 'User', // first name only
  }
}

// ─── Log Redaction ──────────────────────────────────────────────────────────
export function redactLogData(data: Record<string, any>): Record<string, any> {
  const redacted = { ...data }

  // Strip user input from logs
  delete redacted.inputPreview
  delete redacted.message
  delete redacted.userMessage
  delete redacted.content

  // Hash any IP field
  if (redacted.ip) {
    redacted.ip = anonymizeIP(redacted.ip)
  }

  return redacted
}

// ─── Page Context Minimization ──────────────────────────────────────────────
export function minimizePageContext(ctx: {
  title?: string
  url?: string
  content?: string
}): { title?: string; url?: string; content?: string } {
  return {
    title: ctx.title?.slice(0, 100),
    url: ctx.url ? stripSensitiveURLParams(ctx.url) : undefined,
    content: ctx.content?.slice(0, 1000), // reduce from 6000 to 1000 chars
  }
}

function stripSensitiveURLParams(url: string): string {
  try {
    const u = new URL(url)
    // Strip tokens, keys, secrets from URL
    const sensitiveParams = ['token', 'key', 'secret', 'api_key', 'auth', 'password', 'code']
    for (const param of sensitiveParams) {
      if (u.searchParams.has(param)) {
        u.searchParams.set(param, '[REDACTED]')
      }
    }
    return u.toString()
  } catch {
    return url
  }
}

// ─── Privacy Config ─────────────────────────────────────────────────────────
export const PRIVACY_CONFIG = {
  ipAnonymization: true,
  pageContextMaxChars: 1000, // reduced from 6000
  conversationAutoDeleteHours: 24,
  pingRetentionDays: 90,
  logRetentionDays: 30,
  embedConsentRequired: true,
}

// ─── Consent Banner ─────────────────────────────────────────────────────────
export function getEmbedConsentHTML(): string {
  return `
    <div id="sp-privacy-notice" style="position:fixed;bottom:0;left:0;right:0;z-index:2147483646;
      background:#1B102D;color:#fff;padding:12px 20px;font-size:12px;font-family:Inter,sans-serif;
      display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgba(255,255,255,.1)">
      <span>This chat widget shares page context with an AI assistant for better answers.
      <a href="https://statuspulse.edgeone.dev/privacy" target="_blank" style="color:#e1567c;text-decoration:underline">Learn more</a></span>
      <span style="display:flex;gap:8px">
        <button id="sp-privacy-accept" style="background:#e1567c;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:11px">Accept</button>
        <button id="sp-privacy-decline" style="background:rgba(255,255,255,.08);color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:11px">Decline</button>
      </span>
    </div>
  `.replace(/\s+/g, ' ').trim()
}
