import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow auth routes
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  // Allow public GET requests (dashboard, status, badge, endpoint list)
  if (req.method === 'GET') return NextResponse.next()

  // Block unauthenticated mutations (POST, PUT, DELETE, PATCH)
  if (!req.auth) {
    return NextResponse.json(
      { error: 'Authentication required for this operation' },
      { status: 401 }
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/api/:path*'],
}
