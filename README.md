# StatusPulse

> **The API monitoring platform you can chat with.**
>
> *"What broke?" · "Why?" · "How do I fix it?"*

[![Live](https://img.shields.io/badge/live-statuspulse.edgeone.dev-primary?style=flat-square)](https://statuspulse.edgeone.dev)
[![Tests](https://img.shields.io/badge/tests-verified%20by%20TestSprite-34D399?style=flat-square)](./LOOP.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)

---

## 🎥 Demo

| | |
|---|---|
| 🌐 **Live** | [statuspulse.edgeone.dev](https://statuspulse.edgeone.dev) |
| ▶️ **Video walkthrough** | *Open dashboard → Click AI bubble → Ask "Which APIs are down?" → AI answers from live data* |

*30-second GIF showing the AI chat in action — coming soon.*

---

> **StatusPulse demonstrates how Loop Engineering can produce a production-style AI monitoring platform through continuous verification rather than one-shot generation.**

---

## Built with Loop Engineering

*A loop with no real checker doesn't fail loudly. It hallucinates progress.*

StatusPulse wasn't built with one-shot prompting. Every feature followed the TestSprite loop:

```
Write ──→ Verify ──→ Fix ──→ Verify Again
  │          │         │          │
  Agent     TestSprite  Agent     TestSprite
  ships     runs real   reads     reruns
  code      tests       failure   → passes
                        bundle    → banks
```

| | |
|---|---|
| **Loop iterations** | 28 |
| **Verification reruns** | 35+ |
| **Test plans** | 13 automated |
| **Pass rate** | 100% |
| **Regressions found** | 5 real bugs |
| **LOOP.md** | [250-entry audit trail](./LOOP.md) |
| **CI/CD** | [GitHub Actions gate](./.github/workflows/testsprite.yml) |

---

## 🎥 Try it

🌐 **Live:** [statuspulse.edgeone.dev](https://statuspulse.edgeone.dev)

| | |
|---|---|
| 📸 Dashboard | Real-time monitoring with sparklines |
| 💬 AI Chat | Ask "Which APIs are down?" — answers from live data |
| 🏥 Diagnostic | Auto-classifies 7 incident types |
| 📚 Knowledge Base | Citation-backed runbook search |

---

## What makes StatusPulse different

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

## Three ways to use it

| | | |
|---|---|---|
| 🟢 **Monitor** | Track uptime, response time, and status | Dashboard + status page + badges |
| 🏥 **Diagnose** | Auto-classify incidents, get fix recommendations | 7 incident types, severity ratings |
| 💬 **Ask AI** | Query live dashboard in plain English | 9 tools, streaming responses |

---

## How the loop runs here

StatusPulse demonstrates the core TestSprite loop in practice:

```text
Feature idea
    │
    ▼
Agent writes implementation
    │
    ▼
TestSprite runs real browser tests
against the deployed app
    │
    ├── PASS → banked, moves to next feature
    │
    └── FAIL → failure bundle downloaded
                    │
                    ▼
            Agent reads root cause
                    │
                    ▼
            Agent fixes the code
                    │
                    ▼
            TestSprite reruns → PASS → banked
```

**Example from the build log:**

```
1. Created dark/light theme toggle
2. TestSprite: FAILED — animation broken on Safari
3. Fixed CSS pseudo-elements for Safari
4. TestSprite: FAILED — z-index wrong in Chrome
5. Fixed layering → PASSED. 5 cycles to resolve.
```

This is documented across 28 iterations in [LOOP.md](./LOOP.md) — a 250-entry engineering journal with Failure Bundles, root cause analysis, [engineering trade-offs](./LOOP.md#engineering-trade-offs), and [5 moments where TestSprite genuinely changed the project](./LOOP.md#how-testsprite-changed-this-project).

---

## Features

| Category | Capabilities |
|----------|-------------|
| **Monitoring** | Real-time SSE dashboard · Search · Filter by status · 30-day ping history |
| **Status Page** | Public `/status` with uptime heatmaps · Embeddable SVG badges |
| **Alerts** | Slack · Discord · Email — multi-channel notifications |
| **AI Assistant** | Natural language queries · Tool calling · Streaming responses |
| **Incident Diagnostic** | 4-stage pipeline: Triage → Classify → Analyze → Recommend |
| **Knowledge Base** | TF-IDF search · Citation-backed answers · Seeded runbook documents |
| **Customization** | Dark/light mode · Accent color sync · Responsive layout |
| **Security** | Route-level auth · Input validation · Prompt injection guardrails · Content filter |

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

## Security

Full audit in [SECURITY.md](./SECURITY.md).

| Area | Approach |
|-------|----------|
| **Auth** | NextAuth v5 + route-level checks |
| **Input** | Zod validation · XSS filter · NoSQL injection prevention |
| **AI Guardrails** | Prompt injection detection (27 patterns) · Output guard · Content filter |
| **Data** | AES-GCM encryption · SHA-256 IP hashing · API key rotation |

---

## License

Apache 2.0 © 2026 StatusPulse

Built by [shalahuddin](https://github.com/0xshalah) with AI Coding Agent + TestSprite CLI for [TestSprite Hackathon S3](https://www.testsprite.com/hackathon-s3).
