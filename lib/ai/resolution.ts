/**
 * AI-Guided Incident Resolution Pipeline
 *
 * Builds on the diagnostic engine (triage → classify → analyze → recommend)
 * with an additional RESOLVE stage: maps each incident type to a structured
 * action plan with prioritized steps (P1/P2/P3) and safe tool actions the AI
 * can offer to execute on the user's behalf.
 *
 * Design follows the Crawl → Walk model from the industry best-practice
 * research: we suggest safe, single-step actions first (pause monitoring,
 * test ping) and leave multi-step rollbacks / scale-up for human operators.
 * Every action is idempotent and scoped to the affected endpoint only.
 *
 * This turns StatusPulse from a diagnostic tool into the first open-source,
 * self-hosted monitoring platform with AI-guided incident resolution.
 */
import type { DiagnosticState, IncidentType } from './diagnostic'

export interface ActionStep {
  priority: 'P1' | 'P2' | 'P3'
  label: string
  detail: string
}

export interface ToolSuggestion {
  label: string
  toolName: string
  description: string
  params: Record<string, string>
}

export interface ResolutionResult {
  endpointName: string
  endpointId: string
  incidentType: IncidentType
  severity: string
  actionPlan: ActionStep[]
  safeActions: ToolSuggestion[]
  summary: string
}

const RESOLUTION_MAP: Record<
  IncidentType,
  { plan: ActionStep[]; tools: ToolSuggestion[]; summary: string }
> = {
  server_error_5xx: {
    summary:
      'Server-side errors detected. The upstream service (database, microservice, or external API) is likely failing. Start with diagnostics, then roll back any recent deployment.',
    plan: [
      { priority: 'P1', label: 'Check upstream service logs (database, microservice, external API)', detail: 'Identify which upstream dependency is failing and why' },
      { priority: 'P2', label: 'Roll back the most recent deployment if errors started after a release', detail: 'Check deployment timeline; revert to last known-good version' },
      { priority: 'P3', label: 'Restart affected service instances and verify recovery', detail: 'Restart the application server or container, then test the endpoint' },
    ],
    tools: [
      { label: 'Pause Monitoring', toolName: 'pause_endpoint', description: 'Stop alerts while you investigate', params: {} },
      { label: 'Test Endpoint', toolName: 'test_endpoint', description: 'Run a live ping to check recovery', params: {} },
    ],
  },
  client_error_4xx: {
    summary:
      'Client-side authentication or authorization error. This is usually a credential or permission issue — not a server crash.',
    plan: [
      { priority: 'P1', label: 'Verify API tokens/keys are not expired or revoked', detail: 'Check the API provider dashboard; regenerate keys if needed' },
      { priority: 'P2', label: 'Check rate limiting configuration', detail: 'Ensure the endpoint is not being throttled by the API provider' },
      { priority: 'P3', label: 'Test with a known-valid credential to confirm the fix', detail: 'Use a separate API key to confirm the endpoint is reachable' },
    ],
    tools: [
      { label: 'Test Endpoint', toolName: 'test_endpoint', description: 'Run a live ping with updated credentials', params: {} },
    ],
  },
  dns_failure: {
    summary:
      'DNS resolution is failing — all requests are blocked at the network layer. This needs immediate DNS provider investigation.',
    plan: [
      { priority: 'P1', label: 'Verify DNS records with your domain provider', detail: 'Check A/AAAA/CNAME records are correctly configured and the zone is active' },
      { priority: 'P2', label: 'Check if domain registration has expired', detail: 'Renew the domain if registration lapsed; update nameserver records' },
      { priority: 'P3', label: 'Switch to backup DNS or use IP-address target temporarily', detail: 'Configure a secondary DNS provider or bypass DNS with direct IP monitoring' },
    ],
    tools: [
      { label: 'Pause Monitoring', toolName: 'pause_endpoint', description: 'Stop monitoring while DNS resolves', params: {} },
    ],
  },
  latency_spike: {
    summary:
      'Response times have spiked significantly. This is typically a performance degradation — check database queries, caching, and resource usage.',
    plan: [
      { priority: 'P1', label: 'Profile database queries for N+1 patterns or missing indexes', detail: 'Review slow query logs, add indexes, or rewrite problematic queries' },
      { priority: 'P2', label: 'Add or increase caching (Redis, CDN, in-memory)', detail: 'Cache frequent queries and static responses to reduce backend load' },
      { priority: 'P3', label: 'Scale up instances or add connection pooling', detail: 'Increase server capacity or improve database connection management' },
    ],
    tools: [
      { label: 'Test Endpoint', toolName: 'test_endpoint', description: 'Run a live ping to check current latency', params: {} },
    ],
  },
  timeout: {
    summary:
      'Requests are timing out — the server cannot respond within the allocated window. This is often a resource exhaustion or deadlock issue.',
    plan: [
      { priority: 'P1', label: 'Check server resource limits (CPU, memory, open file descriptors, connection pool)', detail: 'Run diagnostics on server resources; look for resource saturation' },
      { priority: 'P2', label: 'Restart worker processes or server instances', detail: 'If a process is deadlocked or leaking, a restart is the fastest recovery path' },
      { priority: 'P3', label: 'Increase timeout thresholds temporarily while investigating the root cause', detail: 'Adjust load balancer and application server timeouts to reduce immediate impact' },
    ],
    tools: [
      { label: 'Pause Monitoring', toolName: 'pause_endpoint', description: 'Stop alerts during restart', params: {} },
      { label: 'Test Endpoint', toolName: 'test_endpoint', description: 'Verify server is responding after restart', params: {} },
    ],
  },
  certificate_expiry: {
    summary:
      'SSL/TLS certificate issue detected. This affects all HTTPS traffic to the endpoint. Renew the certificate immediately.',
    plan: [
      { priority: 'P1', label: 'Renew SSL/TLS certificate immediately', detail: 'Use the certificate provider (LetsEncrypt, DigiCert, etc.) to issue a new certificate' },
      { priority: 'P2', label: 'Update server configuration with the new certificate', detail: 'Replace the certificate file and key, then reload the web server' },
      { priority: 'P3', label: 'Verify SSL with a test ping and browser check', detail: 'Confirm the certificate is valid and HTTPS is serving correctly' },
    ],
    tools: [
      { label: 'Test Endpoint', toolName: 'test_endpoint', description: 'Run a live ping over HTTPS to verify', params: {} },
    ],
  },
  unknown: {
    summary:
      'Unclassified incident — there is not enough data or the failure pattern does not match a known category. Manual investigation is required.',
    plan: [
      { priority: 'P1', label: 'Review server logs for error messages, stack traces, or anomalies', detail: 'Start with application logs and database logs; look for the most recent errors' },
      { priority: 'P2', label: 'Test the endpoint from multiple regions to isolate the scope', detail: 'Check if the failure is global or limited to a specific region/network' },
      { priority: 'P3', label: 'Escalate to the engineering team with a detailed incident summary', detail: 'Compile findings into a postmortem and share with the on-call team' },
    ],
    tools: [
      { label: 'Pause Monitoring', toolName: 'pause_endpoint', description: 'Stop alerts during manual investigation', params: {} },
      { label: 'Test Endpoint', toolName: 'test_endpoint', description: 'Run a live ping for diagnostics', params: {} },
    ],
  },
}

/**
 * Run the full resolution pipeline on a diagnostic result.
 *
 * Crawl-stage actions only: pause monitoring (safe, idempotent) and test ping
 * (read-only from the user's perspective). Multi-step rollback and scale-up
 * steps are surfaced as human-executed action plan items.
 */
export function resolveIncident(
  endpointName: string,
  endpointId: string,
  incidentType: IncidentType,
  severity: string,
): ResolutionResult {
  const map = RESOLUTION_MAP[incidentType] ?? RESOLUTION_MAP.unknown

  const safeActions = map.tools.map(t => ({
    ...t,
    params: t.params as Record<string, string>,
  }))

  return {
    endpointName,
    endpointId,
    incidentType,
    severity,
    actionPlan: map.plan,
    safeActions,
    summary: map.summary,
  }
}

/**
 * Format the resolution result as a Markdown card the chat panel renders.
 * Uses 🏥 prefix so the existing diagnostic-card detection in MarkdownBlock
 * renders it with the styled card component.
 */
export function formatResolutionCard(r: ResolutionResult): string {
  const sevIcons: Record<string, string> = {
    critical: '🔴 CRITICAL',
    high: '🟠 HIGH',
    medium: '🟡 MEDIUM',
    low: '🟢 LOW',
  }
  return `🏥 **${r.endpointName} — Incident Resolution**

${sevIcons[r.severity] ?? r.severity} · ${r.incidentType.replace(/_/g, ' ').toUpperCase()}

${r.summary}

📋 **Action Plan:**
${r.actionPlan.map(a => `  **${a.priority}:** ${a.label}  
     _${a.detail}_`).join('\n')}

${
  r.safeActions.length > 0
    ? `💡 **I can help with these safe actions:**
${r.safeActions.map(a => `  - ${a.label}: ${a.description}`).join('\n')}`
    : ''
}

---
*Ask me to pause monitoring or run a test ping — I'll execute it for you.*`
}

/**
 * Build a ResolutionResult directly from a DiagnosticState (the same shape
 * returned by runDiagnostic). This is the quick-path integration: after the
 * AI calls diagnose_incident, the next user message can ask for a resolution
 * and this combines the diagnostic output with the action plan.
 */
export function diagnoseAndResolve(state: DiagnosticState): ResolutionResult {
  return resolveIncident(state.endpointName, state.endpointId, state.incidentType, state.severity)
}
