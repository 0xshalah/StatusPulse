'use client'

import { useEffect } from 'react'
import { api } from '@/lib/statuspulse'

// Real-time dashboard data via Server-Sent Events, with polling fallback.
export function useStatusStream(onData, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let es
    let poll
    let alive = true

    const startPoll = () => {
      if (poll) return
      poll = setInterval(async () => {
        try {
          onData(await api('/dashboard'))
        } catch (e) {}
      }, 10000)
    }

    try {
      es = new EventSource('/api/sse/status')
      es.onmessage = (e) => {
        try {
          onData(JSON.parse(e.data))
        } catch (err) {}
      }
      es.onerror = () => {
        try { es.close() } catch (e) {}
        if (alive) startPoll()
      }
    } catch (e) {
      startPoll()
    }

    return () => {
      alive = false
      if (es) try { es.close() } catch (e) {}
      if (poll) clearInterval(poll)
    }
  }, [onData, enabled])
}
