/**
 * Centralized project configuration.
 * ALL values that change per environment or deployment live here.
 * No scattered hardcoded values across the codebase.
 */
export const CONFIG = {
  // ─── URLs ────────────────────────────────────────────────────────────────
  baseUrl: process.env.NEXT_PUBLIC_URL || 'https://statuspulse.edgeone.dev',
  corsOrigin: process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_URL || '',

  // ─── AI Provider ─────────────────────────────────────────────────────────
  ai: {
    baseUrl: process.env.AI_GATEWAY_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.AI_GATEWAY_MODEL || 'deepseek-v4-pro',
    fallbackModel: 'deepseek-chat',
    tavilyUrl: 'https://api.tavily.com/search',
    maxTokens: 8192,
    maxInputLength: 4000,
    streamTimeoutMs: 90_000,
  },

  // ─── Retention / TTL ─────────────────────────────────────────────────────
  retention: {
    conversationTtlSeconds: 1800,  // 30 min
    pingRetentionDays: 90,
    logRetentionDays: 30,
    tokenUsageRetentionDays: 7,
  },

  // ─── Rate Limiting ───────────────────────────────────────────────────────
  rateLimit: {
    aiRequestsPerMinute: 20,
    aiRequestsPerHour: 200,
    generalRequestsPerMinute: 60,
    generalWindowMs: 60_000,
  },

  // ─── Retry & Resilience ──────────────────────────────────────────────────
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10_000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    cooldownMs: 30_000,
    halfOpenMax: 2,
  },

  // ─── Ping Engine ─────────────────────────────────────────────────────────
  ping: {
    retryBackoff: [0, 1000, 3000],
    maxAttempts: 3,
    timeoutMs: 8000,
    degradedThresholdMs: 2000,
    defaultExpectedStatus: 200,
    defaultIntervalSeconds: 60,
    maxFetchLimit: 200,
    incidentCountLimit: 30,
  },

  // ─── Privacy ─────────────────────────────────────────────────────────────
  privacy: {
    pageContextMaxChars: 1000,
    titleMaxChars: 100,
    conversationAutoDeleteHours: 24,
    embedConsentRequired: true,
  },

  // ─── UI Text ─────────────────────────────────────────────────────────────
  ui: {
    brandName: 'StatusPulse AI',
    widgetPlaceholder: 'Ask about your APIs...',
    widgetPlaceholderCompact: 'Ask...',
    inputFooter: 'Enter to send · Shift+Enter for newline',
    defaultWelcome: "I'm your API monitoring assistant. Ask me about endpoint status, uptime, response times, or any incidents.",
    compactWelcome: 'Ask about your APIs.',
    localStoragePrefix: 'sp-ai-msgs-',
    conversationIdKey: 'sp-ai-cid',
    maxLocalStorageMessages: 50,
  },

  // ─── Breakpoints ─────────────────────────────────────────────────────────
  breakpoints: {
    compact: 399,
    thin: 359,
    mobile: 480,
  },
}
