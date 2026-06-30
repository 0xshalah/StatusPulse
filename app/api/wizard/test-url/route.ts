import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const testUrlSchema = z.object({ url: z.string().url(), expectedStatus: z.number().int().min(100).max(599).default(200) })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, expectedStatus } = testUrlSchema.parse(body)
    const result = await M.testUrl(url, expectedStatus)
    return apiSuccess(result)
  } catch (error) {
    return apiError(error)
  }
}
