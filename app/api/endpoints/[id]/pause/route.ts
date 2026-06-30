import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const pauseSchema = z.object({ paused: z.boolean() })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { paused } = pauseSchema.parse(await request.json().catch(() => ({})))
    const db = await M.connect()
    await db.collection('endpoints').updateOne({ id }, { $set: { paused } })
    return apiSuccess({ id, paused })
  } catch (error) {
    return apiError(error)
  }
}
