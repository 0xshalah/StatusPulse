import { Job } from 'bullmq'
import { db } from './prisma'
import { pingWithRetry, computeVerdict } from '../lib/worker/ping-engine'

export interface PingJobData {
  endpointId: string
  url: string
  expectedStatus: number
  expectedContent?: string
}

export async function pingProcessor(job: Job<PingJobData>) {
  const { endpointId, url, expectedStatus, expectedContent } = job.data

  const ep = await db.endpoint.findUnique({ where: { id: endpointId } })
  if (!ep || ep.paused) return { skipped: true, reason: ep ? 'paused' : 'not_found' }

  const prevVerdict = ep.lastVerdict || 'unknown'
  const result = await pingWithRetry(url, expectedStatus, expectedContent || '')
  const { verdict, consecutive } = computeVerdict(result, expectedStatus, ep.consecutiveFailures)

  await db.ping.create({
    data: {
      endpointId,
      timestamp: new Date(),
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      verdict,
      attempts: result.attempts,
    },
  })

  await db.endpoint.update({
    where: { id: endpointId },
    data: {
      consecutiveFailures: consecutive,
      lastVerdict: verdict,
      lastPingAt: new Date(),
    },
  })

  return { endpointId, verdict, previousVerdict: prevVerdict, responseTime: result.responseTime, consecutive, endpointName: ep.name }
}
