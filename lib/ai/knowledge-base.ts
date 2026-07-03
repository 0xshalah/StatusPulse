/**
 * Knowledge Base — simple TF-IDF search engine for runbook documents.
 * In-memory store with keyword matching. Files stored in public/kb/.
 */

import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { createLogger } from '@/lib/logger'

const logger = createLogger('kb')

// ─── Types ───────────────────────────────────────────────────────────────────
interface KBDocument {
  id: string
  title: string
  content: string
  source: string
  addedAt: number
}

interface SearchResult {
  title: string
  source: string
  snippet: string
  score: number
}

// ─── Storage ─────────────────────────────────────────────────────────────────
const store = new Map<string, KBDocument>()
let initialized = false

// Seed with internal knowledge
function seedKnowledge() {
  if (initialized) return
  initialized = true

  const docs: KBDocument[] = [
    {
      id: 'kb-001',
      title: 'Stripe Webhook Signature Migration Guide',
      content: 'When Stripe deprecates old webhook signature formats, you must update your verification code. Use stripe.webhooks.constructEvent() with the new secret. Deploy the updated signature verification before the Stripe migration deadline. Common error: 401 Unauthorized on webhook endpoints after API version upgrade.',
      source: 'Confluence — Payments Team',
      addedAt: Date.now(),
    },
    {
      id: 'kb-002',
      title: 'DNS Resolution Failure Troubleshooting',
      content: 'DNS failures manifest as all requests returning status 0 with no response body. Check your DNS provider status page (Cloudflare, Route53, etc.). Verify domain registration has not expired. Test with dig or nslookup from the server. Common cause: expired domain, misconfigured A records, DNS provider outage.',
      source: 'Runbook — Infrastructure',
      addedAt: Date.now(),
    },
    {
      id: 'kb-003',
      title: 'Database Connection Pool Exhaustion',
      content: 'When MongoDB connection pool is exhausted, APIs return 503 Service Unavailable or timeout. Symptoms: response time spikes from 100ms to 5000ms+, then total failure. Fix: increase pool size, add connection retry logic, check for connection leaks. Monitor with db.serverStatus().connections.',
      source: 'Postmortem — January 2026 Outage',
      addedAt: Date.now(),
    },
    {
      id: 'kb-004',
      title: 'Rate Limiting Best Practices',
      content: 'Rate limiting prevents API abuse and cascading failures. Implement token bucket algorithm with configurable limits. Use Redis for distributed rate limiting. Return 429 with Retry-After header. Common mistake: setting limits too low for internal services, causing false positives during deployment.',
      source: 'Architecture Guide — API Gateway',
      addedAt: Date.now(),
    },
    {
      id: 'kb-005',
      title: 'SSL Certificate Expiry Emergency Fix',
      content: 'Expired SSL/TLS certificates cause all HTTPS requests to fail with connection errors. Check expiry with openssl s_client -connect domain:443. Renew via certbot or your CA dashboard. Most providers offer auto-renew. Set up monitoring alerts 30 days before expiry. Emergency: switch to HTTP temporarily (internal only).',
      source: 'Runbook — Security',
      addedAt: Date.now(),
    },
    {
      id: 'kb-006',
      title: 'Memory Leak Detection and Recovery',
      content: 'Memory leaks cause gradual response time degradation followed by OOM crashes. Monitor heap usage in Node.js with process.memoryUsage(). Check for unclosed connections, event listener leaks, and large object retention. Fix: close connections in finally blocks, use WeakRef for caches, implement circuit breakers.',
      source: 'Postmortem — March 2026 Latency Incident',
      addedAt: Date.now(),
    },
    {
      id: 'kb-007',
      title: 'CI/CD Rollback Procedure',
      content: 'If a deployment causes incidents, rollback immediately. Use git revert or deploy previous version tag. For Docker: docker-compose down && docker-compose up with previous image. For edge deployments: use platform rollback button. Always verify rollback with health check. Post-incident: write postmortem within 24 hours.',
      source: 'DevOps Playbook',
      addedAt: Date.now(),
    },
  ]

  for (const doc of docs) {
    store.set(doc.id, doc)
  }
  logger.info({ event: 'kb_seeded', documentCount: docs.length })
}

try {
  // Try to load additional documents from public/kb/
  async function loadKBFiles() {
    // In production, this would load from a database or file system
  }
} catch {}

seedKnowledge()

// ─── Search ──────────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }
  return tf
}

export function search(query: string, limit = 5): SearchResult[] {
  const queryTokens = tokenize(query)
  const queryTF = computeTF(queryTokens)
  const results: SearchResult[] = []

  for (const doc of store.values()) {
    const docTokens = tokenize(doc.content)
    const docTF = computeTF(docTokens)

    // Simple TF-IDF-like scoring
    let score = 0
    for (const [token, qtf] of queryTF) {
      const dtf = docTF.get(token) || 0
      if (dtf > 0) {
        score += qtf * dtf
      }
    }

    if (score > 0) {
      // Generate snippet
      const lowerContent = doc.content.toLowerCase()
      const snippet = findBestSnippet(lowerContent, doc.content, queryTokens)

      results.push({
        title: doc.title,
        source: doc.source,
        snippet,
        score,
      })
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function findBestSnippet(lowerContent: string, original: string, queryTokens: string[]): string {
  const windowSize = 200
  let bestStart = 0
  let bestScore = 0

  for (let i = 0; i < lowerContent.length - windowSize; i += 50) {
    const window = lowerContent.slice(i, i + windowSize)
    let score = 0
    for (const token of queryTokens) {
      if (window.includes(token)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestStart = i
    }
  }

  const start = Math.max(0, bestStart - 20)
  const end = Math.min(original.length, bestStart + windowSize + 20)
  return (start > 0 ? '...' : '') + original.slice(start, end) + (end < original.length ? '...' : '')
}

// ─── Management ──────────────────────────────────────────────────────────────
export function addDocument(id: string, title: string, content: string, source: string): void {
  store.set(id, { id, title, content, source, addedAt: Date.now() })
  logger.info({ event: 'kb_document_added', id, title })
}

export function getDocumentCount(): number {
  return store.size
}
