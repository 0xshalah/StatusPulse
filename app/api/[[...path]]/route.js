import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// MongoDB connection (singleton)
// ---------------------------------------------------------------------------
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// In-flight ping tracker for deduplication (module scope = per process)
const inFlight = new Set()

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clean(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

function computeVerdict(statusCode, responseTime, expectedStatus, errored) {
  if (errored || !statusCode) return 'down'
  if (statusCode === expectedStatus) return responseTime > 1200 ? 'degraded' : 'up'
  if (statusCode >= 200 && statusCode < 400) return 'degraded'
  return 'down'
}

async function pingOne(db, ep) {
  if (inFlight.has(ep.id)) return null // dedup: skip if one already in-flight
  inFlight.add(ep.id)
  const start = Date.now()
  let statusCode = 0
  let errored = false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(ep.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'StatusPulse/1.0 (+monitor)' },
    })
    clearTimeout(timer)
    statusCode = res.status
  } catch (e) {
    errored = true
  }
  const responseTime = Date.now() - start
  const verdict = computeVerdict(statusCode, responseTime, ep.expectedStatus, errored)
  const ping = {
    id: uuidv4(),
    endpointId: ep.id,
    timestamp: new Date(),
    statusCode,
    responseTime,
    verdict,
  }
  try {
    await db.collection('pings').insertOne({ ...ping })
  } finally {
    inFlight.delete(ep.id)
  }
  return ping
}

function uptimePct(pings, windowMs) {
  const since = Date.now() - windowMs
  const w = pings.filter((p) => new Date(p.timestamp).getTime() >= since)
  if (!w.length) return null
  const ok = w.filter((p) => p.verdict !== 'down').length
  return Math.round((ok / w.length) * 1000) / 10
}

function buildIncidents(endpoint, pingsAsc) {
  const incidents = []
  let downStart = null
  let downCodes = []
  for (const p of pingsAsc) {
    if (p.verdict === 'down' && !downStart) {
      downStart = p.timestamp
      downCodes = [p.statusCode]
    } else if (p.verdict === 'down' && downStart) {
      downCodes.push(p.statusCode)
    } else if (p.verdict !== 'down' && downStart) {
      incidents.push({
        id: uuidv4(),
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        start: downStart,
        end: p.timestamp,
        resolved: true,
        durationMs: new Date(p.timestamp).getTime() - new Date(downStart).getTime(),
      })
      downStart = null
      downCodes = []
    }
  }
  if (downStart) {
    incidents.push({
      id: uuidv4(),
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      start: downStart,
      end: null,
      resolved: false,
      durationMs: Date.now() - new Date(downStart).getTime(),
    })
  }
  return incidents
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
function rand(min, max) {
  return Math.random() * (max - min) + min
}

const SEED_ENDPOINTS = [
  { name: 'API Gateway', url: 'https://api.github.com', expectedStatus: 200, interval: 60, profile: 'healthy', baseRt: 180 },
  { name: 'Auth Service', url: 'https://httpstat.us/200', expectedStatus: 200, interval: 60, profile: 'healthy', baseRt: 240 },
  { name: 'Payments API', url: 'https://httpstat.us/503', expectedStatus: 200, interval: 60, profile: 'down', baseRt: 900 },
  { name: 'Search Service', url: 'https://httpstat.us/200?sleep=1500', expectedStatus: 200, interval: 120, profile: 'degraded', baseRt: 1400 },
  { name: 'CDN Edge', url: 'https://www.cloudflare.com', expectedStatus: 200, interval: 60, profile: 'healthy', baseRt: 120 },
]

function genPing(endpointId, ts, profile, baseRt, forceDown) {
  let verdict = 'up'
  let statusCode = 200
  let responseTime = Math.round(baseRt + rand(-40, 80))
  const roll = Math.random()
  if (forceDown) {
    verdict = 'down'
    statusCode = 503
    responseTime = Math.round(baseRt + rand(200, 1200))
  } else if (profile === 'healthy') {
    if (roll > 0.97) {
      verdict = 'degraded'
      responseTime = Math.round(baseRt + rand(900, 1600))
    }
  } else if (profile === 'degraded') {
    if (roll > 0.92) {
      verdict = 'down'
      statusCode = 502
      responseTime = Math.round(baseRt + rand(400, 1500))
    } else if (roll > 0.45) {
      verdict = 'degraded'
      responseTime = Math.round(baseRt + rand(200, 900))
    } else {
      responseTime = Math.round(baseRt - rand(200, 500))
    }
  } else if (profile === 'down') {
    if (roll > 0.35) {
      verdict = 'down'
      statusCode = 503
      responseTime = Math.round(baseRt + rand(100, 800))
    } else if (roll > 0.15) {
      verdict = 'degraded'
      responseTime = Math.round(baseRt + rand(100, 600))
    } else {
      verdict = 'up'
      responseTime = Math.round(baseRt - rand(100, 400))
    }
  }
  if (responseTime < 30) responseTime = Math.round(30 + rand(0, 40))
  return {
    id: uuidv4(),
    endpointId,
    timestamp: ts,
    statusCode,
    responseTime,
    verdict,
  }
}

async function runSeed(db) {
  const endpoints = []
  const pings = []
  const now = Date.now()
  const STEP = 2 * 60 * 60 * 1000 // 2h spacing
  const COUNT = 360 // 30 days of history
  for (const def of SEED_ENDPOINTS) {
    const ep = {
      id: uuidv4(),
      name: def.name,
      url: def.url,
      expectedStatus: def.expectedStatus,
      interval: def.interval,
      createdAt: new Date(now - COUNT * STEP),
    }
    endpoints.push(ep)
    for (let i = COUNT; i >= 0; i--) {
      const ts = new Date(now - i * STEP)
      // For the 'down' profile inject a clear recent outage window (last ~18h)
      const forceDown = def.profile === 'down' && i <= 9 && i >= 1
      pings.push(genPing(ep.id, ts, def.profile, def.baseRt, forceDown))
    }
  }
  await db.collection('endpoints').insertMany(endpoints)
  await db.collection('pings').insertMany(pings)
  return endpoints.length
}

// ---------------------------------------------------------------------------
// SVG Badge
// ---------------------------------------------------------------------------
function badgeSvg(label, status, color) {
  const labelW = 6.5 * label.length + 20
  const statusW = 6.5 * status.length + 20
  const total = labelW + statusW
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${status}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#1B102D"/>
    <rect x="${labelW}" width="${statusW}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="14">${label}</text>
    <text x="${labelW + statusW / 2}" y="14">${status}</text>
  </g>
</svg>`
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'StatusPulse API' }))
    }

    // ----- SEED -----
    if (route === '/seed' && method === 'POST') {
      const existing = await db.collection('endpoints').countDocuments()
      if (existing > 0) {
        return handleCORS(NextResponse.json({ seeded: false, message: 'Already has data', count: existing }))
      }
      const count = await runSeed(db)
      return handleCORS(NextResponse.json({ seeded: true, count }))
    }

    // ----- RESET (re-seed) -----
    if (route === '/reset' && method === 'POST') {
      await db.collection('endpoints').deleteMany({})
      await db.collection('pings').deleteMany({})
      const count = await runSeed(db)
      return handleCORS(NextResponse.json({ reset: true, count }))
    }

    // ----- ENDPOINTS collection -----
    if (route === '/endpoints' && method === 'GET') {
      const eps = await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()
      return handleCORS(NextResponse.json(eps.map(clean)))
    }

    if (route === '/endpoints' && method === 'POST') {
      const body = await request.json()
      if (!body.name || !body.url) {
        return handleCORS(NextResponse.json({ error: 'name and url are required' }, { status: 400 }))
      }
      const ep = {
        id: uuidv4(),
        name: body.name,
        url: body.url,
        expectedStatus: Number(body.expectedStatus) || 200,
        interval: Number(body.interval) || 60,
        createdAt: new Date(),
      }
      await db.collection('endpoints').insertOne({ ...ep })
      // fire an immediate ping (best-effort)
      pingOne(db, ep).catch(() => {})
      return handleCORS(NextResponse.json(ep))
    }

    // ----- single endpoint operations: /endpoints/:id ... -----
    if (path[0] === 'endpoints' && path[1]) {
      const id = path[1]

      // /endpoints/:id/pings
      if (path[2] === 'pings' && method === 'GET') {
        const url = new URL(request.url)
        const limit = Number(url.searchParams.get('limit')) || 30
        const pings = await db
          .collection('pings')
          .find({ endpointId: id })
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray()
        return handleCORS(NextResponse.json(pings.map(clean).reverse()))
      }

      if (method === 'PUT') {
        const body = await request.json()
        const update = {}
        if (body.name !== undefined) update.name = body.name
        if (body.url !== undefined) update.url = body.url
        if (body.expectedStatus !== undefined) update.expectedStatus = Number(body.expectedStatus)
        if (body.interval !== undefined) update.interval = Number(body.interval)
        await db.collection('endpoints').updateOne({ id }, { $set: update })
        const updated = await db.collection('endpoints').findOne({ id })
        return handleCORS(NextResponse.json(clean(updated)))
      }

      if (method === 'DELETE') {
        await db.collection('endpoints').deleteOne({ id })
        await db.collection('pings').deleteMany({ endpointId: id })
        return handleCORS(NextResponse.json({ deleted: true, id }))
      }
    }

    // ----- PING ALL (scheduler) -----
    if (route === '/ping-all' && method === 'POST') {
      const eps = await db.collection('endpoints').find({}).toArray()
      const results = await Promise.allSettled(eps.map((ep) => pingOne(db, clean(ep))))
      const pinged = results.filter((r) => r.status === 'fulfilled' && r.value).length
      return handleCORS(NextResponse.json({ pinged, total: eps.length }))
    }

    // ----- PING ONE -----
    if (path[0] === 'ping' && path[1] && method === 'POST') {
      const ep = await db.collection('endpoints').findOne({ id: path[1] })
      if (!ep) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      const result = await pingOne(db, clean(ep))
      return handleCORS(NextResponse.json({ ping: result, skipped: !result }))
    }

    // ----- DASHBOARD -----
    if (route === '/dashboard' && method === 'GET') {
      const eps = (await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()).map(clean)
      const data = []
      let healthy = 0
      for (const ep of eps) {
        const recent = (
          await db.collection('pings').find({ endpointId: ep.id }).sort({ timestamp: -1 }).limit(30).toArray()
        )
          .map(clean)
          .reverse()
        const all24 = (
          await db
            .collection('pings')
            .find({ endpointId: ep.id, timestamp: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } })
            .toArray()
        ).map(clean)
        const latest = recent.length ? recent[recent.length - 1] : null
        const verdict = latest ? latest.verdict : 'unknown'
        if (verdict === 'up') healthy++
        data.push({
          ...ep,
          latest,
          verdict,
          pings: recent,
          uptime24h: uptimePct(all24.length ? all24 : recent, 24 * 3600 * 1000),
          avgResponseTime: recent.length
            ? Math.round(recent.reduce((a, b) => a + b.responseTime, 0) / recent.length)
            : null,
        })
      }
      return handleCORS(
        NextResponse.json({ endpoints: data, health: { healthy, total: eps.length } })
      )
    }

    // ----- PUBLIC STATUS -----
    if (route === '/status' && method === 'GET') {
      const eps = (await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()).map(clean)
      const data = []
      let allIncidents = []
      let healthy = 0
      for (const ep of eps) {
        const pings = (
          await db
            .collection('pings')
            .find({ endpointId: ep.id, timestamp: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } })
            .sort({ timestamp: 1 })
            .toArray()
        ).map(clean)
        const latest = pings.length ? pings[pings.length - 1] : null
        const verdict = latest ? latest.verdict : 'unknown'
        if (verdict === 'up') healthy++
        data.push({
          id: ep.id,
          name: ep.name,
          url: ep.url,
          verdict,
          uptime: {
            h24: uptimePct(pings, 24 * 3600 * 1000),
            d7: uptimePct(pings, 7 * 24 * 3600 * 1000),
            d30: uptimePct(pings, 30 * 24 * 3600 * 1000),
          },
        })
        allIncidents = allIncidents.concat(buildIncidents(ep, pings))
      }
      allIncidents.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      const overall =
        eps.length === 0
          ? 'unknown'
          : data.some((d) => d.verdict === 'down')
          ? 'down'
          : data.some((d) => d.verdict === 'degraded')
          ? 'degraded'
          : 'up'
      return handleCORS(
        NextResponse.json({
          endpoints: data,
          incidents: allIncidents.slice(0, 30),
          overall,
          health: { healthy, total: eps.length },
          updatedAt: new Date(),
        })
      )
    }

    // ----- SVG BADGE -----
    if (path[0] === 'badge' && path[1] && method === 'GET') {
      const ep = await db.collection('endpoints').findOne({ id: path[1] })
      const colors = { up: '#34D399', degraded: '#FBBF24', down: '#F87171', unknown: '#9CA3AF' }
      let status = 'unknown'
      let label = 'status'
      if (ep) {
        label = ep.name.toLowerCase().replace(/\s+/g, ' ')
        const latest = await db.collection('pings').find({ endpointId: ep.id }).sort({ timestamp: -1 }).limit(1).toArray()
        status = latest.length ? latest[0].verdict : 'unknown'
      }
      const svg = badgeSvg(label, status, colors[status] || colors.unknown)
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
