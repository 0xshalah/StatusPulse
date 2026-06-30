import { apiSuccess, apiError } from '@/lib/api-response'
import * as M from '@/lib/monitor'

export async function GET() {
  try {
    const db = await M.connect()
    const data = await M.getDashboard(db)
    const res = apiSuccess(data)
    res.headers.set('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=20')
    return res
  } catch (error) {
    return apiError(error)
  }
}
