import { apiSuccess, apiError } from '@/lib/api-response'
import * as M from '@/lib/monitor'

// Short-TTL in-process cache. The dashboard is polled every ~10s by every open
// tab; without this, each poll re-runs the full aggregation (a documented cold
// bottleneck). An 8s TTL (below the 10s Cache-Control) collapses concurrent
// polls into a single DB round-trip while keeping data fresh. Mutations use
// optimistic UI, so brief staleness is invisible to users.
const CACHE_TTL_MS = 8_000
let cache: { at: number; data: unknown } | null = null

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      const hit = apiSuccess(cache.data)
      hit.headers.set('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=20')
      hit.headers.set('X-Cache', 'HIT')
      return hit
    }
    const db = await M.connect()
    const data = await M.getDashboard(db)
    cache = { at: Date.now(), data }
    const res = apiSuccess(data)
    res.headers.set('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=20')
    res.headers.set('X-Cache', 'MISS')
    return res
  } catch (error) {
    return apiError(error)
  }
}
