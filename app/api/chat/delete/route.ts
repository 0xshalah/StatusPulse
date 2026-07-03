/**
 * Data Deletion API — DELETE /api/chat/delete
 * Clears all conversation data from Redis, cache, and fallback store.
 */

import { NextRequest } from 'next/server'
import { clearHistory } from '@/lib/ai/redis-store'
import { queryCache } from '@/lib/ai/cache'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const conversationId = body.conversation_id || ''

    await clearHistory(conversationId)
    queryCache.clear()

    return Response.json({ ok: true, message: 'Conversation data deleted' })
  } catch {
    return Response.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}
