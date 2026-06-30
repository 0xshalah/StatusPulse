import { NextRequest } from 'next/server'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await M.connect()
    const ping = await M.pingOneNow(db, id)
    if (!ping) return apiError(new Error('Endpoint not found'), 404)
    return apiSuccess({ ping })
  } catch (error) {
    return apiError(error)
  }
}
