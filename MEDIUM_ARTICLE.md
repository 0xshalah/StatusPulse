# What 29 Loop Iterations With an AI Testing CLI Taught Me About Shipping Reliable Software

*I let an AI coding agent build a production-style API monitoring platform — but only if it proved every feature worked against the live app first. Here's what the loop caught that code review never would.*

---

There's a quiet lie in AI-assisted development: the code compiles, the agent says "done," and you believe it.

I didn't want to believe it. So for one build, I changed the rule. My AI coding agent wasn't allowed to call anything "done" until a real browser — running in the cloud, against the live app — confirmed it actually worked. Every feature. Every fix.

The result was **StatusPulse**, an API monitoring platform with a real-time dashboard, public status pages, embeddable badges, and an AI assistant you can ask *"which APIs are down right now?"* It was built across **29 loop iterations**, **259 documented actions**, and **14 banked tests** — all green at submission.

But the interesting part isn't the app. It's the ten times the loop caught something I would have shipped broken.

## The problem with one-shot AI coding

Coding agents hit three hard walls. Requirements fall out of a finite context window. Roughly one in five new features quietly breaks something that already worked. And the industry's answer to quality has mostly been "pay for a bigger model."

The data backs this up. In public benchmarks where AI agents build the same app under a verification loop, feature delivery climbed from **42% to 92%** — same models, just given the ability to check their own work. Even the strongest runs still broke ~12% of previously-passing features without a checker watching.

A loop with no real checker doesn't fail loudly. It hallucinates progress.

## The setup: a checker, not a spot-check

The tool I used was the [TestSprite CLI](https://github.com/TestSprite/testsprite-cli) — an open-source command-line tester that runs real browser and API flows in the cloud and hands the agent back one self-consistent failure bundle: the failing step, screenshots, a DOM snapshot, a root-cause hypothesis, and a fix target.

Setup was one command:

```bash
npm install -g @testsprite/testsprite-cli
testsprite setup
```

From there the loop is four steps, and one repeats:

```
WRITE  →  VERIFY  →  FIX  →  VERIFY AGAIN
(agent)  (CLI runs)  (agent)  (CLI reruns → bank)
```

Not covered yet? `testsprite test create`. Already covered? `testsprite test rerun` — so nothing that used to work breaks silently. Every pass gets banked into a durable suite that grows with the project — a memory far bigger than any context window.

## Five moments the loop changed the project

### 1. The theme toggle that broke in three browsers

A dark/light theme toggle with a circular View Transitions animation looked perfect in Chrome. The checker disagreed — and kept disagreeing. It took **five separate FAIL→FIX cycles**: a missing animation in Safari, reversed z-index layering in Chrome, a clip-path that broke on resize, a stale pseudo-element selector, and finally a Firefox fallback.

Each fix uncovered a new edge case. Without a loop that reruns across environments, this ships broken in two of three major browsers and I never know until a user files a bug.

### 2. "Copy all badges" that copied one

The dashboard had a *"Copy all badges"* button. Manual testing worked — I clicked it, a badge copied, toast appeared. Ship it.

The automated flow caught what my eyes didn't: the handler grabbed `data.endpoints[0]` — a single endpoint. The button labeled "all" copied one. A one-line iteration bug that survives manual testing precisely because it *looks* like it works.

### 3. The deployment platform I had to abandon

Early on, tests passed locally but flaked in the cloud. The failure bundles pointed at 30-second cold-start timeouts on my first host's free tier. This wasn't a code bug — it was infrastructure the verification data exposed.

I migrated the entire deployment mid-build. That decision came from the loop, not from a plan.

### 4. The 5.3-second dashboard

Chasing a slow demo, I measured every API call's time-to-first-byte. One dominated:

```
/api/dashboard:  5,336 ms   ← bottleneck
/api/status:       829 ms
/api/endpoints:    607 ms
```

The dashboard was pulling *every* historical ping for *every* endpoint, then trimming to the latest 30 in memory. I rewrote it as a MongoDB aggregation that slices 30 per endpoint server-side, and added a short-TTL cache so concurrent polls collapse to one query. Documented, measured, fixed — because the loop made the cost visible.

### 5. Proving what the browser can't see

Here's the one most people skip. A frontend test proves a page *renders*. It can't prove the server *rejects* a forged request.

So I added a backend test — a Python script the CLI runs as an anonymous client against the live API — asserting the boundaries no UI reveals:

```
POST /api/endpoints (no auth)          → 401  ✅
POST /api/chat  "ignore instructions…" → 400  ✅ (guardrail blocks it)
POST /api/subscribe {email:"bad"}      → 400  ✅ (validation rejects it)
GET  /api/config                       → no secrets in the payload ✅
```

The security layer wasn't just built. It was *proven*.

## The honest part

Not every lesson was a win.

The loop made me confront claims I'd let slip into the README — an "email alerts" feature that only captured subscribers but never sent anything, and a "6 global regions" line that was pure marketing. Writing tests that assert real behavior has a side effect: it gets uncomfortable to keep claims you can't verify. I cut them.

I also relied on frontend tests longer than I should have. The single most valuable test I wrote — the backend security check — came late. If I did it again, I'd write it on day one.

## What I'd tell you to do Monday morning

If you build with an AI agent and quality is slipping across long sessions, wire in a real checker. Concretely:

- **Deploy to a public URL on day one.** A cloud checker needs a live target. Localhost doesn't count.
- **Bank every pass.** Coverage compounds. The next run re-checks everything that ever worked.
- **Write one backend/API test early.** Auth, validation, and guardrails are invisible to a browser test — and they're where the real damage lives.
- **Read the failure bundle, don't guess.** Root cause beats vibes. The checker tells you *what* broke; finding the fix is still engineering.
- **Let the loop question your claims.** If a test can't assert it, your README probably shouldn't promise it.
- **One-shot is not a loop.** A single run isn't verification. The value is in the rerun.

The best software I shipped this year wasn't the product of a smarter model or a longer prompt. It was the product of the best *loop* — a system that assumed the agent was wrong until a real user flow proved otherwise.

Turns out that's a good assumption for humans, too.

---

*StatusPulse is open source (Apache 2.0). Live app: [statuspulse.edgeone.dev](https://statuspulse.edgeone.dev) · Code + the full 259-entry loop log: [github.com/0xshalah/StatusPulse](https://github.com/0xshalah/StatusPulse). Built for TestSprite Hackathon Season 3 — "Build the Loop."*

*If this was useful, I'm sharing more on how the loop reshaped each decision — follow along.*
