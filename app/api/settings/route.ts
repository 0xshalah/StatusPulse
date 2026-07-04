import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

const updateSettingsSchema = z.object({
  slackWebhookUrl: z.string().optional(),
  discordWebhookUrl: z.string().optional(),
  notifyOnDown: z.boolean().optional(),
  notifyOnDegraded: z.boolean().optional(),
  notifyOnRecovery: z.boolean().optional(),
})

async function requireAuth() {
  if (!process.env.AUTH_GITHUB_ID || !process.env.AUTH_GITHUB_SECRET) return null
  const session = await auth()
  if (!session?.user) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  return null
}

function maskWebhookUrl(url: string): string {
  if (!url) return ''
  // Mask webhook URLs — only show first 10 + last 5 chars
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}/***${url.slice(-5)}`
  } catch {
    return url.slice(0, 10) + '***' + url.slice(-5)
  }
}

export async function GET() {
  try {
    const db = await M.connect()
    const settings = await M.getSettings(db)
    // Mask webhook URLs in public response
    if (settings.slackWebhookUrl) {
      settings.slackWebhookUrl = maskWebhookUrl(settings.slackWebhookUrl)
    }
    if (settings.discordWebhookUrl) {
      settings.discordWebhookUrl = maskWebhookUrl(settings.discordWebhookUrl)
    }
    return apiSuccess(settings)
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const body = await request.json()
    const parsed = updateSettingsSchema.parse(body)
    const db = await M.connect()
    const updated = await M.updateSettings(db, parsed)
    // Mask in response too
    if (updated.slackWebhookUrl) updated.slackWebhookUrl = maskWebhookUrl(updated.slackWebhookUrl)
    if (updated.discordWebhookUrl) updated.discordWebhookUrl = maskWebhookUrl(updated.discordWebhookUrl)
    return apiSuccess(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new Error('Validation failed: ' + error.errors.map(e => e.message).join(', ')), 400)
    }
    return apiError(error)
  }
}
