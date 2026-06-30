import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const checkDuplicateSchema = z.object({ url: z.string().url() })

export async function POST(request: NextRequest) {
  try {
    const { url } = checkDuplicateSchema.parse(await request.json())
    const db = await M.connect()
    const exists = await db.collection('endpoints').findOne({ url })
    return apiSuccess({ exists: !!exists })
  } catch (error) {
    return apiError(error)
  }
}
