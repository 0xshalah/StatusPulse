import { NextRequest } from 'next/server'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await M.connect()
    const detail = await M.getEndpointDetail(db, id)
    if (!detail) return apiError(new Error('Endpoint not found'), 404)
    return apiSuccess(detail)
  } catch (error) {
    return apiError(error)
  }
}
