/**
 * Incident Diagnostic API — GET /api/diagnose/:id
 * Runs LangGraph-style diagnostic pipeline on endpoint pings.
 */

import { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { runDiagnostic, formatDiagnostic } = await import('@/lib/ai/diagnostic')

    // Fetch endpoint data from dashboard
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://statuspulse.edgeone.dev'
    const res = await fetch(`${baseUrl}/api/endpoints/${id}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return Response.json({ error: 'Endpoint not found' }, { status: 404 })

    const ep = await res.json()

    // Fetch pings
    const pingsRes = await fetch(`${baseUrl}/api/endpoints/${id}/pings`, { signal: AbortSignal.timeout(10000) })
    const pingsData = await pingsRes.json()
    const pings = (pingsData.pings || pingsData || []).slice(0, 200)

    const state = runDiagnostic(ep.name || `Endpoint ${id}`, id, pings)

    return Response.json({
      diagnostic: state,
      formatted: formatDiagnostic(state),
    })
  } catch {
    return Response.json({ error: 'Diagnostic failed' }, { status: 500 })
  }
}
