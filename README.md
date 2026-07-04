# StatusPulse — AI-Powered API Monitoring

> **Triple AI Architecture — ask your APIs anything.**

[![Live](https://img.shields.io/badge/live-statuspulse.edgeone.dev-primary?style=flat-square)](https://statuspulse.edgeone.dev)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)
[![TestSprite](https://img.shields.io/badge/verified-TestSprite%20CLI-34D399?style=flat-square)](./LOOP.md)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-TestSprite%20gated-34D399?style=flat-square)](./.github/workflows/testsprite.yml)

---

## What is StatusPulse?

StatusPulse is the **only API monitoring tool with a built-in AI assistant**. It monitors your endpoints, alerts you when they break, and lets you ask natural-language questions about your system health — all from a single dashboard.

### Triple AI Architecture

| Layer | Feature | Powered By |
|-------|---------|------------|
| 🗣️ **AI Chat Assistant** | Ask "Which APIs are down?" or "What's my slowest endpoint?" — the AI queries your dashboard in real-time | DeepSeek V4 + Tool Calling |
| 🏥 **Incident Diagnostic** | Auto-classifies incidents (timeout, 5xx, DNS, latency) with severity ratings and fix recommendations | LangGraph State Machine |
| 📚 **Knowledge Base** | Search runbook documents for troubleshooting guides with citation-backed answers | TF-IDF Search Engine |

**Zero competitors have this.** 9 AI tools, SSE streaming, content safety guardrails, and full theme customization.

---

## Live Demo

🔗 **[statuspulse.edgeone.dev](https://statuspulse.edgeone.dev)**

### Screenshots

| Dashboard | AI Chat Widget | Status Page |
|-----------|---------------|-------------|
| Real-time endpoint monitoring | Ask APIs in natural language | Public status with heatmaps |

---

## Features

### Core Monitoring
- 🔄 **Server-side scheduler** — pings run on configurable intervals
- 📊 **Real-time dashboard** — SSE streaming, search, filter by status
- 🌐 **Public status page** — shareable `/status` with uptime heatmaps
- 🏷️ **Embeddable SVG badges** — drop in any README
- 🔔 **Multi-channel alerts** — Slack, Discord, Email
- 🎨 **Dark/light mode** — with real-time accent color sync

### AI-Powered (Unique)
- 💬 **AI Chat Assistant** — natural language queries against live dashboard
- 🏥 **Incident Diagnostic** — 4-stage pipeline: Triage → Classify → Analyze → Recommend
- 📚 **Runbook Knowledge Base** — TF-IDF search with seeded documents
- 🛡️ **Guardrails** — 27 injection patterns, content filter, PII detection
- 🔒 **Privacy-first** — SHA-256 IP hashing, AES-GCM encryption, data deletion API

---

## Verified by TestSprite

| Metric | Value |
|--------|:---:|
| **Test Plans** | 13 |
| **Pass Rate** | 100% (13/13) |
| **Verification Reruns** | 35+ |
| **Bugs Caught & Fixed** | 5 |
| **LOOP Cycles** | 27 |
| **Entries** | 240 |
| **CI/CD Gate** | GitHub Actions |

🔗 [Full audit trail → LOOP.md](./LOOP.md)

---

## Quick Start

```bash
git clone https://github.com/0xshalah/StatusPulse.git
cd StatusPulse
npm install
cp .env.example .env
# Set your env vars in .env
npm run dev
```

Open `http://localhost:3000/dashboard` — click the AI bubble in the bottom-right corner.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 · React 18 · Tailwind CSS · Framer Motion |
| **Backend** | Next.js API Routes · TypeScript · Zod · SSE Streaming |
| **Database** | MongoDB Atlas · Prisma 6 |
| **Queue** | BullMQ · Redis |
| **AI** | DeepSeek V4 · Tavily · LangGraph · TF-IDF |
| **Auth** | NextAuth v5 · GitHub OAuth |
| **Testing** | TestSprite CLI · Vitest · Playwright |
| **CI/CD** | GitHub Actions |

---

## Architecture

```
Browser
  ├── Dashboard (/dashboard)
  ├── Status Page (/status)
  ├── Widget (/widget)
  └── AI Chat (embed.js → iframe)
       │
       ▼
Next.js API Routes
  ├── /api/chat → DeepSeek V4 (streaming SSE)
  ├── /api/diagnose → LangGraph State Machine
  ├── /api/kb/search → TF-IDF Search Engine
  ├── /api/ai/analytics → Usage & Rotation Dashboard
  └── /api/dashboard → MongoDB (endpoints, pings)
       │
       ▼
External APIs
  ├── DeepSeek API (AI model)
  ├── Tavily API (web search)
  └── MongoDB Atlas (primary storage)
```

---

## Security

| Dimension | Score |
|-----------|:---:|
| OWASP Top 10 (Web) | 9.2/10 |
| OWASP Top 10 (LLM) | 9.2/10 |
| Anonymity | 9.5/10 |
| Guardrails | 10/10 |
| API Key Security | 9.4/10 |

Full security audit in [SECURITY.md](./SECURITY.md).

---

## License

Apache 2.0 © 2026 StatusPulse

Built by [shalahuddin](https://github.com/0xshalah) with AI Coding Agent + TestSprite CLI for [TestSprite Hackathon S3](https://www.testsprite.com/hackathon-s3).
