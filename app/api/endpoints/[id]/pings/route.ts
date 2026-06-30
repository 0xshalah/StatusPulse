import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = z.coerce.number().int().min(1).max(200).default(30).parse(searchParams.get('limit') || '30')
    const db = await M.connect()
    const pings = await db.collection('pings').find({ endpointId: id }).sort({ timestamp: -1 }).limit(limit).toArray()
    return apiSuccess(pings.map(M.clean).reverse())
  } catch (error) {
    return apiError(error)
  }
}
