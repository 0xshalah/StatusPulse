# StatusPulse Security Policy

## Threat Model

### Assets
- User session tokens (NextAuth JWT)
- API endpoint configurations (URLs, names)
- Ping history (timestamps, response times)
- AI conversation history (messages, tool calls)
- AI API keys (LLM provider, web search)

### Threat Actors
| Actor | Motivation | Capability |
|-------|-----------|------------|
| External attacker | Data theft, service disruption | Medium |
| Malicious embed host | Exfiltrate page context | Low |
| AI prompt attacker | Jailbreak, data extraction | Medium |

### Attack Surface
| Surface | Risk | Mitigation |
|---------|:---:|-----------|
| `/api/chat` | High | Rate limit, input guard, output guard, IP hashing |
| `/api/endpoints` (GET) | Medium | Auth middleware (protected route) |
| `/api/settings` (GET) | High | Auth middleware (protected route) |
| `/api/ai/analytics` | Medium | Auth middleware, no PII exposure |
| `/widget` page | Low | Embed.js nest prevention |
| Embed script (`embed.js`) | Medium | Page context minimized, consent flow |

### Trust Boundaries
```
Browser ←HTTPS→ Next.js ←HTTPS→ AI Provider API
                   ←HTTPS→ Web Search API
                   ←TCP/TLS→ MongoDB Atlas
                   ←TCP→ Redis (internal)
```

## Security Controls

### Defense in Depth
1. **Network**: HTTPS everywhere, HSTS preload, CSP with specific origins
2. **Application**: Rate limiting (token bucket), input sanitization, output guard
3. **AI/LLM**: Prompt injection detection (27 patterns), system prompt hardening, output filtering
4. **Data**: AES-GCM 256 localStorage, SHA-256 IP hashing, Redis TTL 30min
5. **Infrastructure**: Circuit breaker, retry with backoff, graceful degradation

### Incident Response
- Security anomalies logged via Pino structured JSON
- SIEM webhook: `POST /api/security/alert` for critical events
- Conversation data: DELETE via `/api/chat/delete`
- Audit trail: `/api/ai/analytics` for token usage

### Vulnerability Disclosure
Report security issues to: GitHub Issues (private) or email maintainer.
Response SLA: 48 hours for critical, 7 days for medium.

## Compliance Mapping

| OWASP 2025 | Status | Control |
|-----------|:---:|---------|
| A01 Broken Access Control | ✅ | Middleware auth, protected routes |
| A02 Security Misconfiguration | ✅ | CSP, HSTS, security headers |
| A03 Supply Chain | ✅ | SBOM, dependency audit |
| A04 Cryptographic Failures | ✅ | AES-GCM, SHA-256, HTTPS |
| A05 Injection | ✅ | 27 patterns + Zod validation |
| A06 Insecure Design | ✅ | Rate limiting, circuit breaker |
| A07 Authentication Failures | ✅ | NextAuth v5, secure cookies |
| A08 Software/Data Integrity | ✅ | CI/CD gate, SBOM verification |
| A09 Security Logging | ✅ | Pino structured JSON, SIEM webhook |
| A10 Exceptional Conditions | ✅ | Sanitized errors, graceful degradation |

| OWASP LLM 2025 | Status | Control |
|----------------|:---:|---------|
| LLM01 Prompt Injection | ✅ | 27 patterns, input sanitization |
| LLM02 Sensitive Info | ✅ | Output guard, log redaction |
| LLM03 Supply Chain | ✅ | Model fallback, version pinning |
| LLM04 Data Poisoning | ✅ | No fine-tuning endpoint |
| LLM05 Improper Output | ✅ | checkOutputContent() active |
| LLM06 Excessive Agency | ✅ | 7 tools max, 4 turns max |
| LLM07 Prompt Leakage | ✅ | 9 rules + output guard |
| LLM08 Vector Weaknesses | N/A | No vector DB used |
| LLM09 Misinformation | ✅ | "Don't guess" system prompt |
| LLM10 Unbounded Consumption | ✅ | Rate limit, token limit, history limit |
