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

// ─── localStorage Encryption (browser-only) ──────────────────────────────────
const ENCRYPT_KEY_NAME = 'sp-privacy-key'

async function getOrCreateEncryptionKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(ENCRYPT_KEY_NAME)
    if (stored) {
      const raw = Uint8Array.from(JSON.parse(stored))
      return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    }
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    const exported = await crypto.subtle.exportKey('raw', key)
    localStorage.setItem(ENCRYPT_KEY_NAME, JSON.stringify(Array.from(new Uint8Array(exported))))
    return key
  } catch { return null }
}

export async function encryptForStorage(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey()
    if (!key) return data
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(data)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv); combined.set(new Uint8Array(encrypted), iv.length)
    return btoa(String.fromCharCode(...combined))
  } catch { return data }
}

export async function decryptFromStorage(encrypted: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey()
    if (!key) return encrypted
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12); const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch { return encrypted }
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
