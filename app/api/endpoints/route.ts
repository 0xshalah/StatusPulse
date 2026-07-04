import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@/auth'
import * as M from '@/lib/monitor'
import { createEndpointSchema } from '@/lib/validations/endpoint'
import { apiSuccess, apiError } from '@/lib/api-response'
import { auditLog, auditError } from '@/lib/audit'

export async function GET() {
  // Require auth — endpoint URLs are sensitive internal data
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const db = await M.connect()
    const endpoints = await db.collection('endpoints').find({}).sort({ createdAt: 1 }).toArray()
    const res = apiSuccess(endpoints.map(M.clean))
    res.headers.set('Cache-Control', 'public, max-age=5, s-maxage=5, stale-while-revalidate=10')
    return res
  } catch (error) {
    return apiError(error)
  }
}

async function requireAuth() {
  // Hackathon/demo mode: allow if GitHub OAuth is not configured
  if (!process.env.AUTH_GITHUB_ID || !process.env.AUTH_GITHUB_SECRET) {
    return null
  }
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

export async function POST(request: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const body = await request.json()
    const parsed = createEndpointSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error)

    const { name, url, expectedStatus, interval } = parsed.data
    const db = await M.connect()

    const ep = {
      id: uuidv4(),
      name,
      url,
      expectedStatus,
      interval,
      paused: false,
      status: 'active',
      consecutiveFailures: 0,
      nextPingAt: new Date(),
      createdAt: new Date(),
    }

    await db.collection('endpoints').insertOne({ ...ep })
    M.pingOneNow(db, ep.id).catch(() => {})
    auditLog('endpoint.created', { endpointId: ep.id, name, url })

    return apiSuccess(ep, 201)
  } catch (error) {
    auditError('endpoint.create_failed', error)
    return apiError(error)
  }
}
