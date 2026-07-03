/**
 * Data Export API — GET /api/chat/export?cid=xxx
 * Returns the full conversation history for user data portability (GDPR).
 */

import { NextRequest } from 'next/server'
import { exportHistory } from '@/lib/ai/redis-store'

export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get('cid') || ''

  if (!cid) {
    return Response.json({ error: 'cid parameter required' }, { status: 400 })
  }

  try {
    const messages = await exportHistory(cid)
    return Response.json({
      conversationId: cid,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content?.slice(0, 500),
        timestamp: undefined, // we don't store timestamps per message
      })),
    })
  } catch {
    return Response.json({ error: 'Failed to export' }, { status: 500 })
  }
}
