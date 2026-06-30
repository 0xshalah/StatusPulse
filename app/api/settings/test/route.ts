import * as M from '@/lib/monitor'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST() {
  try {
    const db = await M.connect()
    const settings = await M.getSettings(db)
    if (!settings.slackWebhookUrl && !settings.discordWebhookUrl) {
      return apiError(new Error('No webhook URL configured'), 400)
    }
    const results: string[] = []
    if (settings.slackWebhookUrl) {
      try {
        await fetch(settings.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ':white_check_mark: *StatusPulse* — Webhook test successful! Your alerts are configured correctly.' }),
        })
        results.push('slack')
      } catch { results.push('slack:failed') }
    }
    if (settings.discordWebhookUrl) {
      try {
        await fetch(settings.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: ':white_check_mark: **StatusPulse** — Webhook test successful! Your alerts are configured correctly.' }),
        })
        results.push('discord')
      } catch { results.push('discord:failed') }
    }
    return apiSuccess({ sent: results })
  } catch (error) {
    return apiError(error)
  }
}
