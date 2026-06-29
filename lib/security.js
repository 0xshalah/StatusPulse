// In-memory rate limiter with automatic cleanup
const buckets = new Map()
const CLEAN_INTERVAL = 60000

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now - bucket.resetAt > 60000) buckets.delete(key)
  }
}, CLEAN_INTERVAL).unref()

export function rateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now()
  const key = ip || 'unknown'
  let bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    bucket = { tokens: limit, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.tokens--
  const remaining = Math.max(0, bucket.tokens)
  const reset = Math.ceil((bucket.resetAt - now) / 1000)

  return {
    allowed: bucket.tokens >= 0,
    remaining,
    reset,
    limit,
    retryAfter: bucket.tokens < 0 ? reset : 0,
  }
}

export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

// Strip HTML tags and trim
export function sanitize(str) {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim()
}

// Validate URL format
export function isValidUrl(str) {
  if (!str) return false
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// Safe error response — never leak raw errors
export function safeError(err) {
  const isDev = process.env.NODE_ENV === 'development'
  return {
    error: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && { stack: err.stack }),
  }
}
