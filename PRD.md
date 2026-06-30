# StatusPulse — Product Requirements Document

> **Version:** 2.0 (Post-Hackathon)  
> **Status:** MVP Complete · Production Planning  
> **Last Updated:** June 29, 2026

---

## Executive Summary

StatusPulse is an open-source API endpoint monitoring platform that provides real-time uptime tracking, public status pages, embeddable SVG badges, and multi-channel alerting. Built during TestSprite Hackathon Season 3 with a self-verifying AI agent loop (Claude Code + TestSprite CLI), the MVP achieved 10 iterations with 4 FAIL→FIX cycles, proving the viability of agent-driven development.

The next phase transforms StatusPulse from a single-tenant hackathon project into a production-grade, multi-tenant SaaS platform.

---

## Problem Statement

### Current State
Development teams deploy APIs without continuous verification. Existing monitoring tools (UptimeRobot, BetterStack, Pingdom) are:
- **Expensive** — $7–$34/month for basic features
- **Closed-source** — no self-hosting, no auditability
- **Limited** — no embeddable badges, no public status pages on free tiers
- **Non-agentic** — no CLI or API designed for AI coding agents to self-verify

### Target Outcome
A free, open-source alternative that developers can self-host in 2 minutes or use as a managed service — with a CLI designed for AI agents to verify their own work.

---

## Target Personas

| Persona | Needs | JTBD |
|---------|-------|------|
| **Solo Developer** | Monitor 5-10 personal projects, free, simple | "I want to know my API is down before my users do" |
| **Startup CTO** | Public status page, team alerts, embeddable badges | "I want my customers to trust our uptime" |
| **AI Coding Agent** | CLI-based verification, machine-readable failure bundles | "I want to verify the code I just wrote actually works" |
| **Platform Engineer** | Self-hosted, auditable, open-source, API-driven | "I want to own my monitoring infrastructure" |

---

## User Stories

### Must Have (P0) — MVP Complete ✅
| ID | Story | Status |
|----|-------|:------:|
| US-01 | As a user, I can add an HTTP(S) endpoint to monitor | ✅ |
| US-02 | As a user, I can see real-time status (up/degraded/down) for all endpoints | ✅ |
| US-03 | As a user, I can view a public status page with uptime history | ✅ |
| US-04 | As a user, I can embed a live SVG badge in my README | ✅ |
| US-05 | As a user, I receive Slack/Discord alerts when endpoints go down | ✅ |
| US-06 | As a user, I can set maintenance windows for planned downtime | ✅ |

### Should Have (P1) — Next Sprint
| ID | Story | Priority |
|----|-------|:--------:|
| US-07 | As a user, I can sign up/login with email or GitHub OAuth | 🔴 |
| US-08 | As a user, my endpoints are private to my account | 🔴 |
| US-09 | As a user, I can create multiple projects with separate status pages | 🟡 |
| US-10 | As a user, I can customize my status page domain (CNAME) | 🟡 |
| US-11 | As a user, I receive email alerts (SendGrid/Resend) | 🟡 |
| US-12 | As a user, I can view historical analytics (90-day retention) | 🟡 |

### Could Have (P2) — Future
| ID | Story | Priority |
|----|-------|:--------:|
| US-13 | As a user, I can set up incident templates and postmortems | 🟢 |
| US-14 | As a user, I can integrate with PagerDuty/Opsgenie | 🟢 |
| US-15 | As a user, I can monitor TCP/ICMP in addition to HTTP(S) | 🟢 |
| US-16 | As a user, I can export metrics to Prometheus/Grafana | 🟢 |
| US-17 | As a developer, I can use the REST API with API keys | 🟢 |
| US-18 | As an AI agent, I can drive the full verify→fix loop via MCP Server | 🟢 |

---

## Feature Specification

### 1. Authentication & Multi-Tenancy
```
POST   /api/auth/signup        → Create account (email + password)
POST   /api/auth/login         → JWT token
GET    /api/auth/session       → Validate token
POST   /api/auth/oauth/github  → GitHub OAuth flow
```
- **Provider:** NextAuth.js v5 or Clerk
- **Session:** JWT with refresh tokens, 7-day expiry
- **Data isolation:** All queries scoped to `userId`

### 2. API Architecture (Refactored)
```
Current (MVP):  app/api/[[...path]]/route.js    ← 250 lines, all-in-one

Target (v2):    app/api/
                ├── auth/        → Auth handlers
                ├── endpoints/   → CRUD endpoints
                ├── pings/       → Ping history
                ├── alerts/      → Webhook configuration
                ├── status/      → Public status data
                ├── badge/       → SVG badge generation
                ├── projects/    → Multi-project support
                ├── settings/    → User preferences
                └── webhooks/    → Incoming alert callbacks
```
- **Validation:** Zod schemas per route
- **Middleware:** Rate limit, auth, input sanitization
- **Response:** Consistent envelope `{ data, error, meta }`

### 3. Database Schema (TypeScript + Indexes)
```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatar    String?
  createdAt DateTime @default(now())
  projects  Project[]
}

model Project {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  name      String
  slug      String     @unique
  endpoints Endpoint[]
  createdAt DateTime   @default(now())
  @@index([userId])
}

model Endpoint {
  id               String   @id @default(cuid())
  projectId        String
  project          Project  @relation(fields: [projectId], references: [id])
  name             String
  url              String
  expectedStatus   Int      @default(200)
  interval         Int      @default(60)
  paused           Boolean  @default(false)
  maintenanceStart DateTime?
  maintenanceEnd   DateTime?
  lastVerdict      String?
  lastPingAt       DateTime?
  nextPingAt       DateTime?
  pings            Ping[]
  createdAt        DateTime @default(now())
  @@index([projectId])
  @@index([nextPingAt])
}

model Ping {
  id           String   @id @default(cuid())
  endpointId   String
  endpoint     Endpoint @relation(fields: [endpointId], references: [id])
  timestamp    DateTime @default(now())
  statusCode   Int
  responseTime Int
  verdict      String
  @@index([endpointId, timestamp])
  @@index([timestamp])
}

model AlertConfig {
  id               String   @id @default(cuid())
  projectId        String
  slackWebhookUrl  String?
  discordWebhookUrl String?
  emailAlerts      Boolean  @default(false)
  notifyOnDown     Boolean  @default(true)
  notifyOnDegraded Boolean  @default(true)
  notifyOnRecovery Boolean  @default(true)
  @@index([projectId])
}
```

### 4. Scheduler (Production)
```
Current: setInterval in instrumentation.js → fetch localhost API

Target:  BullMQ + Redis
  - Jobs queued per endpoint interval
  - Retry with exponential backoff
  - Dead letter queue for persistent failures
  - Horizontally scalable (multiple workers)
  - Dashboard for queue monitoring
```

### 5. Observability
```
Logging:    Pino (structured JSON) → stdout
Metrics:    Prometheus (request duration, ping latency, error rate)
Tracing:    OpenTelemetry (span all external calls)
Alerts:     Sentry (error tracking) + health check endpoint
Dashboard:  Grafana (real-time metrics visualization)
```

---

## Technical Architecture (v2)

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare                            │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐               │
│  │ DNS/CNAME│  │   CDN    │  │ WAF / DDoS  │               │
│  └──────────┘  └──────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Vercel / Railway (Pro)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Next.js 15 (App Router)                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │ Auth     │ │ Projects │ │ Settings │             │  │
│  │  │ (Clerk)  │ │ CRUD     │ │ Profile  │             │  │
│  │  └──────────┘ └──────────┘ └──────────┘             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │ Status   │ │ Badges   │ │ Alerts   │             │  │
│  │  │ Pages    │ │ SVG Gen  │ │ Webhooks │             │  │
│  │  └──────────┘ └──────────┘ └──────────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼──────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   MongoDB Atlas  │ │    Redis     │ │   BullMQ Queue   │
│   (Primary)      │ │   (Cache)    │ │   (Scheduler)    │
│   • Users        │ │   • Session  │ │   • Ping jobs    │
│   • Projects     │ │   • Rate lim │ │   • Alert jobs   │
│   • Endpoints    │ │   • Rollups  │ │   • Rollup jobs  │
│   • Pings        │ │              │ │                  │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

---

## Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|:------:|
| **Performance** | API response time (p95) | < 200ms |
| **Performance** | Dashboard FCP (First Contentful Paint) | < 1.5s |
| **Performance** | Cold start (serverless) | < 3s |
| **Availability** | Uptime SLA | 99.9% |
| **Scalability** | Concurrent users | 1,000+ |
| **Scalability** | Endpoints monitored | 50,000+ |
| **Security** | OWASP Top 10 | All mitigated |
| **Security** | SOC 2 Type II | Target Q3 2027 |
| **Accessibility** | WCAG 2.1 AA | All pages |
| **Browser Support** | Modern browsers | Chrome, Firefox, Safari, Edge (last 2 versions) |
| **Data Privacy** | GDPR compliant | EU user data rights |
| **Backup** | Database backups | Daily, 30-day retention |
| **Disaster Recovery** | RTO / RPO | < 4 hours / < 1 hour |

---

## Competitive Analysis

| Feature | StatusPulse | UptimeRobot | BetterStack | Pingdom |
|---------|:---:|:---:|:---:|:---:|
| **Free tier** | ✅ Forever | ✅ 50 monitors | ❌ | ❌ |
| **Open source** | ✅ Apache 2.0 | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ Next.js+MongoDB | ❌ | ❌ | ❌ |
| **Public status page** | ✅ Custom domain | ✅ | ✅ | ✅ |
| **SVG badges** | ✅ 3 styles×3 metrics | ❌ | ✅ | ❌ |
| **Slack alerts** | ✅ | ✅ | ✅ | ✅ |
| **Discord alerts** | ✅ | ❌ | ❌ | ❌ |
| **AI agent CLI** | ✅ TestSprite MCP | ❌ | ❌ | ❌ |
| **Multi-user** | 🔜 v2 | ✅ | ✅ | ✅ |
| **API** | 🔜 v2 | ✅ | ✅ | ✅ |
| **Pricing** | Free | $7-34/mo | $25-300/mo | $10-100/mo |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|:---:|:---:|------------|
| MongoDB connection failure | Medium | High | Connection pool + retry + failover |
| Rate limit bypass | Low | Medium | Redis-based distributed rate limiter |
| Credential exposure | Low | Critical | Secrets manager, env encryption, audit log |
| Free tier abuse | High | Medium | Hard rate limits, API key validation |
| Render cold start timeout | High | Medium | Migrate to Vercel Pro or Railway Pro |
| Data loss | Low | Critical | Daily backups, point-in-time recovery |
| Dependency vulnerability | Medium | High | Dependabot, weekly audit, SBOM |

---

## Success Metrics

| Metric | Current (MVP) | Target (v2) | Target (v3) |
|--------|:---:|:---:|:---:|
| **Registered users** | 1 (dev) | 100 | 1,000 |
| **Monitored endpoints** | 5 (seed) | 500 | 10,000 |
| **Status pages published** | 1 | 50 | 500 |
| **Badge impressions/day** | — | 10,000 | 100,000 |
| **GitHub stars** | 0 | 100 | 1,000 |
| **NPM downloads/week** | — | 50 | 500 |
| **Time to first ping** | 60s | 30s | 10s |
| **Uptime (platform)** | — | 99.9% | 99.99% |

---

## Development Roadmap

### Phase 1: Production Foundation (Weeks 1-2)
- [ ] Migrate to TypeScript + Zod validation
- [ ] Split API routes into domain-specific handlers
- [ ] Add MongoDB indexes + connection retry
- [ ] Add unit + integration tests (Vitest)
- [ ] Set up CI/CD with staging environment

### Phase 2: Auth & Multi-Tenancy (Weeks 3-4)
- [ ] Integrate NextAuth.js (GitHub OAuth + email/password)
- [ ] Add user-scoped data isolation
- [ ] Multi-project support
- [ ] API key generation for programmatic access

### Phase 3: Production Infrastructure (Weeks 5-6)
- [ ] Migrate to Vercel Pro (no cold start, edge functions)
- [ ] Redis for caching + distributed rate limiting
- [ ] BullMQ for job queue (scheduler rewrite)
- [ ] Pino structured logging + Prometheus metrics

### Phase 4: Scale & Monetize (Weeks 7-8)
- [ ] Free tier: 5 endpoints, 1 project
- [ ] Pro tier ($9/mo): 50 endpoints, custom domain, teams
- [ ] Enterprise tier ($49/mo): unlimited, SSO, SLA
- [ ] Stripe integration for payments

### Phase 5: Ecosystem (Ongoing)
- [ ] NPM package: `npx statuspulse init`
- [ ] MCP Server for AI coding agents
- [ ] Terraform provider for IaC monitoring
- [ ] Community-contributed integrations (Datadog, Grafana, PagerDuty)

---

## Appendices

### A. Glossary
| Term | Definition |
|------|------------|
| **Endpoint** | An HTTP(S) URL being monitored |
| **Verdict** | Current state: up, degraded, down, maintenance, paused |
| **Ping** | A single health check attempt against an endpoint |
| **Rollup** | Pre-aggregated daily uptime/latency data |
| **SSE** | Server-Sent Events — real-time push from server to client |
| **Failure Bundle** | TestSprite artifact: failing step, screenshots, DOM, root cause, fix |

### B. Repository
```
StatusPulse/
├── prisma/               # Database schema + migrations
│   └── schema.prisma
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # Domain-separated API routes
│   │   ├── (dashboard)/  # Dashboard routes
│   │   ├── (status)/     # Public status routes
│   │   └── (auth)/       # Auth routes
│   ├── components/       # React components
│   ├── lib/              # Business logic
│   │   ├── monitor/      # Ping engine
│   │   ├── scheduler/    # BullMQ job queue
│   │   ├── alerts/       # Notification dispatcher
│   │   ├── badge/        # SVG badge generator
│   │   └── security/     # Auth, rate limit, sanitize
│   ├── hooks/            # React hooks
│   └── types/            # TypeScript type definitions
├── tests/                # Vitest unit + integration
├── e2e/                  # Playwright E2E
├── .github/workflows/    # CI/CD
└── docs/                 # Documentation
```

### C. References
- Next.js Documentation: https://nextjs.org/docs
- Clerk Authentication: https://clerk.com/docs
- Prisma ORM: https://www.prisma.io/docs
- BullMQ Queue: https://docs.bullmq.io
- TestSprite CLI: https://github.com/TestSprite/testsprite-cli
