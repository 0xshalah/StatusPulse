import { NextRequest } from 'next/server'
import { z } from 'zod'
import * as M from '@/lib/monitor'
import { apiError } from '@/lib/api-response'

const badgeQuerySchema = z.object({
  style: z.enum(['flat', 'plastic', 'for-the-badge']).default('flat'),
  metric: z.enum(['status', 'uptime', 'response_time']).default('status'),
  icon: z.enum(['true', 'false', '1', '0']).default('false'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const query = badgeQuerySchema.parse(Object.fromEntries(searchParams))
    const icon = query.icon === 'true' || query.icon === '1'

    const db = await M.connect()
    const svg = await M.badgeForEndpoint(db, id, {
      style: query.style,
      metric: query.metric,
      icon,
    })

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
