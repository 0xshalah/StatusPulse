import { apiSuccess, apiError } from '@/lib/api-response'
import * as M from '@/lib/monitor'

export async function GET() {
  try {
    const db = await M.connect()
    const data = await M.getStatus(db)
    const res = apiSuccess(data)
    res.headers.set('Cache-Control', 'public, max-age=15, s-maxage=15, stale-while-revalidate=30')
    return res
  } catch (error) {
    return apiError(error)
  }
}
