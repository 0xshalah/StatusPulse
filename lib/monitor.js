import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

let client
let db
export async function connect() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

const inFlight = new Set()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const clean = (d) => {
  if (!d) return d
  const { _id, ...rest } = d
  return rest
}

import { CONFIG } from './config'

/* ----------------------------- PING + RETRY ------------------------------ */
export async function pingWithRetry(ep) {
  const backoffs = CONFIG.ping.retryBackoff
  let last = { statusCode: 0, responseTime: 0, errored: true, attempts: 0, contentMismatch: false }
  for (let i = 0; i < CONFIG.ping.maxAttempts; i++) {
    if (backoffs[i]) await sleep(backoffs[i])
    const start = Date.now()
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), CONFIG.ping.timeoutMs)
      const r = await fetch(ep.url, { signal: c.signal, redirect: 'follow', headers: { 'User-Agent': 'StatusPulse/1.0 (+monitor)' } })
      clearTimeout(t)
      const responseTime = Date.now() - start
      // Content verification: explicit match OR heuristic error detection
      let contentMismatch = false
      if (r.status === ep.expectedStatus) {
        try {
          const text = await r.text()
          // If user set expectedContent, check exact match
          if (ep.expectedContent) {
            contentMismatch = !text.includes(ep.expectedContent)
          } else {
            // Heuristic: detect common error/hosting pages that return 200
            const lower = text.toLowerCase()
            const errorIndicators = [
              /<title>.*(error|maintenance|unavailable|suspended|not found|parked).*<\/title>/i,
              /error establishing a database connection/i,
              /fatal error/i,
              /service unavailable/i,
              /under maintenance/i,
              /account suspended/i,
              /bandwidth limit exceeded/i,
              /this site is currently unavailable/i,
              /\b(stack trace|exception|fatal|panic|segfault)\b/i,
              /site not found/i,
              /no such app/i,
              /deployment not found/i,
              /there isn't a github pages site here/i,
              /nothing here/i,
              /domain does not exist/i,
              /this domain has been parked/i,
            ]
            // Also flag suspiciously small responses (<100 bytes = likely error/default page)
            const isTinyResponse = text.trim().length < 100
            contentMismatch = isTinyResponse || errorIndicators.some(p => p.test(lower))
          }
        } catch { /* can't read body, skip check */ }
      }
      last = { statusCode: r.status, responseTime, errored: false, attempts: i + 1, contentMismatch }
      if (r.status === ep.expectedStatus && !contentMismatch) return last
    } catch (e) {
      last = { statusCode: 0, responseTime: Date.now() - start, errored: true, attempts: i + 1, contentMismatch: false }
    }
  }
  return last
}

export async function getSettings(db) {
  const s = await db.collection('settings').findOne({ _id: 'global' }) || {}
  return {
    slackWebhookUrl: s.slackWebhookUrl || '',
    discordWebhookUrl: s.discordWebhookUrl || '',
    notifyOnDown: s.notifyOnDown !== false,
    notifyOnDegraded: s.notifyOnDegraded !== false,
    notifyOnRecovery: s.notifyOnRecovery !== false,
  }
}

export async function updateSettings(db, updates) {
  const set = {}
  if (updates.slackWebhookUrl !== undefined) set.slackWebhookUrl = updates.slackWebhookUrl
  if (updates.discordWebhookUrl !== undefined) set.discordWebhookUrl = updates.discordWebhookUrl
  if (updates.notifyOnDown !== undefined) set.notifyOnDown = updates.notifyOnDown
  if (updates.notifyOnDegraded !== undefined) set.notifyOnDegraded = updates.notifyOnDegraded
  if (updates.notifyOnRecovery !== undefined) set.notifyOnRecovery = updates.notifyOnRecovery
  if (Object.keys(set).length === 0) return await getSettings(db)
  await db.collection('settings').updateOne({ _id: 'global' }, { $set: set }, { upsert: true })
  return await getSettings(db)
}

async function sendNotifications(db, ep, verdict, prevVerdict) {
  const settings = await getSettings(db)
  const hasSlack = !!settings.slackWebhookUrl
  const hasDiscord = !!settings.discordWebhookUrl
  if (!hasSlack && !hasDiscord) return null
  const emoji = verdict === 'up' ? ':large_green_circle:' : verdict === 'degraded' ? ':large_yellow_circle:' : ':red_circle:'
  let slackText = '', discordText = ''
  if (verdict === 'up' && prevVerdict !== 'up' && settings.notifyOnRecovery) {
    slackText = `${emoji} *${ep.name}* is back up\n<${ep.url}|${ep.url}> has recovered.`
    discordText = `${emoji} **${ep.name}** is back up\n${ep.url} has recovered.`
  } else if (verdict === 'down' && prevVerdict !== 'down' && settings.notifyOnDown) {
    slackText = `${emoji} *${ep.name}* is DOWN\n<${ep.url}|${ep.url}> is not responding.`
    discordText = `${emoji} **${ep.name}** is DOWN\n${ep.url} is not responding.`
  } else if (verdict === 'degraded' && prevVerdict === 'up' && settings.notifyOnDegraded) {
    slackText = `${emoji} *${ep.name}* is DEGRADED\n<${ep.url}|${ep.url}> is responding slowly.`
    discordText = `${emoji} **${ep.name}** is DEGRADED\n${ep.url} is responding slowly.`
  } else return null
  const promises = []
  if (hasSlack && slackText) {
    promises.push(fetch(settings.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: slackText }),
    }).catch(() => {}))
  }
  if (hasDiscord && discordText) {
    promises.push(fetch(settings.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: discordText }),
    }).catch(() => {}))
  }
  if (promises.length === 0) return null
  await Promise.allSettled(promises)
  return { sent: true }
}

export async function recordPing(db, ep, result) {
  const prevVerdict = ep.lastVerdict || 'unknown'
  const failed = result.errored || result.statusCode !== ep.expectedStatus || result.contentMismatch
  let consecutive = ep.consecutiveFailures || 0
  consecutive = failed ? consecutive + 1 : 0
  let verdict
  if (failed) verdict = consecutive >= 3 ? 'down' : 'degraded'
  else verdict = result.responseTime > CONFIG.ping.degradedThresholdMs ? 'degraded' : 'up'
  const ping = {
    id: uuidv4(),
    endpointId: ep.id,
    timestamp: new Date(),
    statusCode: result.statusCode,
    responseTime: result.responseTime,
    verdict,
    attempts: result.attempts || 1,
  }
  await db.collection('pings').insertOne({ ...ping })
  await db.collection('endpoints').updateOne(
    { id: ep.id },
    { $set: { consecutiveFailures: consecutive, lastVerdict: verdict, lastPingAt: ping.timestamp } }
  )
  if (verdict !== prevVerdict) {
    sendNotifications(db, ep, verdict, prevVerdict).catch(() => {})
  }
  return ping
}

async function pingAndRecord(db, ep) {
  if (inFlight.has(ep.id)) return null
  inFlight.add(ep.id)
  try {
    const result = await pingWithRetry(ep)
    return await recordPing(db, ep, result)
  } finally {
    inFlight.delete(ep.id)
  }
}

/* ---------- Interval-aware, distributed-safe scheduler tick ------------- */
export async function runDueChecks(db) {
  const now = Date.now()
  const eps = await db.collection('endpoints').find({ paused: { $ne: true }, status: { $ne: 'maintenance' } }).toArray()
  const due = []
  for (const ep of eps) {
    const intervalMs = (ep.interval || 60) * 1000
    // atomic lock: only one invocation wins the due slot
    const won = await db.collection('endpoints').findOneAndUpdate(
      {
        id: ep.id,
        $or: [{ nextPingAt: { $exists: false } }, { nextPingAt: null }, { nextPingAt: { $lte: new Date(now) } }],
      },
      { $set: { nextPingAt: new Date(now + intervalMs) } },
      { returnDocument: 'after' }
    )
    if (won) due.push(clean(ep))
  }
  await Promise.allSettled(due.map((e) => pingAndRecord(db, e)))
  return { due: due.length, total: eps.length }
}

export async function pingOneNow(db, id) {
  const ep = await db.collection('endpoints').findOne({ id })
  if (!ep) return null
  const result = await pingWithRetry(clean(ep))
  return await recordPing(db, clean(ep), result)
}

export async function testUrl(url, expectedStatus = 200) {
  const result = await pingWithRetry({ url, expectedStatus: Number(expectedStatus) })
  const failed = result.errored || result.statusCode !== Number(expectedStatus)
  const verdict = failed ? (result.errored ? 'down' : 'degraded') : result.responseTime > CONFIG.ping.degradedThresholdMs ? 'degraded' : 'up'
  return { ...result, verdict }
}

/* ------------------------------- ANALYTICS ------------------------------- */
export function uptimePct(pings, windowMs) {
  const since = Date.now() - windowMs
  const w = pings.filter((p) => new Date(p.timestamp).getTime() >= since)
  if (!w.length) return null
  const ok = w.filter((p) => p.verdict !== 'down').length
  return Math.round((ok / w.length) * 1000) / 10
}

export function percentile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return Math.round(sorted[idx])
}

export function buildIncidents(ep, pingsAsc) {
  const incidents = []
  let downStart = null
  for (const p of pingsAsc) {
    if (p.verdict === 'down' && !downStart) downStart = p.timestamp
    else if (p.verdict !== 'down' && downStart) {
      incidents.push({
        id: uuidv4(),
        endpointId: ep.id,
        endpointName: ep.name,
        start: downStart,
        end: p.timestamp,
        resolved: true,
        durationMs: new Date(p.timestamp).getTime() - new Date(downStart).getTime(),
      })
      downStart = null
    }
  }
  if (downStart)
    incidents.push({
      id: uuidv4(),
      endpointId: ep.id,
      endpointName: ep.name,
      start: downStart,
      end: null,
      resolved: false,
      durationMs: Date.now() - new Date(downStart).getTime(),
    })
  return incidents
}

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10)
}

export async function buildRollups(db) {
  const eps = await db.collection('endpoints').find({}).toArray()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  for (const ep of eps) {
    const pings = await db.collection('pings').find({ endpointId: ep.id, timestamp: { $gte: since } }).toArray()
    const byDay = {}
    for (const p of pings) {
      const k = dayKey(p.timestamp)
      ;(byDay[k] ||= []).push(p)
    }
    for (const [date, arr] of Object.entries(byDay)) {
      const total = arr.length
      const up = arr.filter((p) => p.verdict === 'up').length
      const degraded = arr.filter((p) => p.verdict === 'degraded').length
      const down = arr.filter((p) => p.verdict === 'down').length
      const uptime = Math.round(((total - down) / total) * 1000) / 10
      const avgLatency = Math.round(arr.reduce((a, b) => a + b.responseTime, 0) / total)
      await db.collection('rollups').updateOne(
        { endpointId: ep.id, date },
        { $set: { endpointId: ep.id, date, total, up, degraded, down, uptime, avgLatency } },
        { upsert: true }
      )
    }
  }
  return { rollups: true }
}

/* --------------------------- VIEW BUILDERS ------------------------------- */
function displayVerdict(ep, latest) {
  if (ep.paused) return 'paused'
  if (ep.status === 'maintenance') return 'maintenance'
  return latest ? latest.verdict : ep.lastVerdict || 'unknown'
}

export async function getDashboard(db) {
  const eps = (await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()).map(clean)
  if (eps.length === 0) return { endpoints: [], health: { up: 0, degraded: 0, down: 0, maintenance: 0, paused: 0, healthy: 0, total: 0 } }
  const epIds = eps.map((e) => e.id)
  const allPings = (await db.collection('pings').find({ endpointId: { $in: epIds } }).sort({ timestamp: -1 }).toArray()).map(clean)
  const pingsByEp = {}
  for (const p of allPings) {
    if (!pingsByEp[p.endpointId]) pingsByEp[p.endpointId] = []
    if (pingsByEp[p.endpointId].length < 30) pingsByEp[p.endpointId].push(p)
  }
  const data = []
  const health = { up: 0, degraded: 0, down: 0, maintenance: 0, paused: 0, total: eps.length }
  for (const ep of eps) {
    const recent = (pingsByEp[ep.id] || []).reverse()
    const latest = recent.length ? recent[recent.length - 1] : null
    const verdict = displayVerdict(ep, latest)
    if (health[verdict] !== undefined) health[verdict]++
    data.push({
      ...ep,
      latest,
      verdict,
      pings: recent,
      uptime24h: uptimePct(recent, 24 * 3600 * 1000),
      avgResponseTime: recent.length ? Math.round(recent.reduce((a, b) => a + b.responseTime, 0) / recent.length) : null,
    })
  }
  health.healthy = health.up + health.degraded
  return { endpoints: data, health }
}

export async function getStatus(db) {
  const eps = (await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()).map(clean)
  if (eps.length === 0) return { endpoints: [], incidents: [], overall: 'unknown', health: { healthy: 0, total: 0 }, updatedAt: new Date() }
  const epIds = eps.map((e) => e.id)
  const since48h = new Date(Date.now() - 48 * 3600 * 1000)
  const [allRollups, allRecent] = await Promise.all([
    db.collection('rollups').find({ endpointId: { $in: epIds } }).sort({ date: 1 }).toArray().then((r) => r.map(clean)),
    db.collection('pings').find({ endpointId: { $in: epIds }, timestamp: { $gte: since48h } }).sort({ timestamp: 1 }).toArray().then((r) => r.map(clean)),
  ])
  const rollupsByEp = {}, pingsByEp = {}
  for (const r of allRollups) { (rollupsByEp[r.endpointId] ||= []).push(r) }
  for (const p of allRecent) { (pingsByEp[p.endpointId] ||= []).push(p) }
  const data = []
  let incidents = []
  let healthy = 0
  for (const ep of eps) {
    const rollups = rollupsByEp[ep.id] || []
    const recent = pingsByEp[ep.id] || []
    const latest = recent.length ? recent[recent.length - 1] : null
    const verdict = displayVerdict(ep, latest)
    if (verdict === 'up' || verdict === 'degraded') healthy++
    const map = {}
    rollups.forEach((r) => (map[r.date] = r.uptime))
    const heatmap = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)
      heatmap.push({ date: d, uptime: map[d] === undefined ? null : map[d] })
    }
    const totalRoll = rollups.reduce((a, r) => a + r.total, 0)
    const downRoll = rollups.reduce((a, r) => a + r.down, 0)
    const d30 = totalRoll ? Math.round(((totalRoll - downRoll) / totalRoll) * 1000) / 10 : uptimePct(recent, 30 * 24 * 3600 * 1000)
    const last7 = rollups.filter((r) => new Date(r.date).getTime() >= Date.now() - 7 * 24 * 3600 * 1000)
    const t7 = last7.reduce((a, r) => a + r.total, 0)
    const dn7 = last7.reduce((a, r) => a + r.down, 0)
    const d7 = t7 ? Math.round(((t7 - dn7) / t7) * 1000) / 10 : uptimePct(recent, 7 * 24 * 3600 * 1000)
    data.push({
      id: ep.id,
      name: ep.name,
      url: ep.url,
      verdict,
      heatmap,
      uptime: { h24: uptimePct(recent, 24 * 3600 * 1000), d7, d30 },
    })
    incidents = incidents.concat(buildIncidents(ep, recent))
  }
  incidents.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
  const overall =
    eps.length === 0 ? 'unknown' : data.some((d) => d.verdict === 'down') ? 'down' : data.some((d) => d.verdict === 'degraded') ? 'degraded' : 'up'
  return { endpoints: data, incidents: incidents.slice(0, 30), overall, health: { healthy, total: eps.length }, updatedAt: new Date() }
}

export async function getEndpointDetail(db, id) {
  const ep = await db.collection('endpoints').findOne({ id })
  if (!ep) return null
  const cleanEp = clean(ep)
  const history = (await db.collection('pings').find({ endpointId: id, timestamp: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }).sort({ timestamp: 1 }).toArray()).map(clean)
  const last200 = (await db.collection('pings').find({ endpointId: id }).sort({ timestamp: -1 }).limit(200).toArray()).map(clean)
  const rts = last200.map((p) => p.responseTime)
  const rollups = (await db.collection('rollups').find({ endpointId: id }).sort({ date: 1 }).toArray()).map(clean)
  const map = {}
  rollups.forEach((r) => (map[r.date] = r))
  const heatmap = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)
    heatmap.push({ date: d, uptime: map[d] ? map[d].uptime : null, avgLatency: map[d] ? map[d].avgLatency : null })
  }
  const latest = last200.length ? last200[0] : null
  return {
    endpoint: cleanEp,
    verdict: displayVerdict(cleanEp, latest),
    history,
    heatmap,
    incidents: buildIncidents(cleanEp, [...last200].reverse()).slice(0, 20),
    percentiles: { p50: percentile(rts, 50), p95: percentile(rts, 95), p99: percentile(rts, 99) },
    uptime: {
      h24: uptimePct(last200, 24 * 3600 * 1000),
      d7: uptimePct(last200, 7 * 24 * 3600 * 1000),
      d30: uptimePct(last200, 30 * 24 * 3600 * 1000),
    },
  }
}

/* -------------------------------- SEED ----------------------------------- */
function rand(min, max) {
  return Math.random() * (max - min) + min
}
const SEED = [
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
    } else responseTime = Math.round(baseRt - rand(200, 500))
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
  return { id: uuidv4(), endpointId, timestamp: ts, statusCode, responseTime, verdict, attempts: 1 }
}
export async function runSeed(db) {
  const endpoints = []
  const pings = []
  const now = Date.now()
  const STEP = 2 * 60 * 60 * 1000
  const COUNT = 360
  for (const def of SEED) {
    const ep = {
      id: uuidv4(),
      name: def.name,
      url: def.url,
      expectedStatus: def.expectedStatus,
      interval: def.interval,
      paused: false,
      status: 'active',
      consecutiveFailures: 0,
      nextPingAt: new Date(now),
      createdAt: new Date(now - COUNT * STEP),
    }
    let lastVerdict = 'up'
    for (let i = COUNT; i >= 0; i--) {
      const ts = new Date(now - i * STEP)
      const forceDown = def.profile === 'down' && i <= 9 && i >= 1
      const p = genPing(ep.id, ts, def.profile, def.baseRt, forceDown)
      pings.push(p)
      lastVerdict = p.verdict
    }
    ep.lastVerdict = lastVerdict
    endpoints.push(ep)
  }
  await db.collection('endpoints').insertMany(endpoints)
  await db.collection('pings').insertMany(pings)
  await buildRollups(db)
  return endpoints.length
}
export async function seedIfEmpty(db) {
  const n = await db.collection('endpoints').countDocuments()
  if (n > 0) return { seeded: false, count: n }
  const count = await runSeed(db)
  return { seeded: true, count }
}
export async function resetData(db) {
  await db.collection('endpoints').deleteMany({})
  await db.collection('pings').deleteMany({})
  await db.collection('rollups').deleteMany({})
  const count = await runSeed(db)
  return { reset: true, count }
}

/* -------------------------------- BADGE ---------------------------------- */
const BADGE_COLORS = { up: '#34D399', degraded: '#FBBF24', down: '#F87171', maintenance: '#A78BFA', paused: '#9CA3AF', unknown: '#9CA3AF' }
const CHAR_W = 6.6 // JetBrains Mono ~11px

export function buildBadge({ label, value, verdict, style = 'flat', icon = false }) {
  const color = BADGE_COLORS[verdict] || BADGE_COLORS.unknown
  const forBadge = style === 'for-the-badge'
  const lbl = forBadge ? label.toUpperCase() : label
  const val = forBadge ? String(value).toUpperCase() : String(value)
  const fs = forBadge ? 11 : 11
  const h = forBadge ? 28 : 20
  const padX = forBadge ? 14 : 10
  const iconW = icon ? 16 : 0
  const labelW = Math.round(lbl.length * CHAR_W + padX * 2 + iconW)
  const valueW = Math.round(val.length * CHAR_W + padX * 2)
  const total = labelW + valueW
  const rx = forBadge ? h / 2 : 3
  const grad = style === 'plastic'
    ? `<linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-opacity=".3"/><stop offset="1" stop-opacity=".5"/></linearGradient>`
    : `<linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`
  const dot = icon
    ? `<circle cx="${padX + 4}" cy="${h / 2}" r="4" fill="${color}"/>`
    : ''
  const labelTextX = (labelW + iconW) / 2 + (icon ? 4 : 0)
  const weight = forBadge ? 'font-weight="bold"' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${h}" role="img" aria-label="${lbl}: ${val}">
  ${grad}
  <clipPath id="r"><rect width="${total}" height="${h}" rx="${rx}" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="${h}" fill="#1B102D"/>
    <rect x="${labelW}" width="${valueW}" height="${h}" fill="${color}"/>
    <rect width="${total}" height="${h}" fill="url(#g)"/>
  </g>
  ${dot}
  <g fill="#fff" text-anchor="middle" font-family="JetBrains Mono,Verdana,DejaVu Sans,monospace" font-size="${fs}" ${weight}>
    <text x="${labelTextX}" y="${h - (forBadge ? 10 : 6)}">${lbl}</text>
    <text x="${labelW + valueW / 2}" y="${h - (forBadge ? 10 : 6)}" fill="#1B102D">${val}</text>
  </g>
</svg>`
}

export async function badgeForEndpoint(db, id, { style, metric, icon }) {
  const ep = await db.collection('endpoints').findOne({ id })
  if (!ep) return buildBadge({ label: 'status', value: 'unknown', verdict: 'unknown', style, icon })
  const cleanEp = clean(ep)
  const recent = (await db.collection('pings').find({ endpointId: id }).sort({ timestamp: -1 }).limit(30).toArray()).map(clean)
  const verdict = displayVerdict(cleanEp, recent[0])
  const STATUS_LABEL = { up: 'up', degraded: 'degraded', down: 'down', maintenance: 'maintenance', paused: 'paused', unknown: 'unknown' }
  let label = cleanEp.name.toLowerCase()
  let value = STATUS_LABEL[verdict]
  if (metric === 'uptime') {
    const u = uptimePct(recent, 24 * 3600 * 1000)
    label = 'uptime'
    value = u === null ? 'n/a' : `${u}%`
  } else if (metric === 'response_time') {
    const rt = recent[0]?.responseTime
    label = 'response'
    value = rt === undefined ? 'n/a' : rt < 1000 ? `${rt}ms` : `${(rt / 1000).toFixed(2)}s`
  }
  return buildBadge({ label, value, verdict, style, icon })
}
