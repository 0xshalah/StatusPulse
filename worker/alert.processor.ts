import { Job } from 'bullmq'
import { MongoClient } from 'mongodb'
import { createLogger } from '../lib/logger'

const logger = createLogger('alert')

let mongo: MongoClient | null = null

async function getMongo() {
  if (!mongo) {
    mongo = new MongoClient(process.env.DATABASE_URL!)
    await mongo.connect()
  }
  return mongo
}

export interface AlertJobData {
  endpointId: string
  endpointName: string
  endpointUrl: string
  verdict: string
  previousVerdict: string
}

export async function alertProcessor(job: Job<AlertJobData>) {
  const { endpointId, endpointName, endpointUrl, verdict, previousVerdict } = job.data

  try {
    const client = await getMongo()
    const db = client.db()
    const doc = await db.collection('settings').findOne({ _id: 'global' })

    const slackUrl = (doc?.slackWebhookUrl as string) || ''
    const discordUrl = (doc?.discordWebhookUrl as string) || ''
    const notifyOnDown = doc?.notifyOnDown !== false
    const notifyOnDegraded = doc?.notifyOnDegraded !== false
    const notifyOnRecovery = doc?.notifyOnRecovery !== false

    let shouldNotify = false
    if (verdict === 'up' && previousVerdict !== 'up' && notifyOnRecovery) shouldNotify = true
    else if (verdict === 'down' && previousVerdict !== 'down' && notifyOnDown) shouldNotify = true
    else if (verdict === 'degraded' && previousVerdict === 'up' && notifyOnDegraded) shouldNotify = true

    if (!shouldNotify) {
      logger.info({ endpointId, verdict, previousVerdict }, 'alert skipped')
      return { sent: false, reason: 'preferences' }
    }

    const emoji = verdict === 'up' ? ':large_green_circle:' : verdict === 'degraded' ? ':large_yellow_circle:' : ':red_circle:'
    const promises: Promise<void>[] = []

    if (slackUrl) {
      promises.push(
        fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${emoji} *${endpointName}* is ${verdict === 'up' ? 'back up' : verdict.toUpperCase()}\n<${endpointUrl}|${endpointUrl}>`,
          }),
        }).then(async (r) => {
          if (r.status === 429) {
            const retry = r.headers.get('Retry-After')
            logger.warn({ endpointId, retryAfter: retry }, 'slack rate limited')
          } else if (!r.ok) {
            throw new Error(`Slack ${r.status}`)
          } else {
            logger.info({ endpointId, verdict }, 'slack alert sent')
          }
        }).catch((err) => logger.error({ endpointId, error: err.message }, 'slack alert failed'))
      )
    }

    if (discordUrl) {
      promises.push(
        fetch(discordUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `${emoji} **${endpointName}** is ${verdict === 'up' ? 'back up' : verdict.toUpperCase()}\n${endpointUrl}`,
          }),
        }).then(async (r) => {
          if (r.status === 429) {
            const retry = r.headers.get('Retry-After') || r.headers.get('X-RateLimit-Reset-After')
            logger.warn({ endpointId, retryAfter: retry }, 'discord rate limited')
          } else if (!r.ok) {
            throw new Error(`Discord ${r.status}`)
          } else {
            logger.info({ endpointId, verdict }, 'discord alert sent')
          }
        }).catch((err) => logger.error({ endpointId, error: err.message }, 'discord alert failed'))
      )
    }

    await Promise.allSettled(promises)
    return { sent: promises.length > 0 }
  } catch (error) {
    logger.error({ endpointId, error: (error as Error).message }, 'alert processor error')
    return { sent: false, error: (error as Error).message }
  }
}
