import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const maintenanceSchema = z.object({ maintenance: z.boolean() })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { maintenance } = maintenanceSchema.parse(await request.json().catch(() => ({})))
    const db = await M.connect()
    await db.collection('endpoints').updateOne({ id }, { $set: { status: maintenance ? 'maintenance' : 'active' } })
    return apiSuccess({ id, maintenance })
  } catch (error) {
    return apiError(error)
  }
}
