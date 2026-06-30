import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const subscribeSchema = z.object({
  email: z.string().email('Valid email required').transform((v) => v.replace(/<[^>]*>/g, '').trim()),
})

export async function POST(request: NextRequest) {
  try {
    const { email } = subscribeSchema.parse(await request.json())
    const db = await M.connect()
    await db.collection('subscribers').updateOne({ email }, { $set: { email, subscribedAt: new Date() } }, { upsert: true })
    return apiSuccess({ subscribed: true })
  } catch (error) {
    return apiError(error)
  }
}
