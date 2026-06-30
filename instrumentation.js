// Next.js instrumentation — runs once at server startup (nodejs runtime).
// SERVER-SIDE scheduler (replaces the old client browser-tab scheduler).
// It triggers work via internal HTTP calls to the API route (so the heavy
// mongodb driver stays only in the route bundle and is never bundled here).
// Runs continuously without any browser tab being open.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (globalThis.__sp_sched__) return
  globalThis.__sp_sched__ = true

  const base = `http://127.0.0.1:${process.env.PORT || 3000}`
  const post = (p) =>
    fetch(base + p, { method: 'POST' })
      .then((r) => r.json())
      .catch(() => null)

  const boot = async (attempt = 0) => {
    const r = await post('/api/seed')
    if (!r && attempt < 12) {
      setTimeout(() => boot(attempt + 1), 2500)
      return
    }
    await post('/api/rollups')
  }
  setTimeout(boot, 3000)

  // Daily rollup recompute
  setInterval(() => post('/api/rollups'), 10 * 60 * 1000)
}
