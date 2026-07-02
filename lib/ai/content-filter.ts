/**
 * Content safety filter for Tavily web search results.
 * Strips NSFW content, malicious URLs, and phishing domains.
 */

// ─── Known malicious/phishing TLDs and patterns ──────────────────────────────
const BLOCKED_DOMAINS = [
  'bit.ly', 'tinyurl.com', 'short.link', 'cutt.ly', 'ow.ly',
  'rebrand.ly', 't.co', 'is.gd', 'buff.ly', 'shorte.st',
]

const BLOCKED_PATTERNS = [
  /porn/i, /xxx/i, /adult/i, /nsfw/i,
  /casino/i, /gambling/i, /betting/i,
  /phish/i, /malware/i, /spyware/i,
  /crack/i, /warez/i, /torrent/i,
  /dark\s*web/i, /illegal/i,
]

const BLOCKED_KEYWORDS = [
  'porn', 'xxx', 'nsfw', 'adult content', 'escort',
  'casino', 'gambling', 'sports betting',
  'malware download', 'cracked software', 'key generator',
  'credit card hack', 'password cracker',
  'dark web market',
]

// ─── Filter functions ────────────────────────────────────────────────────────
interface SafeResult {
  passed: boolean
  reason?: string
}

function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

function containsBlockedContent(text: string): boolean {
  const lower = text.toLowerCase()
  return BLOCKED_PATTERNS.some(p => p.test(lower))
    || BLOCKED_KEYWORDS.some(k => lower.includes(k))
}

export function filterSearchResult(result: {
  title?: string
  url?: string
  content?: string
}): SafeResult {
  if (!result.url && !result.title) return { passed: true }

  const fullText = [result.title, result.content, result.url]
    .filter(Boolean)
    .join(' ')

  if (isBlockedDomain(result.url || '')) {
    return { passed: false, reason: `Blocked domain: ${result.url}` }
  }

  if (containsBlockedContent(fullText)) {
    return { passed: false, reason: 'Content policy violation' }
  }

  return { passed: true }
}

export function filterSearchResults(results: Array<{
  title?: string
  url?: string
  content?: string
}>): Array<{ title?: string; url?: string; content?: string }> {
  return results.filter(r => filterSearchResult(r).passed)
}
