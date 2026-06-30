import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function apiError(error: unknown, status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
      { status: 400 }
    )
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  console.error('API Error:', message)
  return NextResponse.json(
    { error: process.env.NODE_ENV === 'development' ? message : 'Internal server error' },
    { status }
  )
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
