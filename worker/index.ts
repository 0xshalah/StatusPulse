import { Queue, Worker } from 'bullmq'
import { redis } from './redis'
import { pingProcessor, type PingJobData } from './ping.processor'
import { db } from './prisma'
import { createLogger } from '../lib/logger'

const logger = createLogger('worker')

const PING_QUEUE = 'statuspulse:pings'
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

const pingWorker = new Worker<PingJobData>(PING_QUEUE, pingProcessor, {
  connection: redis,
  concurrency: 10,
})

pingWorker.on('completed', (job) => {
  logger.info({ endpointId: job.data.endpointId, verdict: job.returnvalue?.verdict }, 'ping completed')
})

pingWorker.on('failed', (job, err) => {
  logger.error({ endpointId: job?.data.endpointId, error: err.message }, 'ping failed')
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
  await pingWorker.close()
  await pingQueue.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
