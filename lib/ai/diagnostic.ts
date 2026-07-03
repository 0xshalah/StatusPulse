/**
 * Incident Diagnostic Engine — LangGraph-style state machine
 * for automated API incident classification and recommendation.
 *
 * States: TRIAGE → CLASSIFY → ANALYZE → RECOMMEND → DONE
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export type IncidentType =
  | 'timeout'
  | 'server_error_5xx'
  | 'client_error_4xx'
  | 'dns_failure'
  | 'latency_spike'
  | 'certificate_expiry'
  | 'unknown'

export interface DiagnosticState {
  stage: 'triage' | 'classify' | 'analyze' | 'recommend' | 'done'
  endpointName: string
  endpointId: string
  incidentType: IncidentType
  severity: 'critical' | 'high' | 'medium' | 'low'
  findings: string[]
  recommendation: string
}

export interface PingData {
  statusCode: number
  responseTime: number
  verdict: string
  timestamp: string
}

// ─── Classification ──────────────────────────────────────────────────────────
function classifyIncident(pings: PingData[]): { type: IncidentType; severity: DiagnosticState['severity'] } {
  if (!pings.length) return { type: 'unknown', severity: 'medium' }

  const recent = pings.slice(-10)
  const failedCount = recent.filter(p => p.verdict === 'down').length
  const codes = recent.map(p => p.statusCode)
  const avgRT = recent.reduce((s, p) => s + p.responseTime, 0) / recent.length

  // Classification logic
  if (codes.some(c => c >= 500 && c < 600)) {
    return { type: 'server_error_5xx', severity: failedCount >= 5 ? 'critical' : 'high' }
  }
  if (codes.some(c => c >= 400 && c < 500)) {
    return { type: 'client_error_4xx', severity: 'medium' }
  }
  if (codes.every(c => c === 0)) {
    return { type: 'dns_failure', severity: 'critical' }
  }
  if (avgRT > 3000 || failedCount >= 5 && avgRT > 1000) {
    return { type: 'latency_spike', severity: 'high' }
  }
  if (avgRT > 5000) {
    return { type: 'timeout', severity: 'critical' }
  }

  return { type: 'unknown', severity: 'medium' }
}

// ─── Analysis ────────────────────────────────────────────────────────────────
function analyze(type: IncidentType, pings: PingData[]): string[] {
  const findings: string[] = []
  const recent = pings.slice(-10)
  const avgRT = recent.filter(p => p.responseTime > 0).reduce((s, p) => s + p.responseTime, 0) /
    Math.max(1, recent.filter(p => p.responseTime > 0).length)

  switch (type) {
    case 'server_error_5xx':
      findings.push(`Server returning ${recent[0]?.statusCode || '5xx'} errors`)
      findings.push(`Average response time: ${Math.round(avgRT)}ms`)
      findings.push('Check upstream service (database, microservice, or external API)')
      break
    case 'client_error_4xx':
      findings.push(`Client error ${recent[0]?.statusCode} — authentication or authorization issue`)
      findings.push('Check API key validity and permission scopes')
      break
    case 'dns_failure':
      findings.push('DNS resolution failing — all requests return status 0')
      findings.push('Check domain configuration and DNS provider status')
      break
    case 'latency_spike':
      findings.push(`Response time spiked to ${Math.round(avgRT)}ms (baseline around 200ms)`)
      findings.push('Possible causes: database query degradation, network congestion, memory pressure')
      break
    case 'timeout':
      findings.push(`Requests timing out at ${Math.round(avgRT)}ms`)
      findings.push('Check server resource limits (CPU, memory, open file descriptors)')
      break
    default:
      findings.push('Unclassified incident pattern — manual investigation required')
  }

  return findings
}

// ─── Recommendation ──────────────────────────────────────────────────────────
function recommend(type: IncidentType, severity: DiagnosticState['severity']): string {
  const recs: Record<IncidentType, string> = {
    server_error_5xx: 'Roll back recent deployment. Check upstream service logs. Scale up instances if under load.',
    client_error_4xx: 'Verify API tokens/keys are not expired. Check rate limiting configuration.',
    dns_failure: 'Verify DNS records with your provider. Check if domain registration is active. Switch to backup DNS.',
    latency_spike: 'Profile database queries. Check for N+1 query patterns. Consider adding caching layer.',
    timeout: 'Increase server timeout thresholds temporarily. Check for long-running background jobs. Restart worker processes.',
    certificate_expiry: 'Renew SSL/TLS certificate immediately. Most providers auto-renew — check configuration.',
    unknown: 'Unable to auto-diagnose. Review server logs manually. Consider running a health check from multiple regions.',
  }

  const urgency = severity === 'critical' ? '\n⏰ URGENT: This is a critical incident. Escalate to on-call team immediately.' : ''
  return recs[type] + urgency
}

// ─── Main Diagnostic Pipeline ────────────────────────────────────────────────
export function runDiagnostic(
  endpointName: string,
  endpointId: string,
  pings: PingData[],
): DiagnosticState {
  const state: DiagnosticState = {
    stage: 'triage',
    endpointName,
    endpointId,
    incidentType: 'unknown',
    severity: 'medium',
    findings: [],
    recommendation: '',
  }

  // Stage 1: TRIAGE
  state.stage = 'triage'

  // Stage 2: CLASSIFY
  state.stage = 'classify'
  const classification = classifyIncident(pings)
  state.incidentType = classification.type
  state.severity = classification.severity

  // Stage 3: ANALYZE
  state.stage = 'analyze'
  state.findings = analyze(state.incidentType, pings)

  // Stage 4: RECOMMEND
  state.stage = 'recommend'
  state.recommendation = recommend(state.incidentType, state.severity)

  // Stage 5: DONE
  state.stage = 'done'

  return state
}

// ─── Format for AI response ──────────────────────────────────────────────────
export function formatDiagnostic(state: DiagnosticState): string {
  const severityIcon = {
    critical: '🔴 CRITICAL',
    high: '🟠 HIGH',
    medium: '🟡 MEDIUM',
    low: '🟢 LOW',
  }

  return `🏥 **Incident Diagnostic Report**

**Endpoint:** ${state.endpointName}
**Type:** ${state.incidentType.replace(/_/g, ' ').toUpperCase()}
**Severity:** ${severityIcon[state.severity]}

**Findings:**
${state.findings.map(f => `  • ${f}`).join('\n')}

**Recommendation:**
${state.recommendation}

---
*Diagnostic completed in ${state.stage === 'done' ? 'real-time' : 'pending'} mode.*`
}
