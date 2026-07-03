'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { marked } from 'marked'
import { useMediaQuery } from '@/hooks/useMediaQuery'

marked.setOptions({ gfm: true, breaks: true })

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

const msgVariants = {
  initial: (role: string) => ({ opacity: 0, y: 10, x: role === 'user' ? 12 : -12, scale: 0.96 }),
  animate: { opacity: 1, y: 0, x: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
}

const questionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 } }),
  hover: { scale: 1.01, borderColor: 'hsla(344,70%,55%,.35)', transition: { duration: 0.12 } },
  tap: { scale: 0.98 },
}

const badgeVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } },
}

const iconPulse = { animate: { scale: [1, 1.06, 1], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } } }

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }
const gentle = { type: 'spring' as const, stiffness: 200, damping: 24 }

function MarkdownBlock({ content }: { content: string }) {
  const html = marked.parse(content) as string
  return <div className="prose-chat max-w-full [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: html }} />
}

function CopyButton({ text, compact }: { text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}) }}
      className={`rounded-md text-white/25 hover:text-white/55 hover:bg-white/5 transition-colors focus:opacity-100 ${compact ? 'opacity-60 px-1 py-0.5' : 'ml-2 p-1 opacity-0 group-hover:opacity-100'}`}
      aria-label="Copy message"
      title="Copy"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.svg key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></motion.svg>
        ) : (
          <motion.svg key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function ToolBadge({ name, done, compact }: { name: string; done?: boolean; compact?: boolean }) {
  return (
    <motion.div variants={badgeVariants} initial="initial" animate="animate"
      className={`inline-flex items-center gap-1 rounded-lg border ${
        compact ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'
      } ${done ? 'text-lime bg-lime/10 border-lime/20' : 'text-primary bg-primary/10 border-primary/20'}`}
    >
      {done ? (
        <motion.svg initial={{ rotate: 0, scale: 0 }} animate={{ rotate: 360, scale: 1 }} transition={{ duration: 0.3 }} className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></motion.svg>
      ) : (
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z" fill="currentColor"/></motion.svg>
      )}
      {done ? `Queried ${name}` : `Querying ${name}`}
    </motion.div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1" role="status" aria-label="AI is thinking">
      {[0, 150, 300].map((d, i) => (
        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: d / 1000, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function ShimmerSkeleton({ compact }: { compact?: boolean }) {
  const gap = compact ? 'gap-2' : 'gap-2.5'
  const avatar = compact ? 'w-6 h-6' : 'w-7 h-7'
  return (
    <div className={`flex ${gap}`}>
      <div className={`${avatar} rounded-lg bg-white/5 flex-shrink-0`} />
      <div className="space-y-1.5 flex-1 max-w-[75%]">
        {[85, 60, 40].map((w, i) => (
          <motion.div key={i} className="h-2.5 rounded-lg bg-white/5" style={{ width: `${w}%` }}
            animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ChatPanel({ mode = 'full' }: { mode?: 'full' | 'widget' }) {
  const compact = useMediaQuery('(max-width: 399px)')
  const thin = useMediaQuery('(max-width: 359px)')

  const [config, setConfig] = useState<SiteConfig>({ name: 'StatusPulse AI', welcome: '', suggestedQuestions: [] })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accent = params.get('accent') || params.get('color')
    if (accent) setAccentColor(accent)
    const theme = params.get('theme')
    if (theme === 'light') setIsDark(false)

    function handleMessage(e: MessageEvent) {
      if (e.data?.type === '__aa_page_context' && e.data.payload) pageContextRef.current = e.data.payload
      if (e.data?.type === '__aa_theme' && e.data.accent) setAccentColor(e.data.accent)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(c => { setConfig({ name: c.name || 'StatusPulse AI', welcome: c.welcome || '', suggestedQuestions: c.suggestedQuestions || [] }); setIsLoading(false) })
      .catch(() => { setError('Failed to load AI config.'); setIsLoading(false) })
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
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) setMessages(p.slice(0, 50)) } } catch {}
  }, [conversationId])

  useEffect(() => {
    if (typeof window === 'undefined' || !conversationId || messages.length === 0) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))) } catch {}
  }, [messages, conversationId, STORAGE_KEY])

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const composingRef = useRef(false)
  const pageContextRef = useRef<{ title?: string; url?: string; content?: string } | null>(null)
  const [accentColor, setAccentColor] = useState('')

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) })
  }, [])
  useEffect(scrollToBottom, [messages, scrollToBottom])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isStreaming) return
    setInput('')
    setIsStreaming(true)
    setError(null)
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg }
    const aid = `a-${Date.now()}`
    setMessages(prev => [...prev, userMsg, { id: aid, role: 'assistant', content: '' }])
    const controller = new AbortController()
    abortRef.current = controller
    let ra = 0

    async function tf() {
      try {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'makers-conversation-id': conversationId }, body: JSON.stringify({ message: msg, ...(pageContextRef.current ? { pageContext: pageContextRef.current } : {}) }), signal: controller.signal })
        if (res.status === 429) { const d = await res.json().catch(() => ({})); setError(`Rate limited. Retry in ${d.retryAfter || 60}s.`); setIsStreaming(false); return }
        if (!res.ok) throw new Error(`Server error (${res.status})`)
        const reader = res.body?.getReader(); const decoder = new TextDecoder(); let buffer = ''
        while (reader) {
          const { done, value } = await reader.read(); if (done) break
          buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue; const p = line.slice(6).trim(); if (p === '[DONE]') break
            try { const e = JSON.parse(p)
              if (e.type === 'text_delta' && e.delta) setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: m.content + e.delta } : m))
              else if (e.type === 'tool_call' && e.tool) setMessages(prev => prev.map(m => m.id === aid ? { ...m, toolCalls: [...(m.toolCalls || []), { name: e.tool }] } : m))
              else if (e.type === 'tool_result' && e.tool) setMessages(prev => prev.map(m => { if (m.id !== aid || !m.toolCalls) return m; return { ...m, toolCalls: m.toolCalls.map(tc => tc.name === e.tool && !tc.done ? { ...tc, done: true } : tc) } }))
              else if (e.type === 'error_message') setMessages(prev => prev.map(m => m.id === aid ? { ...m, content: m.content || `⚠️ ${e.content}` } : m))
            } catch {}
          }
        }
      } catch (err: any) { if (err?.name === 'AbortError') return; if (ra < 2) { ra++; await new Promise(r => setTimeout(r, 1500 * ra)); return tf() }; setMessages(prev => prev.map(m => m.id === aid ? { ...m, role: 'error' as const, content: m.content || '⚠️ Connection failed.' } : m)) }
      finally { setIsStreaming(false); abortRef.current = null }
    }
    tf()
  }, [input, isStreaming, conversationId])

  const stopStream = useCallback(() => { abortRef.current?.abort(); fetch('/api/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversationId }) }).catch(() => {}) }, [conversationId])
  const clearChat = useCallback(() => { setMessages([]); setError(null); if (typeof window !== 'undefined') { localStorage.removeItem('sp-ai-cid'); localStorage.removeItem(STORAGE_KEY) } }, [STORAGE_KEY])

  const isWidget = mode === 'widget'
  const bg = isDark ? '#1B102D' : '#ffffff'
  const textMuted = isDark ? 'text-white/40' : 'text-gray-400'
  const borderColor = isDark ? 'border-white/8' : 'border-gray-200'
  const cardBg = isDark ? 'bg-white/6' : 'bg-gray-50'
  const textColor = isDark ? 'text-white' : 'text-gray-900'

  const hPad = compact ? 'px-3' : 'px-5'
  const hPadM = compact ? 'px-2.5' : 'px-4'
  const hPy = compact ? 'py-2' : 'py-3'
  const hGap = compact ? 'gap-1.5' : 'gap-2.5'
  const avatarSize = compact ? 'h-6 w-6' : 'h-7 w-7'
  const logoSvg = compact ? 11 : 14
  const logoSvgLarge = compact ? 20 : 24
  const logoWrap = compact ? 'h-10 w-10 rounded-xl' : 'h-14 w-14 rounded-2xl'
  const msgPad = compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
  const msgMaxW = compact ? 'max-w-[88%]' : 'max-w-[82%]'
  const inPad = compact ? 'px-2.5 py-2' : 'px-4 py-3'
  const bubbleSize = compact ? 50 : 60
  const bubbleRight = compact ? 16 : 24

  return (
    <div className={`flex flex-col ${isWidget ? 'h-full' : 'h-screen'} font-sans overflow-hidden`} style={{ background: bg }} role="application" aria-label="StatusPulse AI Chat">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={spring}
        className={`flex items-center justify-between ${hPad} ${hPy} border-b ${borderColor}`}
      >
        <div className={`flex items-center ${hGap}`}>
          <motion.div variants={iconPulse} animate="animate" className={`flex ${avatarSize} items-center justify-center rounded-md bg-gradient-to-br from-primary to-rose-400 flex-shrink-0`}>
            <svg width={logoSvg} height={logoSvg} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/></svg>
          </motion.div>
          <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'} ${isDark ? 'text-white/90' : 'text-gray-900'} truncate max-w-[120px]`}>{config.name}</span>
          {!compact && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, ...spring }} className="rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-medium text-lime flex-shrink-0">BETA</motion.span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!compact && <span className={`text-[10px] ${isDark ? 'text-white/20' : 'text-gray-300'}`}>DeepSeek V4</span>}
          {messages.length > 0 && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={clearChat}
              className={`rounded-md ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition ${compact ? 'p-1' : 'p-1.5'}`}
              title="Clear chat" aria-label="Clear chat history"
            >
              <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M0.667 13.982H13.334V4.316H9V0.496H5V4.316H0.667V13.982ZM2 12.649V8.982H12V12.649H5V10.316H3.667V12.649H2ZM12 7.649H2V5.649H6.333V1.829H7.667V5.649H12V7.649Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" fillOpacity="0.7"/></svg>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`${compact ? 'mx-3 mt-1 px-3 py-1.5' : 'mx-4 mt-2 px-4 py-2'} rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 ${compact ? 'text-[11px]' : 'text-xs'} flex items-center justify-between overflow-hidden`} role="alert"
          >
            <span className="truncate mr-2">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 flex-shrink-0" aria-label="Dismiss error">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${hPadM} ${compact ? 'py-3' : 'py-5'}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            {[0, 1, 2].map(i => <ShimmerSkeleton key={i} compact={compact} />)}
          </div>
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={gentle} className="flex flex-col items-center justify-center h-full text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className={`flex ${logoWrap} items-center justify-center bg-gradient-to-br from-primary to-rose-400 shadow-lg shadow-primary/20 ${compact ? 'mb-3' : 'mb-4'}`}
            >
              <svg width={logoSvgLarge} height={logoSvgLarge} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/></svg>
            </motion.div>
            <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className={`${compact ? 'text-base' : 'text-lg'} font-semibold mb-1 ${textColor}`}>
              {config.name}
            </motion.h3>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className={`${compact ? 'text-[11px]' : 'text-xs'} ${textMuted} ${compact ? 'mb-3 max-w-[260px]' : 'mb-5 max-w-[300px]'} leading-relaxed px-2`}
            >
              {compact ? 'Ask about your APIs.' : config.welcome || "I'm your API monitoring assistant."}
            </motion.p>
            {config.suggestedQuestions.length > 0 && (
              <motion.div className={`w-full ${compact ? 'space-y-1' : 'space-y-2'}`}>
                {config.suggestedQuestions.map((q, i) => (
                  <motion.button key={i} custom={i} variants={questionVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap"
                    onClick={() => sendMessage(q)}
                    className={`w-full flex items-center justify-between rounded-xl border ${borderColor} text-left group ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
                    style={{ background: isDark ? 'transparent' : '#fff' }}
                  >
                    <span className={`${compact ? 'text-xs' : 'text-sm'} ${isDark ? 'text-white/70 group-hover:text-white/90' : 'text-gray-600 group-hover:text-gray-900'} line-clamp-1`}>{q}</span>
                    <svg className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isDark ? 'text-white/20 group-hover:text-primary/60' : 'text-gray-300 group-hover:text-primary'} flex-shrink-0 ml-1.5`} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.53 12L8.32 6.23l1.36-1.47 7 6.5.79.74-.79.73-7 6.5-1.36-1.47L14.53 12z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/></svg>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div className="space-y-3" role="log" aria-label="Chat messages">
              {messages.map((msg) => (
                <motion.div key={msg.id} custom={msg.role} variants={msgVariants} initial="initial" animate="animate" exit="exit" layout transition={spring}
                  className={`flex ${compact ? 'gap-2' : 'gap-2.5'} ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`} role="article"
                >
                  {msg.role !== 'user' && (
                    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, ...spring }}
                      className={`${avatarSize} rounded-lg bg-gradient-to-br from-primary to-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5`} aria-hidden="true"
                    >
                      <svg width={compact ? 10 : 13} height={compact ? 10 : 13} viewBox="0 0 24 24" fill="none"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/></svg>
                    </motion.div>
                  )}
                  <motion.div layout
                    className={`rounded-2xl ${msgPad} ${msgMaxW} ${
                      msg.role === 'user' ? 'bg-gradient-to-r from-primary to-rose-400 text-white rounded-tr-sm' :
                      msg.role === 'error' ? 'bg-red-500/10 border border-red-500/20 rounded-tl-sm' :
                      `${cardBg} rounded-tl-sm`
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className={`${compact ? 'text-[13px]' : 'text-sm'} whitespace-pre-wrap break-words`}>{msg.content}</p>
                    ) : msg.content ? (
                      <div className="relative">
                        <div className="absolute top-0 right-0 -mt-0.5"><CopyButton text={msg.content} compact={compact} /></div>
                        <AnimatePresence>
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`mb-1.5 mr-6 flex flex-wrap gap-1`} role="status">
                              {msg.toolCalls.map((tc, i) => (<ToolBadge key={i} name={tc.name} done={tc.done} compact={compact} />))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className={`${compact ? 'text-[13px]' : 'text-sm'} ${isDark ? 'text-white/80' : 'text-gray-700'} break-words`}>
                          <MarkdownBlock content={msg.content} />
                        </div>
                        <AnimatePresence>
                          {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }}
                              className="inline-block w-1.5 h-3.5 ml-0.5 align-middle rounded-sm bg-primary" aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 ${isDark ? 'text-white/30' : 'text-gray-400'} ${compact ? 'text-[11px]' : 'text-xs'} py-0.5`}>
                        {msg.toolCalls && msg.toolCalls.length > 0 ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1" role="status">
                            {msg.toolCalls.map((tc, i) => (<ToolBadge key={i} name={tc.name} done={tc.done} compact={compact} />))}
                          </motion.div>
                        ) : (<LoadingDots />)}
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ...spring }}
        className={`${inPad} border-t ${borderColor}`}
        style={{ background: isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.01)' }}
      >
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
          <motion.textarea whileFocus={{ scale: 1.01 }}
            value={input}
            onChange={(e) => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 100)}px` }}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={() => { composingRef.current = false }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) { e.preventDefault(); sendMessage() } }}
            placeholder={compact ? 'Ask...' : 'Ask about your APIs...'}
            rows={1} disabled={isStreaming}
            className={`flex-1 resize-none rounded-xl border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition placeholder:opacity-25 disabled:opacity-50 ${textColor} ${compact ? 'min-h-[38px]' : 'min-h-[40px]'} ${isDark ? 'bg-white/5' : 'bg-white border-gray-200'}`}
            style={{ minHeight: compact ? '38px' : '40px' }}
            aria-label="Chat message input"
          />
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.button key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileTap={{ scale: 0.9 }} onClick={stopStream}
                className={`rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex-shrink-0 ${compact ? 'p-1.5' : 'p-2'}`} aria-label="Stop AI response"
              >
                <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
              </motion.button>
            ) : (
              <motion.button key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}
                onClick={() => sendMessage()} disabled={!input.trim()}
                className={`rounded-lg bg-gradient-to-r from-primary to-rose-400 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex-shrink-0 ${compact ? 'p-1.5' : 'p-2'}`}
                aria-label="Send message"
              >
                <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M0.99 7.67c-.48-.16-.49-.42.01-.59L18.71 1.17c.49-.16.77.08.63.57L14.28 19.5c-.14.49-.42.5-.63.04L10.32 12.02l5.57-7.43-7.42 5.57L0.99 7.67z" fill="currentColor"/></svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {!thin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-between mt-1 px-1">
            {!compact && <span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-gray-300'}`}>Enter to send · Shift+Enter for newline</span>}
            <motion.span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-gray-300'} ml-auto`} key={messages.length} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={spring}>{messages.length} {compact ? 'msgs' : 'messages'}</motion.span>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
