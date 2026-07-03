/**
 * Security alert webhook — POST /api/security/alert
 * Receives critical security events for SIEM integration.
 * Accepts JSON: { event, severity, details, timestamp }
 */

import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.event || !body.severity) {
      return Response.json({ error: 'event and severity required' }, { status: 400 })
    }

    // Log to Pino for SIEM consumption
    const { createLogger } = await import('@/lib/logger')
    const logger = createLogger('siem')

    logger.warn({
      type: 'security_alert',
      event: body.event,
      severity: body.severity,
      details: body.details || '',
      timestamp: body.timestamp || new Date().toISOString(),
    })

    // Forward to external SIEM if configured
    const siemUrl = process.env.SIEM_WEBHOOK_URL
    if (siemUrl) {
      fetch(siemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {})
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
