import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { updateEndpointSchema } from '@/lib/validations/endpoint'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const endpoint = await db.endpoint.findUnique({ where: { id } })
    if (!endpoint) return apiError(new Error('Endpoint not found'), 404)
    return apiSuccess(endpoint)
  } catch (error) {
    return apiError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateEndpointSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error)

    const existing = await db.endpoint.findUnique({ where: { id } })
    if (!existing) return apiError(new Error('Endpoint not found'), 404)

    const endpoint = await db.endpoint.update({
      where: { id },
      data: parsed.data,
    })
    return apiSuccess(endpoint)
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.endpoint.findUnique({ where: { id } })
    if (!existing) return apiError(new Error('Endpoint not found'), 404)

    await db.endpoint.delete({ where: { id } })
    await db.ping.deleteMany({ where: { endpointId: id } })
    return apiSuccess({ deleted: true, id })
  } catch (error) {
    return apiError(error)
  }
}
