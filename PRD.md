# StatusPulse — Product Requirements Document

> **Version:** 2.1 (Revised)  
> **Status:** Hackathon Prototype · Pre-Production  
> **Last Updated:** June 29, 2026

---

## Executive Summary

StatusPulse is an open-source API endpoint monitoring tool — real-time dashboard, public status pages, embeddable SVG badges, Slack/Discord alerts. Built in 24 hours during TestSprite Hackathon Season 3 with a self-verifying AI agent loop (Claude Code + TestSprite CLI): 10 iterations, 84 LOOP.md entries, 4 FAIL→FIX cycles.

**Current state:** A functional prototype. The next phase is a **re-architecture** — not a refactor — to make it production-grade. Timeline: 8-12 weeks, not 2-4.

**Core differentiator:** Open-source + self-hosted. StatusPulse competes on freedom (you own your monitoring), not on being a cheaper UptimeRobot.

---

## Honest Assessment

### What the Prototype Proves
- ✅ Agent-driven development works: 19 commits, 4 genuine FAIL→FIX cycles in 24 hours
- ✅ Full-stack Next.js 15 + MongoDB Atlas + Render deployment pipeline
- ✅ Rich UX: SSE streaming, Framer Motion animations, View Transitions API
- ✅ Security basics: HSTS, CSP, rate limiting, input sanitization

### What the Prototype Is NOT
- ❌ Production-ready architecture: 250-line catch-all API route, no separation of concerns
- ❌ Type-safe: Pure JavaScript, no compile-time guarantees
- ❌ Scalable: In-memory rate limiter, no database indexes, no connection retry
- ❌ Secure: No authentication, credentials in plaintext env vars
- ❌ Tested: Zero unit/integration tests, only external TestSprite E2E

**This is a proof of concept. Treating it as an MVP that just needs polish is the planning fallacy.**

---

## Problem Statement

### Current State
Development teams deploy APIs without continuous verification. Existing tools are:
- **Expensive** — $7–$34/month for basic features
- **Closed-source** — no self-hosting, no auditability
- **Limited** — no embeddable badges, no public status pages on free tiers
- **Non-agentic** — no CLI or API for AI coding agents to self-verify

### Target Outcome
A free, open-source, **self-hosted** monitoring tool that developers can deploy in 2 minutes via Docker. A managed SaaS tier may follow — but self-hosting is the primary differentiator, not an afterthought.

---

## Target Personas

| Persona | Needs | JTBD |
|---------|-------|------|
| **Solo Developer** | Docker pull, env vars, running in 120 seconds | "I want to know my API is down before my users do" |
| **Startup CTO** | Public status page, team alerts, embeddable badges | "I want my customers to trust our uptime" |
| **AI Coding Agent** | CLI-based verification, machine-readable failure bundles | "I want to verify the code I just wrote actually works" |
| **Platform Engineer** | Self-hosted, auditable, open-source, API-driven | "I want to own my monitoring infrastructure" |

---

## User Stories

### P0 — Critical (Must Ship First)
| ID | Story | Status |
|----|-------|:------:|
| US-01 | As a developer, I can `docker compose up` and have StatusPulse running in 2 minutes | ❌ |
| US-02 | As a user, I can log in with GitHub OAuth (basic, not multi-tenant) | ❌ |
| US-03 | As a user, my endpoints are private to my account | ❌ |
| US-04 | As a user, I can add/monitor/delete HTTP(S) endpoints | ✅ MVP |
| US-05 | As a user, monitoring continues even when I close my browser | ✅ MVP |
| US-06 | As a user, I can see real-time status on a dashboard | ✅ MVP |

### P1 — Important (Ship After P0)
| ID | Story | Status |
|----|-------|:------:|
| US-07 | As a user, I can view a public status page with uptime history | ✅ MVP |
| US-08 | As a user, I receive Slack/Discord alerts when endpoints go down | ✅ MVP |
| US-09 | As a user, I can embed a live SVG badge in my README | ✅ MVP |
| US-10 | As a user, I can configure monitoring intervals per endpoint | ✅ MVP |
| US-11 | As a user, I can set maintenance windows | ✅ MVP |
| US-12 | As a user, I receive email alerts (SendGrid/Resend) | ❌ |

### P2 — Nice to Have
| ID | Story |
|----|-------|
| US-13 | As a user, I can create multiple projects with separate status pages |
| US-14 | As a user, I can customize my status page domain (CNAME) |
| US-15 | As a user, I can view historical analytics (90-day retention) |
| US-16 | As a user, I can integrate with PagerDuty/Opsgenie |
| US-17 | As a user, I can export metrics to Prometheus/Grafana |
| US-18 | As a developer, I can use the REST API with API keys |

---

## Architecture v2: Corrected

### Design Principles
1. **Self-hosted first, SaaS second.** The Docker image is the product. Managed hosting is optional.
2. **Right tool for the job.** No serverless for persistent workers. No microservices for a monitoring tool.
3. **Security before observability.** Auth and secret management ship before dashboards and metrics.

### Deployment
```
┌──────────────────────────────────────────┐
│              Docker Host (VPS)            │
│  ┌────────────────────────────────────┐  │
│  │          docker-compose.yml         │  │
│  │  ┌──────────┐ ┌────────┐ ┌───────┐ │  │
│  │  │ Next.js   │ │ Redis  │ │MongoDB│ │  │
│  │  │ :3000     │ │ :6379  │ │:27017 │ │  │
│  │  │ (Web+API) │ │(Cache) │ │(Data) │ │  │
│  │  └──────────┘ └────────┘ └───────┘ │  │
│  │  ┌──────────┐                      │  │
│  │  │ BullMQ    │ ← Background workers │  │
│  │  │ Worker    │    (ping scheduler)  │  │
│  │  └──────────┘                      │  │
│  └────────────────────────────────────┘  │
│        │                          │       │
│   Traefik/Caddy            Nginx reverse │
│   (Auto SSL)               proxy         │
└──────────────────────────────────────────┘
```

**Why Docker, not Vercel:**
- Vercel serverless functions timeout at 10-60s → can't run persistent ping workers
- BullMQ requires a background process → fundamentally incompatible with serverless
- Docker eliminates cold start entirely (process is always running)
- $6/month VPS vs $20/month Vercel Pro for comparable performance
- One `docker compose up` = complete deployment, zero platform lock-in

### Internal Architecture
```
src/
├── app/
│   ├── api/
│   │   ├── auth/       → NextAuth.js (GitHub OAuth)
│   │   ├── endpoints/  → CRUD handlers
│   │   ├── pings/      → Ping history
│   │   ├── alerts/     → Webhook config
│   │   ├── status/     → Public status data
│   │   └── badge/      → SVG badge generation
│   ├── (dashboard)/    → Protected routes
│   └── (status)/       → Public routes
├── workers/
│   ├── scheduler.ts    → BullMQ ping job processor
│   └── alerts.ts       → BullMQ alert dispatcher
├── lib/
│   ├── monitor/        → Ping engine + retry logic
│   ├── auth/           → Auth utilities
│   ├── security/       → Rate limit, sanitize, CSP
│   └── db/             → MongoDB connection pool + retry
└── types/              → TypeScript definitions
```

---

## Corrected Priority Order

The original PRD had the order wrong. Here's the real priority, based on what kills the product first:

| # | Task | Why First |
|:--:|------|-----------|
| **1** | **Stabilize monitoring engine** | Core product. Unreliable pings = dead product, regardless of how clean the schema is |
| **2** | **Add GitHub OAuth (minimal)** | Anyone can DELETE your endpoints right now. Security P0, not P2 |
| **3** | **Dockerize** | Eliminates cold start, enables persistent workers, makes self-hosting real |
| **4** | **TypeScript migration** | Incremental, file-by-file. Start with API routes, then workers, then UI |
| **5** | **Database indexes + connection retry** | Only matters at scale. N+1 with 50 endpoints is fine. Fix when it hurts |
| **6** | **Split API routes** | Already functional. Refactor as part of TypeScript migration |
| **7** | **Structured logging + health checks** | Prerequisite for production monitoring of the monitor |
| **8** | **Email alerts (SendGrid)** | Most-requested feature after Slack/Discord |

---

## Database Schema (TypeScript + Prisma)

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  avatar    String?
  endpoints Endpoint[]
  createdAt DateTime  @default(now())
}

model Endpoint {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
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

  @@index([userId])
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
```

---

## Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|:------:|
| **Deployment** | Time from `git clone` to running | < 120s via Docker |
| **Performance** | API response time (p95) | < 200ms |
| **Performance** | Dashboard FCP | < 1.5s |
| **Availability** | Docker host uptime | 99.9% (depends on VPS) |
| **Scalability** | Endpoints per instance | 5,000+ (with indexes) |
| **Security** | Authentication | GitHub OAuth mandatory for mutations |
| **Security** | Secrets | Environment variables, never in code |
| **Accessibility** | WCAG 2.1 AA | All pages |
| **Browser Support** | Modern browsers | Chrome, Firefox, Safari, Edge |

---

## Competitive Analysis

| Feature | StatusPulse | UptimeRobot | BetterStack |
|---------|:---:|:---:|:---:|
| **Self-hosted** | ✅ Docker | ❌ | ❌ |
| **Open source** | ✅ Apache 2.0 | ❌ | ❌ |
| **Free tier** | ✅ Forever | ✅ 50 monitors | ❌ |
| **Public status page** | ✅ | ✅ | ✅ |
| **SVG badges** | ✅ 3 styles | ❌ | ✅ |
| **Slack alerts** | ✅ | ✅ | ✅ |
| **Discord alerts** | ✅ | ❌ | ❌ |
| **AI agent CLI** | ✅ TestSprite | ❌ | ❌ |
| **Pricing** | Free (self-host) | $7-34/mo | $25-300/mo |

---

## Risk Register

| Risk | P | I | Mitigation |
|------|:---:|:---:|------------|
| MongoDB connection failure | M | H | Connection pool + retry + health check |
| Credential exposure | L | C | Never commit secrets, `.env.example` only |
| Scheduler failure (missed pings) | M | H | BullMQ dead letter queue + alert on stall |
| Docker image bloat | M | M | Multi-stage build, Alpine base, < 200MB |
| Free tier abuse (SaaS later) | H | M | Hard rate limits, API key validation |
| Dependency vulnerability | M | H | Dependabot + weekly `npm audit` |

P = Probability, I = Impact. C = Critical, H = High, M = Medium, L = Low.

---

## Development Roadmap

### Phase 1: Core Stability (Weeks 1-4)
- [ ] **Monitoring engine:** Rewrite scheduler with BullMQ + Redis
- [ ] **Connection resilience:** MongoDB retry logic + connection pool
- [ ] **Docker:** `Dockerfile` + `docker-compose.yml` with Next.js + Redis + MongoDB
- [ ] **Auth:** GitHub OAuth via NextAuth.js (protect mutations, public GETs remain open)
- [ ] **Health check:** `GET /api/health` returning DB + Redis + scheduler status
- [ ] **Structured logging:** Pino JSON logs to stdout

### Phase 2: Production Hardening (Weeks 5-8)
- [ ] **TypeScript:** Incremental migration, starting with API routes + workers
- [ ] **Database:** Add Prisma migrations + indexes
- [ ] **Tests:** Vitest unit tests for ping engine + alert dispatcher
- [ ] **Email alerts:** SendGrid integration
- [ ] **CI/CD:** GitHub Actions build + test + push Docker image to GHCR
- [ ] **API split:** Domain-specific route handlers (part of TS migration)

### Phase 3: Scale (Weeks 9-12)
- [ ] **Multi-project:** Per-user project isolation
- [ ] **Prometheus metrics:** `/api/metrics` endpoint
- [ ] **API keys:** Programmatic access for CI/CD pipelines
- [ ] **Status page custom domain:** CNAME support
- [ ] **PagerDuty/Opsgenie:** Webhook integrations
- [ ] **Performance:** Add database indexes for scale > 1000 endpoints

### Phase 4: Ecosystem (Ongoing)
- [ ] NPM package: `npx statuspulse init`
- [ ] MCP Server for AI coding agents
- [ ] Terraform provider for IaC monitoring
- [ ] Managed hosting tier (optional, not a priority)
- [ ] Community integrations (Datadog, Grafana)

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 |
|--------|:---:|:---:|:---:|:---:|
| **Docker deploy time** | — | < 120s | < 90s | < 60s |
| **GitHub stars** | 0 | 50 | 200 | 1,000 |
| **Self-hosted instances** | 1 | 20 | 100 | 500 |
| **Test coverage** | 0% | 30% | 60% | 80% |
| **TypeScript coverage** | 0% | 20% | 60% | 100% |
| **p95 API latency** | ~500ms | < 300ms | < 200ms | < 100ms |

---

## Appendices

### A. Key Decisions Log
| Decision | Rationale |
|----------|-----------|
| Docker over Vercel | Persistent workers incompatible with serverless. Cold start eliminated. |
| GitHub OAuth only (not Clerk) | Minimal auth surface. Add email/password later when needed. |
| BullMQ over setInterval | Retry logic, dead letter queue, horizontal scaling, job observability. |
| Self-hosted first, SaaS later | Differentiator. Don't compete with UptimeRobot on their terms. |
| TypeScript file-by-file, not big bang | Incremental migration is lower risk. `allowJs: true` + gradual adoption. |

### B. Glossary
| Term | Definition |
|------|------------|
| **Endpoint** | An HTTP(S) URL being monitored |
| **Verdict** | Current state: up, degraded, down, maintenance, paused |
| **Ping** | A single health check attempt against an endpoint |
| **BullMQ** | Redis-backed job queue for Node.js — handles scheduler + retries |
| **Docker Compose** | Multi-container orchestration: 1 command = full stack |
