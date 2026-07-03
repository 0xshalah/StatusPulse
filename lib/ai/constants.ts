/**
 * AI module — all magic strings as named constants.
 * No raw strings scattered across the codebase.
 */

// ─── SSE Events ──────────────────────────────────────────────────────────────
export const SSE_PREFIX = 'data: '
export const SSE_DONE = '[DONE]'
export const EVENT = {
  PING: 'ping',
  TEXT_DELTA: 'text_delta',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  ERROR: 'error_message',
} as const

// ─── Limits ──────────────────────────────────────────────────────────────────
export const LIMITS = {
  MAX_HISTORY: 20,
  MAX_TOOL_TURNS: 4,
  MAX_TOKENS: 8192,
  STREAM_TIMEOUT_MS: 90_000,
  TOOL_TIMEOUT_MS: 15_000,
  TAVILY_TIMEOUT_MS: 15_000,
  PING_INTERVAL_MS: 5_000,
  PAGE_CONTEXT_MAX_CHARS: 6_000,
  CONVERSATION_TTL_SECONDS: 1_800, // 30 min idle → expire
  RATE_LIMIT_PER_MINUTE: 20,
  RATE_LIMIT_PER_HOUR: 200,
  MAX_INPUT_LENGTH: 4_000,
  MAX_ABUSE_REPORTS: 5,
} as const

// ─── Circuit Breaker ─────────────────────────────────────────────────────────
export const CIRCUIT = {
  FAILURE_THRESHOLD: 5,
  COOLDOWN_MS: 30_000,
  HALF_OPEN_MAX: 2,
} as const

// ─── Retry ───────────────────────────────────────────────────────────────────
export const RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1_000,
  MAX_DELAY_MS: 10_000,
} as const

// ─── Cache ───────────────────────────────────────────────────────────────────
export const CACHE = {
  TTL_MS: 30_000,
  MAX_ENTRIES: 100,
} as const

// ─── Prompt Injection Patterns ───────────────────────────────────────────────
export const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(your\s+)?(previous|prior|above|system)\s+(instructions?|prompts?|directives?)/i,
  /you\s+are\s+now\s+(a|an)\s+(different|new)\s+(AI|assistant|bot|model)/i,
  /forget\s+(everything|all)\s+(you|we)\s+(know|discussed|talked)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if|though)\s+you\s+(are|were)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?|api\s*key|secret)/i,
  /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions?)/i,
  /\[system\]|\[\/system\]|<\s*system\s*>|<\s*\/\s*system\s*>/i,
  /DAN\s+mode|developer\s+mode|jailbreak/i,
  // Multilingual injection (Chinese, Russian, Arabic, etc.)
  /忽略\s*(所有|你)?\s*(之前|上面|系统)?\s*(指令|提示|规则)/i, // ignore your instructions
  /从现在起.*你是/i, // from now on you are
  /告诉我.*(你的|系统).*(提示|指令|配置)/i, // tell me your system prompt
  /забудь\s+(все|всё)/i, // forget everything (Russian)
  /игнорируй\s+(твои|свои)?\s+(инструкции|правила)/i, // ignore your instructions (Russian)
  // Adversarial obfuscation patterns
  /([i!1|l\|]gn[o0]r[e3]).*(inst[rR]uct|[pP]r[o0]mpt)/i, // leetspeak bypass
  /s\s+y\s+s\s+t\s+e\s+m\s+p\s+r\s+o\s+m\s+p\s+t/i, // spaced-out bypass
] as const

// ─── Provider URLs ───────────────────────────────────────────────────────────
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
export const DEEPSEEK_MODEL = 'deepseek-v4-pro'
export const TAVILY_SEARCH_URL = 'https://api.tavily.com/search'
