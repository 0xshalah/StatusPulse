# StatusPulse

> **The API monitoring platform you can chat with.**
>
> *"What broke?" · "Why?" · "How do I fix it?"*

[![Live](https://img.shields.io/badge/live-statuspulse.edgeone.dev-primary?style=flat-square)](https://statuspulse.edgeone.dev)
[![Tests](https://img.shields.io/badge/tests-13%2F13%20passed-34D399?style=flat-square)](https://www.testsprite.com/dashboard/tests/dc688ee6-3d53-4cd9-a8a2-21229ef20a01)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)

---

## What makes StatusPulse different?

Traditional monitoring tells you **what** broke.

StatusPulse tells you **what**, **why**, how **severe** it is, and what to **do about it** — and then lets you ask follow-up questions.

```
┌─────────────────────────────────────────────┐
│  🔴 Payments API — DOWN                     │
│                                             │
│  🏥 Incident Diagnostic                     │
│  Type: server_error_5xx                     │
│  Severity: CRITICAL                         │
│  Finding: Connection pool exhaustion        │
│                                             │
│  📚 Matching Runbook:                       │
│  "Database Connection Pool Exhaustion"       │
│  Fix: Increase pool size + add retry logic   │
│                                             │
│  💬 "Which other endpoints are affected?"   │
└─────────────────────────────────────────────┘
```

---

## 🎥 Demo

| | |
|---|---|
| 🌐 **Live** | [statuspulse.edgeone.dev](https://statuspulse.edgeone.dev) |
| 📸 **Dashboard** | Real-time endpoint monitoring with sparklines |
| 💬 **AI Chat** | Ask "Which APIs are down?" — AI queries live data |
| 🏥 **Diagnostic** | Auto-classifies 7 incident types with fix recommendations |
| 📚 **Knowledge Base** | Search runbook documents with citation-backed answers |

> **30-second walkthrough:** Open dashboard → Click AI bubble → Ask a question → Get answer.

---

## How a question flows

```
User types: "Which APIs are down?"
            │
            ▼
     ┌──────────────┐
     │   AI Chat    │  ← Natural language
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ Tool Calling │  ← Calls /api/dashboard
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │   Dashboard  │  ← Returns live endpoint data
     └──────┬───────┘
            │
            ▼
     "Payments API is down. 503 error. 3 other endpoints healthy."
```

---

## Three ways to use StatusPulse

| | | |
|---|---|---|
| 🟢 **Monitor** | Track uptime, response time, and status across all endpoints | Dashboard + status page + badges |
| 🏥 **Diagnose** | Auto-classify incidents and get fix recommendations | 7 incident types, severity ratings |
| 💬 **Ask AI** | Query your live dashboard in plain English | 9 tools, streaming responses |

---

## Verified by TestSprite

| | |
|---|---|
| **Test Plans** | 13 |
| **Pass Rate** | 100% |
| **Reruns** | 35+ |
| **FAIL→FIX Cycles** | 5 |
| **CI/CD Gate** | GitHub Actions |

🔗 [Full audit trail → LOOP.md](./LOOP.md)

---

## Why it matters

| Traditional Monitoring | StatusPulse |
|---|---|
| ❌ Shows status | ✅ Shows status + severity |
| ❌ "Endpoint is down" | ✅ "503 error. Connection pool exhausted. Fix: increase pool size." |
| ❌ Manual investigation | ✅ Automated diagnostic pipeline |
| ❌ Tab-switching for docs | ✅ Built-in runbook search |
| ❌ Static dashboards | ✅ Conversational interface |

---

## Quick Start

```bash
git clone https://github.com/0xshalah/StatusPulse.git
cd StatusPulse
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000/dashboard` — click the AI bubble in the bottom-right corner.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 · React · Tailwind · Framer Motion |
| **Backend** | Next.js API Routes · TypeScript · Zod · SSE Streaming |
| **Database** | MongoDB · Prisma · Redis |
| **Queue** | BullMQ |
| **AI** | LLM · Web Search · LangGraph · TF-IDF |
| **Auth** | NextAuth v5 · GitHub OAuth |
| **Testing** | TestSprite CLI · Vitest |
| **CI/CD** | GitHub Actions |

---

## Architecture

```
Browser
  ├── Dashboard (/dashboard)
  ├── Status Page (/status)
  ├── AI Widget (/widget)
  └── Embed (embed.js → iframe)
       │
       ▼
Next.js API Routes
  ├── /api/chat → AI Model (streaming SSE)
  ├── /api/diagnose → Incident Diagnostic Pipeline
  ├── /api/kb/search → Knowledge Base
  └── /api/dashboard → MongoDB
       │
       ▼
External Services
  ├── LLM API (chat + reasoning)
  └── Search API (troubleshooting)
```

---

## Security

Full audit in [SECURITY.md](./SECURITY.md).

| Area | Approach |
|-------|----------|
| **Auth** | NextAuth v5 + route-level checks on sensitive endpoints |
| **Input** | Zod validation + XSS filter + NoSQL injection prevention |
| **AI** | Prompt injection detection (27 patterns) + output guard + content filter |
| **Data** | AES-GCM encryption at rest · SHA-256 IP hashing · API key rotation |
| **Headers** | CSP · HSTS · X-Frame-Options · nosniff |

---

## License

Apache 2.0 © 2026 StatusPulse

Built by [shalahuddin](https://github.com/0xshalah) for [TestSprite Hackathon S3](https://www.testsprite.com/hackathon-s3).
