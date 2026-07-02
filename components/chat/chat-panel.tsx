'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: { name: string; done?: boolean }[]
}

interface SiteConfig {
  name: string
  welcome: string
  suggestedQuestions: string[]
}

function MarkdownBlock({ content }: { content: string }) {
  const html = marked.parse(content) as string
  return <div className="prose-chat" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function ChatPanel({ mode = 'full' }: { mode?: 'full' | 'widget' }) {
  const [config, setConfig] = useState<SiteConfig>({ name: 'StatusPulse AI', welcome: '', suggestedQuestions: [] })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(c => {
        setConfig({
          name: c.name || 'StatusPulse AI',
          welcome: c.welcome || '',
          suggestedQuestions: c.suggestedQuestions || [],
        })
      })
      .catch(() => {})
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

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg }
    const assistantId = `a-${Date.now()}`
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

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
      if (err?.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || '⚠️ Failed to connect to AI. Please try again.' }
              : m,
          ),
        )
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sp-ai-cid')
    }
  }, [])

  const isWidget = mode === 'widget'

  return (
    <div className={`flex flex-col ${isWidget ? 'h-full bg-[#1B102D]' : 'h-screen bg-[#1B102D]'} font-sans`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-rose-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/90">{config.name}</span>
          <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-medium text-lime">BETA</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition" title="Clear chat">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M0.667 13.982H13.334V4.316H9V0.496H5V4.316H0.667V13.982ZM2 12.649V8.982H12V12.649H5V10.316H3.667V12.649H2ZM12 7.649H2V5.649H6.333V1.829H7.667V5.649H12V7.649Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" fillOpacity="0.7"/></svg>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-rose-400 shadow-lg shadow-primary/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">
              {config.name}
            </h3>
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
                    <svg className="w-4 h-4 text-white/20 group-hover:text-primary/60 flex-shrink-0 ml-2" viewBox="0 0 24 24" fill="none"><path d="M14.53 12L8.32 6.23l1.36-1.47 7 6.5.79.74-.79.73-7 6.5-1.36-1.47L14.53 12z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="#fff" fillOpacity="0.9"/>
                  </svg>
                </div>
              )}
              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[82%] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-primary to-rose-400 text-white rounded-tr-sm'
                    : 'bg-white/6 rounded-tl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : msg.content ? (
                  <div className="relative">
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {msg.toolCalls.map((tc, i) => (
                          <div key={i} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border ${tc.done ? 'text-lime bg-lime/10 border-lime/20' : 'text-primary bg-primary/10 border-primary/20'}`}>
                            {tc.done ? (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
                            ) : (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z" fill="currentColor"/></svg>
                            )}
                            {tc.done ? `Queried ${tc.name}` : `Querying ${tc.name}`}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-sm text-white/80">
                      <MarkdownBlock content={msg.content} />
                    </div>
                    {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 align-middle rounded-sm bg-primary opacity-60 animate-pulse" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white/30 text-xs py-1">
                    {msg.toolCalls && msg.toolCalls.length > 0 ? (
                      <div className="space-y-1">
                        {msg.toolCalls.map((tc, i) => (
                          <div key={i} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border ${tc.done ? 'text-lime bg-lime/10 border-lime/20' : 'text-primary bg-primary/10 border-primary/20'}`}>
                            {tc.done ? (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>
                            ) : (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z" fill="currentColor"/></svg>
                            )}
                            {tc.done ? `Queried ${tc.name}` : `Querying ${tc.name}`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition placeholder:text-white/25"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          {isStreaming ? (
            <button onClick={stopStream} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
            </button>
          ) : (
            <button onClick={() => sendMessage()} disabled={!input.trim()} className="p-2 rounded-lg bg-gradient-to-r from-primary to-rose-400 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 transition flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M0.99 7.67c-.48-.16-.49-.42.01-.59L18.71 1.17c.49-.16.77.08.63.57L14.28 19.5c-.14.49-.42.5-.63.04L10.32 12.02l5.57-7.43-7.42 5.57L0.99 7.67z" fill="currentColor"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
