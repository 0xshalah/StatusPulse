'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  toolCalls?: { name: string; done?: boolean }[]
}

interface SiteConfig {
  name: string
  welcome: string
  suggestedQuestions: string[]
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MarkdownBlock({ content }: { content: string }) {
  const html = marked.parse(content) as string
  return <div className="prose-chat" dangerouslySetInnerHTML={{ __html: html }} />
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/5 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
      aria-label="Copy message"
      title="Copy"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>
      )}
    </button>
  )
}

function ToolBadge({ name, done }: { name: string; done?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border ${
      done ? 'text-lime bg-lime/10 border-lime/20' : 'text-primary bg-primary/10 border-primary/20'
    }`}>
      {done ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
      ) : (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z" fill="currentColor"/></svg>
      )}
      {done ? `Queried ${name}` : `Querying ${name}`}
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1" role="status" aria-label="AI is thinking">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ChatPanel({ mode = 'full' }: { mode?: 'full' | 'widget' }) {
  const [config, setConfig] = useState<SiteConfig>({ name: 'StatusPulse AI', welcome: '', suggestedQuestions: [] })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load config
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(c => setConfig({
        name: c.name || 'StatusPulse AI',
        welcome: c.welcome || '',
        suggestedQuestions: c.suggestedQuestions || [],
      }))
      .catch(() => setError('Failed to load AI config. Please refresh.'))
  }, [])

  const [conversationId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const key = 'sp-ai-cid'
    let cid = localStorage.getItem(key)
    if (!cid) {
      cid = crypto.randomUUID()
      localStorage.setItem(key, cid)
    }
    return cid
  })

  // Persist messages to localStorage
  const STORAGE_KEY = `sp-ai-msgs-${conversationId}`

  useEffect(() => {
    if (typeof window === 'undefined' || !conversationId) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.slice(0, 50))
        }
      }
    } catch {}
  }, [conversationId])

  useEffect(() => {
    if (typeof window === 'undefined' || !conversationId || messages.length === 0) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)))
    } catch {}
  }, [messages, conversationId, STORAGE_KEY])

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const composingRef = useRef(false)
  const pageContextRef = useRef<{ title?: string; url?: string; content?: string } | null>(null)

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === '__aa_page_context' && e.data.payload) {
        pageContextRef.current = e.data.payload
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  useEffect(scrollToBottom, [messages, scrollToBottom])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isStreaming) return
    setInput('')
    setIsStreaming(true)
    setError(null)

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg }
    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    let reconnectAttempts = 0

    async function tryFetch() {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'makers-conversation-id': conversationId,
          },
          body: JSON.stringify({
            message: msg,
            ...(pageContextRef.current ? { pageContext: pageContextRef.current } : {}),
          }),
          signal: controller.signal,
        })

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          setError(`Rate limited. Retry in ${data.retryAfter || 60}s.`)
          setIsStreaming(false)
          return
        }

        if (!res.ok) {
          throw new Error(`Server error (${res.status})`)
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (reader) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break
            try {
              const event = JSON.parse(payload)
              if (event.type === 'text_delta' && event.delta) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.delta } : m,
                  ),
                )
              } else if (event.type === 'tool_call' && event.tool) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls || []), { name: event.tool }] }
                      : m,
                  ),
                )
              } else if (event.type === 'tool_result' && event.tool) {
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== assistantId || !m.toolCalls) return m
                    const updated = m.toolCalls.map((tc) =>
                      tc.name === event.tool && !tc.done ? { ...tc, done: true } : tc,
                    )
                    return { ...m, toolCalls: updated }
                  }),
                )
              } else if (event.type === 'error_message') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content || `⚠️ ${event.content}` }
                      : m,
                  ),
                )
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return

        if (reconnectAttempts < 2) {
          reconnectAttempts++
          await new Promise(r => setTimeout(r, 1500 * reconnectAttempts))
          return tryFetch()
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, role: 'error' as const, content: m.content || '⚠️ Connection failed after 3 attempts. Please try again.' }
              : m,
          ),
        )
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    }

    tryFetch()
  }, [input, isStreaming, conversationId])

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
    fetch('/api/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId }),
    }).catch(() => {})
  }, [conversationId])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sp-ai-cid')
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [STORAGE_KEY])

  const isWidget = mode === 'widget'

  return (
    <div className={`flex flex-col ${isWidget ? 'h-full bg-[#1B102D]' : 'h-screen bg-[#1B102D]'} font-sans`} role="application" aria-label="StatusPulse AI Chat">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-rose-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/90">{config.name}</span>
          <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-medium text-lime">BETA</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/20">DeepSeek V4</span>
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition" title="Clear chat" aria-label="Clear chat history">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M0.667 13.982H13.334V4.316H9V0.496H5V4.316H0.667V13.982ZM2 12.649V8.982H12V12.649H5V10.316H3.667V12.649H2ZM12 7.649H2V5.649H6.333V1.829H7.667V5.649H12V7.649Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" fillOpacity="0.7"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300" aria-label="Dismiss error">&times;</button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-rose-400 shadow-lg shadow-primary/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">{config.name}</h3>
            <p className="text-xs text-white/40 mb-5 max-w-[300px] leading-relaxed">
              {config.welcome || "I'm your API monitoring assistant. Ask me about endpoint status, uptime, response times, or any incidents."}
            </p>

            {config.suggestedQuestions.length > 0 && (
              <div className="w-full space-y-2">
                {config.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 hover:border-primary/30 hover:bg-primary/5 transition text-left group"
                  >
                    <span className="text-sm text-white/70 group-hover:text-white/90 line-clamp-1">{q}</span>
                    <svg className="w-4 h-4 text-white/20 group-hover:text-primary/60 flex-shrink-0 ml-2" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.53 12L8.32 6.23l1.36-1.47 7 6.5.79.74-.79.73-7 6.5-1.36-1.47L14.53 12z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4" role="log" aria-label="Chat messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`} role="article">
              {msg.role !== 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/>
                  </svg>
                </div>
              )}
              <div className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-rose-400 text-white rounded-tr-sm'
                  : msg.role === 'error'
                    ? 'bg-red-500/10 border border-red-500/20 rounded-tl-sm'
                    : 'bg-white/6 rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : msg.content ? (
                  <div className="relative">
                    <div className="absolute top-0 right-0 -mt-1">
                      <CopyButton text={msg.content} />
                    </div>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-2 space-y-1 mr-8" role="status" aria-label="Tool calls in progress">
                        {msg.toolCalls.map((tc, i) => (
                          <ToolBadge key={i} name={tc.name} done={tc.done} />
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-white/80">
                      <MarkdownBlock content={msg.content} />
                    </div>
                    {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 align-middle rounded-sm bg-primary opacity-60 animate-pulse" aria-hidden="true" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white/30 text-xs py-1">
                    {msg.toolCalls && msg.toolCalls.length > 0 ? (
                      <div className="space-y-1" role="status" aria-label="Tool calls in progress">
                        {msg.toolCalls.map((tc, i) => (
                          <ToolBadge key={i} name={tc.name} done={tc.done} />
                        ))}
                      </div>
                    ) : (
                      <LoadingDots />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-resize
              const el = e.target
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={() => { composingRef.current = false }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask about your APIs..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition placeholder:text-white/25 disabled:opacity-50"
            style={{ minHeight: '40px' }}
            aria-label="Chat message input"
          />
          {isStreaming ? (
            <button onClick={stopStream} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex-shrink-0" aria-label="Stop AI response" title="Stop">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
            </button>
          ) : (
            <button onClick={() => sendMessage()} disabled={!input.trim()} className="p-2 rounded-lg bg-gradient-to-r from-primary to-rose-400 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 transition flex-shrink-0" aria-label="Send message" title="Send">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M0.99 7.67c-.48-.16-.49-.42.01-.59L18.71 1.17c.49-.16.77.08.63.57L14.28 19.5c-.14.49-.42.5-.63.04L10.32 12.02l5.57-7.43-7.42 5.57L0.99 7.67z" fill="currentColor"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[9px] text-white/15">Enter to send · Shift+Enter for newline</span>
          <span className="text-[9px] text-white/15">{messages.length} messages</span>
        </div>
      </div>
    </div>
  )
}
