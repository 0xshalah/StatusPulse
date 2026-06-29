import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import * as M from '@/lib/monitor'
import { rateLimit, getClientIp, sanitize, safeError, isValidUrl } from '@/lib/security'

const DESTRUCTIVE_ROUTES = ['/seed', '/reset', '/delete']
function requireAdmin(request) {
  const key = process.env.ADMIN_KEY
  if (!key) return true // no key set = open (backward compatible for hackathon)
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${key}`
}

function cors(res, cacheSecs = 0) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || 'https://statuspulse-vvy0.onrender.com')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (cacheSecs > 0) {
    res.headers.set('Cache-Control', `public, max-age=${cacheSecs}, s-maxage=${cacheSecs}, stale-while-revalidate=${cacheSecs * 2}`)
  } else {
    res.headers.set('Cache-Control', 'no-cache')
  }
  return res
}
export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

const BODY_LIMIT = 1024 * 64 // 64 KB

async function handler(request, { params }) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 120, 60000)
  if (!rl.allowed) {
    return cors(NextResponse.json(
      { error: 'Too many requests', retryAfter: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter), 'X-RateLimit-Limit': String(rl.limit), 'X-RateLimit-Remaining': String(rl.remaining) } }
    ))
  }

  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  try {
    const isDestructive = DESTRUCTIVE_ROUTES.some((r) => route === r || route.startsWith(r)) || method === 'DELETE'
    if (isDestructive && !requireAdmin(request)) {
      return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const db = await M.connect()

    if ((route === '/' || route === '/root') && method === 'GET') return cors(NextResponse.json({ message: 'StatusPulse API' }))
    if (route === '/seed' && method === 'POST') return cors(NextResponse.json(await M.seedIfEmpty(db)))
    if (route === '/reset' && method === 'POST') return cors(NextResponse.json(await M.resetData(db)))
    if (route === '/rollups' && method === 'POST') return cors(NextResponse.json(await M.buildRollups(db)))

    // Settings (Slack webhook)
    if (route === '/settings' && method === 'GET') return cors(NextResponse.json(await M.getSettings(db)))
    if (route === '/settings' && method === 'PUT') {
      const b = await request.json()
      return cors(NextResponse.json(await M.updateSettings(db, b)))
    }
    if (route === '/settings/test' && method === 'POST') {
      const settings = await M.getSettings(db)
      if (!settings.slackWebhookUrl) return cors(NextResponse.json({ error: 'webhook URL not set' }, { status: 400 }))
      try {
        await fetch(settings.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ':white_check_mark: *StatusPulse* — Slack webhook test successful! Your alerts are configured correctly.' }),
        })
        return cors(NextResponse.json({ sent: true }))
      } catch (e) {
        return cors(NextResponse.json({ error: e.message }, { status: 500 }))
      }
    }

    // Server-side cron (Vercel Cron or in-process scheduler calls this)
    if (route === '/cron/ping' && (method === 'POST' || method === 'GET')) {
      const res = await M.runDueChecks(db)
      return cors(NextResponse.json({ ok: true, ...res }))
    }
    // legacy/manual full sweep
    if (route === '/ping-all' && method === 'POST') {
      const eps = await db.collection('endpoints').find({}).toArray()
      await Promise.allSettled(eps.map((e) => M.pingOneNow(db, e.id)))
      return cors(NextResponse.json({ pinged: eps.length, total: eps.length }))
    }

    // Wizard helpers
    if (route === '/test-url' && method === 'POST') {
      const b = await request.json()
      if (!b.url) return cors(NextResponse.json({ error: 'url required' }, { status: 400 }))
      return cors(NextResponse.json(await M.testUrl(b.url, b.expectedStatus || 200)))
    }
    if (route === '/check-duplicate' && method === 'POST') {
      const b = await request.json()
      const exists = await db.collection('endpoints').findOne({ url: b.url })
      return cors(NextResponse.json({ exists: !!exists }))
    }
    if (route === '/subscribe' && method === 'POST') {
      const b = await request.json()
      const email = sanitize(b.email)
      if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return cors(NextResponse.json({ error: 'valid email required' }, { status: 400 }))
      await db.collection('subscribers').updateOne({ email }, { $set: { email, subscribedAt: new Date() } }, { upsert: true })
      return cors(NextResponse.json({ subscribed: true }))
    }

    // Endpoints collection
    if (route === '/endpoints' && method === 'GET') {
      const eps = await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()
      return cors(NextResponse.json(eps.map(M.clean)), 5)
    }
    if (route === '/endpoints' && method === 'POST') {
      const b = await request.json()
      const epName = sanitize(b.name)
      const epUrl = sanitize(b.url)
      if (!epName || !epUrl) return cors(NextResponse.json({ error: 'name and url required' }, { status: 400 }))
      if (!isValidUrl(epUrl)) return cors(NextResponse.json({ error: 'invalid url format' }, { status: 400 }))
      if (epName.length > 100) return cors(NextResponse.json({ error: 'name too long (max 100 chars)' }, { status: 400 }))
      const ep = {
        id: uuidv4(),
        name: epName,
        url: epUrl,
        expectedStatus: Math.min(599, Math.max(100, Number(b.expectedStatus) || 200)),
        interval: Math.min(3600, Math.max(10, Number(b.interval) || 60)),
        paused: false,
        status: 'active',
        consecutiveFailures: 0,
        nextPingAt: new Date(),
        createdAt: new Date(),
      }
      await db.collection('endpoints').insertOne({ ...ep })
      M.pingOneNow(db, ep.id).catch(() => {})
      return cors(NextResponse.json(ep))
    }

    // Single endpoint operations
    if (path[0] === 'endpoints' && path[1]) {
      const id = path[1]
      if (path[2] === 'detail' && method === 'GET') {
        const d = await M.getEndpointDetail(db, id)
        if (!d) return cors(NextResponse.json({ error: 'not found' }, { status: 404 }))
        return cors(NextResponse.json(d))
      }
      if (path[2] === 'pings' && method === 'GET') {
        const url = new URL(request.url)
        const limit = Number(url.searchParams.get('limit')) || 30
        const pings = await db.collection('pings').find({ endpointId: id }).sort({ timestamp: -1 }).limit(limit).toArray()
        return cors(NextResponse.json(pings.map(M.clean).reverse()))
      }
      if (path[2] === 'test' && method === 'POST') {
        const ping = await M.pingOneNow(db, id)
        if (!ping) return cors(NextResponse.json({ error: 'not found' }, { status: 404 }))
        return cors(NextResponse.json({ ping }))
      }
      if (path[2] === 'pause' && method === 'POST') {
        const b = await request.json().catch(() => ({}))
        await db.collection('endpoints').updateOne({ id }, { $set: { paused: !!b.paused } })
        return cors(NextResponse.json({ id, paused: !!b.paused }))
      }
      if (path[2] === 'maintenance' && method === 'POST') {
        const b = await request.json().catch(() => ({}))
        await db.collection('endpoints').updateOne({ id }, { $set: { status: b.maintenance ? 'maintenance' : 'active' } })
        return cors(NextResponse.json({ id, maintenance: !!b.maintenance }))
      }
      if (method === 'PUT') {
        const b = await request.json()
        const u = {}
        if (b.name !== undefined) { u.name = sanitize(b.name); if (u.name.length > 100) return cors(NextResponse.json({ error: 'name too long' }, { status: 400 })) }
        if (b.url !== undefined) { u.url = sanitize(b.url); if (!isValidUrl(u.url)) return cors(NextResponse.json({ error: 'invalid url format' }, { status: 400 })) }
        if (b.expectedStatus !== undefined) u.expectedStatus = Math.min(599, Math.max(100, Number(b.expectedStatus)))
        if (b.interval !== undefined) u.interval = Math.min(3600, Math.max(10, Number(b.interval)))
        if (b.maintenanceStart !== undefined) u.maintenanceStart = b.maintenanceStart
        if (b.maintenanceEnd !== undefined) u.maintenanceEnd = b.maintenanceEnd
        await db.collection('endpoints').updateOne({ id }, { $set: u })
        const updated = await db.collection('endpoints').findOne({ id })
        return cors(NextResponse.json(M.clean(updated)))
      }
      if (method === 'DELETE') {
        await db.collection('endpoints').deleteOne({ id })
        await db.collection('pings').deleteMany({ endpointId: id })
        await db.collection('rollups').deleteMany({ endpointId: id })
        return cors(NextResponse.json({ deleted: true, id }))
      }
    }

    if (route === '/dashboard' && method === 'GET') return cors(NextResponse.json(await M.getDashboard(db)), 10)
    if (route === '/status' && method === 'GET') return cors(NextResponse.json(await M.getStatus(db)), 15)

    // SSE real-time stream
    if (route === '/sse/status' && method === 'GET') {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          let closed = false
          const send = async () => {
            if (closed) return
            try {
              const data = await M.getDashboard(db)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            } catch (e) {}
          }
          await send()
          const iv = setInterval(send, 5000)
          request.signal.addEventListener('abort', () => {
            closed = true
            clearInterval(iv)
            try { controller.close() } catch (e) {}
          })
        },
      })
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // SVG badge with variants
    if (path[0] === 'badge' && path[1] && method === 'GET') {
      const url = new URL(request.url)
      const style = url.searchParams.get('style') || 'flat'
      const metric = url.searchParams.get('metric') || 'status'
      const icon = url.searchParams.get('icon') === 'true' || url.searchParams.get('icon') === '1'
      const svg = await M.badgeForEndpoint(db, path[1], { style, metric, icon })
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error.message)
    return cors(NextResponse.json(safeError(error), { status: 500 }))
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
