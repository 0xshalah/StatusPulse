import { Queue, Worker } from 'bullmq'
import { redis } from './redis'
import { pingProcessor, type PingJobData } from './ping.processor'
import { alertProcessor, type AlertJobData } from './alert.processor'
import { db } from './prisma'
import { createLogger } from '../lib/logger'

const logger = createLogger('worker')

const PING_QUEUE = 'statuspulse:pings'
const ALERT_QUEUE = 'statuspulse:alerts'
const SCHEDULER_INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL || '20000', 10)

export const pingQueue = new Queue<PingJobData>(PING_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export const alertQueue = new Queue<AlertJobData>(ALERT_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

const pingWorker = new Worker<PingJobData>(PING_QUEUE, pingProcessor, {
  connection: redis,
  concurrency: 10,
})

const alertWorker = new Worker<AlertJobData>(ALERT_QUEUE, alertProcessor, {
  connection: redis,
  concurrency: 5,
})

pingWorker.on('completed', async (job) => {
  const result = job.returnvalue as { endpointId: string; verdict: string; endpointName?: string; previousVerdict?: string; skipped?: boolean }
  if (result?.skipped) return
  logger.info({ endpointId: result.endpointId, verdict: result.verdict }, 'ping completed')

  if (result.previousVerdict && result.verdict !== result.previousVerdict) {
    await alertQueue.add(`alert:${result.endpointId}`, {
      endpointId: result.endpointId,
      endpointName: result.endpointName || job.data.url,
      endpointUrl: job.data.url,
      verdict: result.verdict,
      previousVerdict: result.previousVerdict,
    })
  }
})

pingWorker.on('failed', (job, err) => {
  logger.error({ endpointId: job?.data.endpointId, error: err.message }, 'ping failed')
})

alertWorker.on('completed', (job) => {
  logger.info({ endpointId: job.data.endpointId, sent: job.returnvalue?.sent }, 'alert processed')
})

alertWorker.on('failed', (job, err) => {
  logger.error({ endpointId: job?.data.endpointId, error: err.message }, 'alert failed')
})

async function enqueueDueChecks() {
  try {
    const now = Date.now()
    const endpoints = await db.endpoint.findMany({
      where: {
        paused: { not: true },
        status: { not: 'maintenance' },
        OR: [
          { nextPingAt: null },
          { nextPingAt: { lte: new Date(now) } },
        ],
      },
    })

    for (const ep of endpoints) {
      const intervalMs = (ep.interval || 60) * 1000
      await db.endpoint.update({
        where: { id: ep.id },
        data: { nextPingAt: new Date(now + intervalMs) },
      })
      await pingQueue.add(`ping:${ep.id}`, {
        endpointId: ep.id,
        url: ep.url,
        expectedStatus: ep.expectedStatus,
        expectedContent: (ep as any).expectedContent || '',
      })
    }

    if (endpoints.length > 0) {
      logger.info({ count: endpoints.length }, 'enqueued ping jobs')
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'scheduler error')
  }
}

logger.info({ interval: SCHEDULER_INTERVAL }, 'StatusPulse worker starting')

// Initial run
enqueueDueChecks()

// Periodic scheduler
setInterval(enqueueDueChecks, SCHEDULER_INTERVAL)

// Graceful shutdown
async function shutdown() {
  logger.info('worker shutting down')
  await alertWorker.close()
  await pingWorker.close()
  await alertQueue.close()
  await pingQueue.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
