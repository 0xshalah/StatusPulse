import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const updateSettingsSchema = z.object({
  slackWebhookUrl: z.string().optional(),
  discordWebhookUrl: z.string().optional(),
  notifyOnDown: z.boolean().optional(),
  notifyOnDegraded: z.boolean().optional(),
  notifyOnRecovery: z.boolean().optional(),
})

export async function GET() {
  try {
    const db = await M.connect()
    return apiSuccess(await M.getSettings(db))
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const updates = updateSettingsSchema.parse(body)
    const db = await M.connect()
    return apiSuccess(await M.updateSettings(db, updates))
  } catch (error) {
    return apiError(error)
  }
}
