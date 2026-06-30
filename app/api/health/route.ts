import { db } from '@/lib/db'
import { apiError } from '@/lib/api-response'

export async function GET() {
  const checks: Record<string, string> = {}

  try {
    await db.$runCommandRaw({ ping: 1 })
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')
  const status = allOk ? 200 : 503

  return new Response(
    JSON.stringify({
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    }
  )
}
