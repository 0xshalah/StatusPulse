# StatusPulse

> Open-source API status monitoring — your endpoints, always watched.

**Live:** [statuspulse-vvy0.onrender.com](https://statuspulse-vvy0.onrender.com)  
**Built for:** TestSprite Hackathon Season 3 — "Build the Loop"

---

## What is StatusPulse?

StatusPulse monitors your API endpoints in real-time. Add any HTTP(S) endpoint, and it pings it on a configurable interval from server-side — no browser tab required. When something breaks, you see it instantly on the dashboard, share a public status page with your users, or embed a live SVG badge in your README.

## Features

- **Real-time Dashboard** — Animated status grid with response-time sparklines and live health score
- **Public Status Page** — `/status` with 24h/7d/30d uptime per endpoint
- **Embeddable SVG Badge** — `/api/badge/[id]` with 3 styles × 3 metrics
- **Server-side Scheduler** — Pings run continuously, no browser tab required
- **Incident Timeline** — Automatic detection of when endpoints went down and recovered
- **Dark/Light Mode** — Tri-state toggle (Dark/Light/System)

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, Framer Motion
- **Backend:** Next.js API routes, MongoDB
- **Deployment:** Render
- **Testing:** TestSprite CLI (frontend E2E)

## The Loop

This project runs a continuous `write → verify → fix → verify` loop:

1. **Write** — Claude Code adds features
2. **Verify** — TestSprite CLI runs end-to-end tests against the live app
3. **Fix** — Claude Code reads failure bundle, fixes root cause
4. **Verify Again** — Rerun tests, bank passing results

See [LOOP.md](./LOOP.md) for the full verification log.

## Getting Started

```bash
# Install
npm install

# Set environment variables
# MONGO_URL — MongoDB connection string
# DB_NAME   — database name

# Run locally
npm run dev:no-reload
```

## TestSprite Project

- Project ID: `dc688ee6-3d53-4cd9-a8a2-21229ef20a01`
- Type: Frontend
- Dashboard: [testsprite.com/dashboard](https://www.testsprite.com/dashboard/tests/dc688ee6-3d53-4cd9-a8a2-21229ef20a01)

## Hackathon Submission

- **Live URL:** https://statuspulse-vvy0.onrender.com
- **Repo:** https://github.com/0xshalah/StatusPulse
- **Participant:** Shalahuddin Al-Ayyubi (@0xshalah)
- **TestSprite Account:** awgpro020345@gmail.com
