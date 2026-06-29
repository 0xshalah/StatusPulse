# StatusPulse

> **Open-source API status monitoring — your endpoints, always watched.**

[![Live](https://img.shields.io/badge/live-statuspulse.onrender.com-34D399?style=flat-square)](https://statuspulse-vvy0.onrender.com)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)
[![Made with](https://img.shields.io/badge/made%20with-Claude%20Code%20%2B%20TestSprite%20CLI-E1567C?style=flat-square)](https://www.testsprite.com/hackathon-s3)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-TestSprite%20gated-34D399?style=flat-square)](./.github/workflows/testsprite.yml)

![API Gateway](https://statuspulse-vvy0.onrender.com/api/badge/d9eea9eb-8106-4c9d-80c8-990b46846fc6)
![CDN Edge](https://statuspulse-vvy0.onrender.com/api/badge/414a31e5-c766-429a-a5a2-a88f987d256b)

---

## What is StatusPulse?

StatusPulse monitors your API endpoints in real-time. Add any HTTP(S) endpoint, and it pings it on a configurable interval from a **server-side scheduler** — no browser tab required. When something breaks, you see it instantly on the dashboard, share a public status page with your users, or embed a live SVG badge in your README.

**Built for [TestSprite Hackathon Season 3](https://www.testsprite.com/hackathon-s3) — "Build the Loop".**

---

## Live Demo

🔗 **[statuspulse-vvy0.onrender.com](https://statuspulse-vvy0.onrender.com)**

![Dashboard Screenshot](assets/dashboard.png)

![Landing Page](assets/landing.png)

| Page | Description |
|------|-------------|
| `/` | Series-A landing page with animated mock dashboard |
| `/dashboard` | Real-time monitoring dashboard with SSE streaming |
| `/status` | Public status page with 24h/7d/30d uptime heatmaps |
| `/api/badge/:id` | Embeddable SVG badge (3 styles × 3 metrics) |

---

## Features

### Core
- ⚡ **Real-time Dashboard** — Animated status grid with response-time sparklines, live health score, SSE streaming
- 📊 **Per-Endpoint Detail** — 24h response-time chart with hover, p50/p95/p99 percentiles, 30-day heatmap
- 📡 **Server-side Scheduler** — Pings run continuously via `instrumentation.js`, per-endpoint configurable intervals (10s–3600s), retry with exponential backoff

### Status Pages
- 🌐 **Public `/status`** — Overall health banner, per-service 24h/7d/30d uptime, incident timeline
- 🏷️ **SVG Badge** — Dynamic `flat`/`plastic`/`for-the-badge` × `status`/`uptime`/`response_time` + icon option, Cache-Control for GitHub README
- 📬 **Email Subscribe** — Users subscribe to incident alerts on `/status`

### Alerts
- 💬 **Slack Webhook** — Native Slack message format with `<url|text>` links
- 🎮 **Discord Webhook** — Discord-compatible `**bold**` format
- ⚙️ **Alert Settings Modal** — Multi-tab UI with Slack/Discord, per-channel test buttons, toggle on-down/degraded/recovery

### Management
- 🧙 **Multi-step Wizard** — 4-step add/edit endpoint with live "Test Connection" ping, duplicate URL detection, custom interval + status code
- 🔧 **Maintenance Windows** — Set start/end datetime per endpoint with validation
- 🔍 **Search + Filter** — Real-time search, filter tabs (All/Up/Degraded/Down) with live counts, Reset button

### UX
- 🌓 **Dark/Light Mode** — View Transitions API circle animation (sunset/shrink, sunrise/expand), respects `prefers-reduced-motion`
- ✨ **Framer Motion** — Page transitions, card hover glow + tap feedback, scroll-reveal, magnetic CTA buttons, floating particles
- ♿ **Accessibility** — Semantic HTML, skip-to-content, aria-labels, reduced-motion support

### Security
- 🔒 **HSTS + CSP + X-Content-Type-Options + Referrer-Policy + Permissions-Policy**
- 🛡️ **Rate Limiting** — 120 req/min per IP, 429 with Retry-After
- 🧹 **Input Sanitization** — HTML tag stripping, URL validation, field length clamps
- 🔐 **ADMIN_KEY** — Optional auth for destructive endpoints (DELETE/RESET/SEED)
- 🐛 **Vulnerability-free** — next.js HIGH CVE patched, `npm audit` — 0 critical, 0 high

---

## The Loop

```
OpenCode + Emergent (Maker)  →  TestSprite CLI (Checker)  →  Failure Bundle  →  Fix  →  Rerun
```

| Metric | Count |
|--------|:---:|
| Iterations | 10 |
| FAIL → FIX cycles | 4 |
| Tests created | 7 |
| TestSprite reruns | 19 |
| Commits | 19+ |

**FAIL→FIX highlights:**
1. Maintenance Window — form saved with `end < start` (no validation) → caught → added `end > start` check
2. View Transitions API — 5 sub-fixes: missing animation, double-animation, wrong direction, system-theme mismatch, CSS specificity
3. Reset Filters — button only cleared search, forgot filter dropdown → one-line `setFilter('all')` fix
4. Copy All Badges — button labeled "Copy ALL" but only copied first endpoint → added `.map().join()` loop

📋 **Full verification log:** [LOOP.md](./LOOP.md) (84 entries)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Server Actions) |
| **Language** | JavaScript (JSX) |
| **Database** | MongoDB Atlas (SSL, replica set) |
| **Styling** | Tailwind CSS 3, CSS custom properties (HSL) |
| **Animation** | Framer Motion 11 |
| **UI Primitives** | Radix UI (accordion, dialog, tabs, switch, toast) |
| **Icons** | Lucide React |
| **Charts** | Custom SVG (lightweight, no library) |
| **State** | React hooks, SSE streaming |
| **Deploy** | Render (free tier) |
| **CI/CD** | GitHub Actions + TestSprite CLI gate |
| **Security** | Custom lib/security.js (rate limit, sanitize, safe errors) |
| **Testing** | TestSprite CLI (frontend E2E), Playwright (Emergent QA) |
| **Analytics** | Custom monitor.js (N+1 optimized, batched MongoDB aggregation) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Render (PaaS)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │              Next.js 15 Server                 │  │
│  │  ┌─────────────┐  ┌────────────────────────┐  │  │
│  │  │ App Router   │  │ instrumentation.js      │  │  │
│  │  │ / /dashboard │  │ (Server-side scheduler) │  │  │
│  │  │ /status      │  │ • Ping every N seconds  │  │  │
│  │  │ /api/[[...]] │  │ • Atomic nextPingAt lock│  │  │
│  │  │ /api/badge   │  │ • Retry 3× + backoff   │  │  │
│  │  └─────────────┘  └────────────────────────┘  │  │
│  │         │                    │                  │  │
│  └─────────┼────────────────────┼──────────────────┘  │
│            ▼                    ▼                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │              MongoDB Atlas (M0)                   │ │
│  │  • endpoints  • pings  • rollups  • subscribers  │ │
│  │  • settings   • incidents (derived)              │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                          ▲
         ▼                          │
┌─────────────────┐    ┌─────────────────────────┐
│  TestSprite CLI  │───▶│  GitHub Actions (CI/CD) │
│  (E2E testing)   │    │  • Every push = rerun   │
│  • Frontend E2E  │    │  • Failed = broken build│
│  • Failure bundle│    │  • +5 hackathon bonus   │
└─────────────────┘    └─────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- MongoDB instance (local or [Atlas free tier](https://cloud.mongodb.com))

### Local Development

```bash
git clone https://github.com/0xshalah/StatusPulse.git
cd StatusPulse
npm install

# Set environment variables
export MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
export DB_NAME="statuspulse"

# Start dev server
npm run dev:no-reload
# → http://localhost:3000
```

### Deploy to Render

1. Create Web Service on [Render](https://render.com)
2. Connect GitHub repo `0xshalah/StatusPulse`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Set Environment Variables: `MONGO_URL`, `DB_NAME`
6. Deploy!

---

## TestSprite Verification

```bash
# Install CLI
npm install -g @testsprite/testsprite-cli

# Setup
testsprite setup

# Run all tests
testsprite test rerun --all --project dc688ee6-3d53-4cd9-a8a2-21229ef20a01 --wait

# List tests
testsprite test list --project dc688ee6-3d53-4cd9-a8a2-21229ef20a01
```

**Dashboard:** [testsprite.com/dashboard/tests/dc688ee6](https://www.testsprite.com/dashboard/tests/dc688ee6-3d53-4cd9-a8a2-21229ef20a01)

---

## Hackathon Submission

| Field | Detail |
|-------|--------|
| **Project** | StatusPulse |
| **Live URL** | https://statuspulse-vvy0.onrender.com |
| **Repo** | https://github.com/0xshalah/StatusPulse |
| **Participant** | Shalahuddin Al-Ayyubi (@0xshalah) |
| **Discord** | shalahuddin02 |
| **TestSprite** | awgpro020345@gmail.com |
| **Maker** | OpenCode + Emergent |
| **Checker** | TestSprite CLI |

---

## License

Apache 2.0 © 2026 StatusPulse
