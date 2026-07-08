import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import * as M from '@/lib/monitor'
import { updateEndpointSchema } from '@/lib/validations/endpoint'
import { apiSuccess, apiError } from '@/lib/api-response'
import { sanitize, isValidUrl } from '@/lib/security'

async function requireAuth() {
  if (!process.env.AUTH_GITHUB_ID || !process.env.AUTH_GITHUB_SECRET) return null
  const session = await auth()
  if (!session?.user) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await M.connect()
    const ep = await db.collection('endpoints').findOne({ id })
    if (!ep) return apiError(new Error('Endpoint not found'), 404)
    return apiSuccess(M.clean(ep))
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const { id } = await params
    const body = await request.json()
    // Normalize before validation
    if (body.interval !== undefined) body.interval = Math.min(3600, Math.max(10, parseInt(String(body.interval)) || 60))
    if (body.expectedStatus !== undefined) body.expectedStatus = Math.min(599, Math.max(100, parseInt(String(body.expectedStatus)) || 200))
    const parsed = updateEndpointSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error)

    const db = await M.connect()
    const existing = await db.collection('endpoints').findOne({ id })
    if (!existing) return apiError(new Error('Endpoint not found'), 404)

    const u: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) { u.name = parsed.data.name; if (u.name && (u.name as string).length > 100) return apiError(new Error('Name too long'), 400) }
    if (parsed.data.url !== undefined) { u.url = parsed.data.url }
    if (parsed.data.expectedStatus !== undefined) u.expectedStatus = Math.min(599, Math.max(100, parsed.data.expectedStatus))
    if (parsed.data.interval !== undefined) u.interval = Math.min(3600, Math.max(10, parsed.data.interval))
    if (parsed.data.paused !== undefined) u.paused = parsed.data.paused
    if (parsed.data.maintenanceStart !== undefined) u.maintenanceStart = parsed.data.maintenanceStart
    if (parsed.data.maintenanceEnd !== undefined) u.maintenanceEnd = parsed.data.maintenanceEnd
    if (parsed.data.status !== undefined) u.status = parsed.data.status

    await db.collection('endpoints').updateOne({ id }, { $set: u })
    const updated = await db.collection('endpoints').findOne({ id })
    return apiSuccess(M.clean(updated!))
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const { id } = await params
    const db = await M.connect()
    const existing = await db.collection('endpoints').findOne({ id })
    if (!existing) return apiError(new Error('Endpoint not found'), 404)

    await db.collection('endpoints').deleteOne({ id })
    await db.collection('pings').deleteMany({ endpointId: id })
    await db.collection('rollups').deleteMany({ endpointId: id })
    return apiSuccess({ deleted: true, id })
  } catch (error) {
    return apiError(error)
  }
}
