import { auth } from '@/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import * as M from '@/lib/monitor'

export async function GET() {
  // Require auth — dashboard contains full endpoint data + ping history
  // Hackathon mode: allow if GitHub OAuth is not configured
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    const session = await auth()
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const db = await M.connect()
    const data = await M.getDashboard(db)
    const res = apiSuccess(data)
    res.headers.set('Cache-Control', 'private, max-age=10, s-maxage=10')
    return res
  } catch (error) {
    return apiError(error)
  }
}
