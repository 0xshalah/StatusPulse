import { NextRequest } from 'next/server'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST() {
  try {
    const db = await M.connect()
    return apiSuccess(await M.seedIfEmpty(db))
  } catch (error) {
    return apiError(error)
  }
}
