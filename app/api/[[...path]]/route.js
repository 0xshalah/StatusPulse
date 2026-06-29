import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import * as M from '@/lib/monitor'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}
export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function handler(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  try {
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
      if (!b.email || !/^[^@]+@[^@]+\.[^@]+$/.test(b.email)) return cors(NextResponse.json({ error: 'valid email required' }, { status: 400 }))
      await db.collection('subscribers').updateOne({ email: b.email }, { $set: { email: b.email, subscribedAt: new Date() } }, { upsert: true })
      return cors(NextResponse.json({ subscribed: true }))
    }

    // Endpoints collection
    if (route === '/endpoints' && method === 'GET') {
      const eps = await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()
      return cors(NextResponse.json(eps.map(M.clean)))
    }
    if (route === '/endpoints' && method === 'POST') {
      const b = await request.json()
      if (!b.name || !b.url) return cors(NextResponse.json({ error: 'name and url required' }, { status: 400 }))
      const ep = {
        id: uuidv4(),
        name: b.name,
        url: b.url,
        expectedStatus: Number(b.expectedStatus) || 200,
        interval: Number(b.interval) || 60,
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
        ;['name', 'url'].forEach((k) => b[k] !== undefined && (u[k] = b[k]))
        if (b.expectedStatus !== undefined) u.expectedStatus = Number(b.expectedStatus)
        if (b.interval !== undefined) u.interval = Number(b.interval)
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

    if (route === '/dashboard' && method === 'GET') return cors(NextResponse.json(await M.getDashboard(db)))
    if (route === '/status' && method === 'GET') return cors(NextResponse.json(await M.getStatus(db)))

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
    console.error('API Error:', error)
    return cors(NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 }))
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
