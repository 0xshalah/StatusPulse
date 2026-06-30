import { NextRequest } from 'next/server'
import * as M from '@/lib/monitor'

export async function GET(request: NextRequest) {
  try {
    const db = await M.connect()
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false
        const send = async () => {
          if (closed) return
          try {
            const data = await M.getDashboard(db)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch { /* ignore send errors */ }
        }
        await send()
        const iv = setInterval(send, 5000)
        request.signal.addEventListener('abort', () => {
          closed = true
          clearInterval(iv)
          try { controller.close() } catch { /* already closed */ }
        })
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return new Response('Internal server error', { status: 500 })
  }
}
