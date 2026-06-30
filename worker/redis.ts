import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis = globalForRedis.redis ?? new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
