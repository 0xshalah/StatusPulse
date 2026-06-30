import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow auth routes unconditionally
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  // Public read-only endpoints — no auth required
  if (req.method === 'GET') return NextResponse.next()

  // All mutations (POST, PUT, DELETE, PATCH) require authentication
  // Bypass: if GitHub OAuth is not configured, allow all (hackathon mode)
  if (!process.env.AUTH_GITHUB_ID || !process.env.AUTH_GITHUB_SECRET) {
    return NextResponse.next()
  }

  if (!req.auth) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Bearer' },
      }
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/api/:path*'],
}
