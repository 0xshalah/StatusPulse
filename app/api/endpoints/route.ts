import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createEndpointSchema } from '@/lib/validations/endpoint'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET() {
  try {
    const endpoints = await db.endpoint.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return apiSuccess(endpoints)
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createEndpointSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error)

    const { name, url, expectedStatus, interval } = parsed.data
    const endpoint = await db.endpoint.create({
      data: {
        name,
        url,
        expectedStatus,
        interval,
        nextPingAt: new Date(),
      },
    })
    return apiSuccess(endpoint, 201)
  } catch (error) {
    return apiError(error)
  }
}
