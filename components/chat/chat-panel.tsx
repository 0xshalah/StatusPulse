'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

// ─── Animation variants ─────────────────────────────────────────────────────
const msgVariants = {
  initial: (role: string) => ({
    opacity: 0, y: 16,
    x: role === 'user' ? 20 : -20,
    scale: 0.95,
  }),
  animate: { opacity: 1, y: 0, x: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
}

const questionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 },
  }),
  hover: { scale: 1.02, borderColor: 'hsla(344, 70%, 55%, .4)', transition: { duration: 0.15 } },
  tap: { scale: 0.98 },
}

const badgeVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } },
}

const iconPulse = {
  animate: { scale: [1, 1.08, 1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
}

// ─── Spring config ───────────────────────────────────────────────────────────
const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }
const gentle = { type: 'spring' as const, stiffness: 200, damping: 24 }

// ─── Sub-components ─────────────────────────────────────────────────────────

function MarkdownBlock({ content }: { content: string }) {
  const html = marked.parse(content) as string
  return <div className="prose-chat" dangerouslySetInnerHTML={{ __html: html }} />
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
      }}
      className="ml-2 p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
      aria-label="Copy message"
      title="Copy"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.svg key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></motion.svg>
        ) : (
          <motion.svg key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function ToolBadge({ name, done }: { name: string; done?: boolean }) {
  return (
    <motion.div
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border ${
        done ? 'text-lime bg-lime/10 border-lime/20' : 'text-primary bg-primary/10 border-primary/20'
      }`}
    >
      {done ? (
        <motion.svg initial={{ rotate: 0, scale: 0 }} animate={{ rotate: 360, scale: 1 }} transition={{ duration: 0.3 }} className="w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></motion.svg>
      ) : (
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z" fill="currentColor"/></motion.svg>
      )}
      {done ? `Queried ${name}` : `Querying ${name}`}
    </motion.div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1" role="status" aria-label="AI is thinking">
      {[0, 150, 300].map((delay, i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: delay / 1000, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function ShimmerSkeleton() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex-shrink-0" />
      <div className="space-y-2 flex-1 max-w-[75%]">
        <motion.div className="h-3 rounded-lg bg-white/5" style={{ width: '85%' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div className="h-3 rounded-lg bg-white/5" style={{ width: '60%' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div className="h-3 rounded-lg bg-white/5" style={{ width: '40%' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </div>
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
  const [isLoading, setIsLoading] = useState(true)
  const [accentColor, setAccentColor] = useState('')
  const [isDark, setIsDark] = useState(true)

  // Theme sync from parent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accent = params.get('accent') || params.get('color')
    if (accent) setAccentColor(decodeURIComponent(accent))
    const theme = params.get('theme')
    if (theme === 'light') setIsDark(false)

    function handleMessage(e: MessageEvent) {
      if (e.data?.type === '__aa_page_context' && e.data.payload) {
        pageContextRef.current = e.data.payload
      }
      if (e.data?.type === '__aa_theme' && e.data.accent) {
        setAccentColor(e.data.accent)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Load config
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(c => {
        setConfig({
          name: c.name || 'StatusPulse AI',
          welcome: c.welcome || '',
          suggestedQuestions: c.suggestedQuestions || [],
        })
        setIsLoading(false)
      })
      .catch(() => { setError('Failed to load AI config. Please refresh.'); setIsLoading(false) })
  }, [])

  const [conversationId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const key = 'sp-ai-cid'
    let cid = localStorage.getItem(key)
    if (!cid) { cid = crypto.randomUUID(); localStorage.setItem(key, cid) }
    return cid
  })

  const STORAGE_KEY = `sp-ai-msgs-${conversationId}`

  useEffect(() => {
    if (typeof window === 'undefined' || !conversationId) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed.slice(0, 50))
      }
    } catch {}
  }, [conversationId])

  useEffect(() => {
    if (typeof window === 'undefined' || !conversationId || messages.length === 0) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))) } catch {}
  }, [messages, conversationId, STORAGE_KEY])

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const composingRef = useRef(false)
  const pageContextRef = useRef<{ title?: string; url?: string; content?: string } | null>(null)

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
          headers: { 'Content-Type': 'application/json', 'makers-conversation-id': conversationId },
          body: JSON.stringify({ message: msg, ...(pageContextRef.current ? { pageContext: pageContextRef.current } : {}) }),
          signal: controller.signal,
        })

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          setError(`Rate limited. Retry in ${data.retryAfter || 60}s.`)
          setIsStreaming(false)
          return
        }
        if (!res.ok) throw new Error(`Server error (${res.status})`)

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
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.delta } : m))
              } else if (event.type === 'tool_call' && event.tool) {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, toolCalls: [...(m.toolCalls || []), { name: event.tool }] } : m))
              } else if (event.type === 'tool_result' && event.tool) {
                setMessages((prev) => prev.map((m) => { if (m.id !== assistantId || !m.toolCalls) return m; return { ...m, toolCalls: m.toolCalls.map(tc => tc.name === event.tool && !tc.done ? { ...tc, done: true } : tc) } }))
              } else if (event.type === 'error_message') {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: m.content || `⚠️ ${event.content}` } : m))
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        if (reconnectAttempts < 2) { reconnectAttempts++; await new Promise(r => setTimeout(r, 1500 * reconnectAttempts)); return tryFetch() }
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, role: 'error' as const, content: m.content || '⚠️ Connection failed after 3 attempts. Please try again.' } : m))
      } finally { setIsStreaming(false); abortRef.current = null }
    }
    tryFetch()
  }, [input, isStreaming, conversationId])

  const stopStream = useCallback(() => {
    abortRef.current?.abort()
    fetch('/api/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversationId }) }).catch(() => {})
  }, [conversationId])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    if (typeof window !== 'undefined') { localStorage.removeItem('sp-ai-cid'); localStorage.removeItem(STORAGE_KEY) }
  }, [STORAGE_KEY])

  const isWidget = mode === 'widget'

  const bg = isDark ? '#1B102D' : '#ffffff'
  const textMuted = isDark ? 'text-white/40' : 'text-gray-400'
  const borderColor = isDark ? 'border-white/8' : 'border-gray-200'
  const cardBg = isDark ? 'bg-white/6' : 'bg-gray-50'
  const inputBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
  const textColor = isDark ? 'text-white' : 'text-gray-900'

  return (
    <div className={`flex flex-col ${isWidget ? 'h-full' : 'h-screen'} font-sans overflow-hidden`} style={{ background: bg }} role="application" aria-label="StatusPulse AI Chat">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className={`flex items-center justify-between px-5 py-3 border-b ${borderColor}`}
      >
        <div className="flex items-center gap-2.5">
          <motion.div variants={iconPulse} animate="animate" className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-rose-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/></svg>
          </motion.div>
          <span className={`text-sm font-semibold ${isDark ? 'text-white/90' : 'text-gray-900'}`}>{config.name}</span>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, ...spring }} className="rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-medium text-lime">BETA</motion.span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>DeepSeek V4</span>
          {messages.length > 0 && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={clearChat} className={`p-1.5 rounded-md ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition`} title="Clear chat" aria-label="Clear chat history">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M0.667 13.982H13.334V4.316H9V0.496H5V4.316H0.667V13.982ZM2 12.649V8.982H12V12.649H5V10.316H3.667V12.649H2ZM12 7.649H2V5.649H6.333V1.829H7.667V5.649H12V7.649Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" fillOpacity="0.7"/></svg>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mx-4 mt-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between overflow-hidden" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300" aria-label="Dismiss error">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <ShimmerSkeleton />
            <ShimmerSkeleton />
            <ShimmerSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={gentle}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-rose-400 shadow-lg shadow-primary/20"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/></svg>
            </motion.div>
            <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`text-lg font-semibold mb-1.5 ${textColor}`}>{config.name}</motion.h3>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className={`text-xs ${textMuted} mb-5 max-w-[300px] leading-relaxed`}>
              {config.welcome || "I'm your API monitoring assistant. Ask me about endpoint status, uptime, response times, or any incidents."}
            </motion.p>
            {config.suggestedQuestions.length > 0 && (
              <motion.div className="w-full space-y-2">
                {config.suggestedQuestions.map((q, i) => (
                  <motion.button
                    key={i}
                    custom={i}
                    variants={questionVariants}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => sendMessage(q)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${borderColor} text-left group`}
                    style={{ background: isDark ? 'transparent' : '#fff' }}
                  >
                    <span className={`text-sm ${isDark ? 'text-white/70 group-hover:text-white/90' : 'text-gray-600 group-hover:text-gray-900'} line-clamp-1`}>{q}</span>
                    <svg className={`w-4 h-4 ${isDark ? 'text-white/20 group-hover:text-primary/60' : 'text-gray-300 group-hover:text-primary'} flex-shrink-0 ml-2`} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.53 12L8.32 6.23l1.36-1.47 7 6.5.79.74-.79.73-7 6.5-1.36-1.47L14.53 12z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/></svg>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div className="space-y-4" role="log" aria-label="Chat messages">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  custom={msg.role}
                  variants={msgVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  transition={spring}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`}
                  role="article"
                >
                  {msg.role !== 'user' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1, ...spring }}
                      className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/></svg>
                    </motion.div>
                  )}
                  <motion.div
                    layout
                    className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-primary to-rose-400 text-white rounded-tr-sm'
                        : msg.role === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 rounded-tl-sm'
                          : `${cardBg} rounded-tl-sm`
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.content ? (
                      <div className="relative">
                        <div className="absolute top-0 right-0 -mt-1"><CopyButton text={msg.content} /></div>
                        <AnimatePresence>
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2 space-y-1 mr-8" role="status">
                              {msg.toolCalls.map((tc, i) => (<ToolBadge key={i} name={tc.name} done={tc.done} />))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                          <MarkdownBlock content={msg.content} />
                        </div>
                        <AnimatePresence>
                          {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-1.5 h-4 ml-0.5 align-middle rounded-sm bg-primary" aria-hidden="true" />
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/30 text-xs py-1">
                        {msg.toolCalls && msg.toolCalls.length > 0 ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1" role="status">
                            {msg.toolCalls.map((tc, i) => (<ToolBadge key={i} name={tc.name} done={tc.done} />))}
                          </motion.div>
                        ) : (
                          <LoadingDots />
                        )}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, ...spring }}
        className={`px-4 py-3 border-t ${borderColor}`}
        style={{ background: isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.01)' }}
      >
        <div className="flex items-center gap-2">
          <motion.textarea
            whileFocus={{ scale: 1.01 }}
            value={input}
            onChange={(e) => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 120)}px` }}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={() => { composingRef.current = false }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask about your APIs..."
            rows={1}
            disabled={isStreaming}
            className={`flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/10 transition ${inputBg} ${textColor} placeholder:opacity-25 disabled:opacity-50`}
            style={{ minHeight: '40px' }}
            aria-label="Chat message input"
          />
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.button key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileTap={{ scale: 0.9 }} onClick={stopStream} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex-shrink-0" aria-label="Stop AI response">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
              </motion.button>
            ) : (
              <motion.button key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={() => sendMessage()} disabled={!input.trim()} className="p-2 rounded-lg bg-gradient-to-r from-primary to-rose-400 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex-shrink-0" aria-label="Send message">
                <motion.svg animate={{ x: [0, 2, -1, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M0.99 7.67c-.48-.16-.49-.42.01-.59L18.71 1.17c.49-.16.77.08.63.57L14.28 19.5c-.14.49-.42.5-.63.04L10.32 12.02l5.57-7.43-7.42 5.57L0.99 7.67z" fill="currentColor"/></motion.svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-between mt-1.5 px-1">
          <span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-gray-300'}`}>Enter to send · Shift+Enter for newline</span>
          <motion.span
            className={`text-[9px] ${isDark ? 'text-white/15' : 'text-gray-300'}`}
            key={messages.length}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={spring}
          >{messages.length} messages</motion.span>
        </motion.div>
      </motion.div>
    </div>
  )
}
