'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/lib/statuspulse'

// Background ping scheduler. Triggers /api/ping-all on an interval.
// Server-side deduplication ensures no double in-flight pings.
export function useScheduler({ intervalMs = 60000, enabled = true, onTick } = {}) {
  const tickingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const tick = async () => {
      if (tickingRef.current) return // local dedup
      tickingRef.current = true
      try {
        const res = await api('/ping-all', { method: 'POST' })
        if (onTick) onTick(res)
      } catch (e) {
        // silent — scheduler keeps running
      } finally {
        tickingRef.current = false
      }
    }

    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled, onTick])
}
