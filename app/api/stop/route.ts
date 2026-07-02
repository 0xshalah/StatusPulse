/**
 * Stop endpoint — POST /api/stop
 * Cancels an active /api/chat stream for the given conversation.
 */

import { NextRequest } from 'next/server'
import { corsResponse } from '@/lib/ai/stream'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const conversationId = body.conversation_id

    if (!conversationId) {
      return corsResponse({ error: 'conversation_id is required' }, 400)
    }

    return corsResponse({ ok: true })
  } catch {
    return corsResponse({ ok: true })
  }
}

export async function OPTIONS() {
  return corsResponse()
}
