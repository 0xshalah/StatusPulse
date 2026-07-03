import { auth } from '@/auth'
import { NextResponse } from 'next/server'

/**
 * Protected routes — sensitive data that requires authentication even for GET.
 * Public routes: health, status page, badge, config are intentionally open.
 */
const PROTECTED_GET_PATHS = [
  '/api/endpoints',
  '/api/dashboard',
  '/api/settings',
  '/api/sse/status',
  '/api/ai/analytics',
  '/api/admin',
  '/api/subscribe',
]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow auth routes unconditionally
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  // Public GET endpoints (intentionally open)
  const isPublicGet =
    pathname.startsWith('/api/health')
    || pathname.startsWith('/api/status')
    || pathname.startsWith('/api/badge/')
    || pathname.startsWith('/api/config')
    || pathname.startsWith('/api/wizard/')
    || pathname.startsWith('/api/sse/') && !pathname.startsWith('/api/sse/status')

  if (req.method === 'GET' && isPublicGet) {
    return NextResponse.next()
  }

  // Protected GET routes require auth
  if (req.method === 'GET') {
    const isProtected = PROTECTED_GET_PATHS.some(p => pathname.startsWith(p))
    if (isProtected && !req.auth) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // All mutations (POST, PUT, DELETE, PATCH) require authentication
  if (!req.auth) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/api/:path*'],
}
