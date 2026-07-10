# StatusPulse — TestSprite Hackathon S3 Submission

**StatusPulse** is an API monitoring platform with a built-in AI assistant you can actually talk to — *"Which APIs are down right now?"* *"Show me the incident diagnostic for the Payments API."* It combines real-time monitoring, public status pages, embeddable SVG badges, multi-channel alerts, and a triple-layer AI (chat assistant + incident diagnostic + knowledge base). And it was built — every feature — inside a genuine write → verify → fix → verify loop against the live deployment.

---

**Team**

**Shalahuddin** — Discord: `[your-discord-username]` · GitHub: `0xshalah` · X: `[your-x-handle]`

---

**Links**

- **Live app:** https://statuspulse.edgeone.dev
- **Repo:** https://github.com/0xshalah/StatusPulse
- **Loop log (259 entries, agent-written):** https://github.com/0xshalah/StatusPulse/blob/main/LOOP.md
- **Medium article (loop engineering write-up):** https://medium.com/@shalahuddin/[article-slug]
- **TestSprite dashboard:** https://www.testsprite.com/dashboard/tests/dc688ee6-3d53-4cd9-a8a2-21229ef20a01
- **CI/CD (GitHub Actions, fully operational):** https://github.com/0xshalah/StatusPulse/actions

---

**TestSprite Account**

- Account: `[your-testsprite-email]`
- Project ID: `dc688ee6-3d53-4cd9-a8a2-21229ef20a01`
- Target URL: https://statuspulse.edgeone.dev
- 17 tests banked (14 frontend + 3 backend), all `createdFrom: cli`, 100% pass rate

---

**The Loop**

StatusPulse was not built in one prompt. It was built through **30 engineering loops**, **267 documented actions**, **35+ verification reruns**, and **17 banked tests (14 frontend + 3 backend)** — all green at submission.

The loop caught **6 real regressions** that unit tests and manual QA missed:

1. **Theme toggle broke in 3 browsers** — View Transitions animation silently failed on Safari, z-index reversed in Chrome, clip-path broke on resize. 5 FAIL→FIX cycles.
2. **"Copy all badges" copied only one** — button said "all" but code grabbed `data.endpoints[0]`. Manual testing missed it because the toast *looked* correct.
3. **Maintenance window accepted end < start** — no validation blocked saving invalid date ranges. Caught by the assertion checking for the error message.
4. **Reset filters only cleared search, not status** — one-line bug (`setSearch` without `setFilter`). Automated E2E caught what visual review didn't.
5. **Dashboard N+1 → aggregation + TTL cache** — cold-start TTFB measured at 5.3s. Fixed by replacing full-history scan with a MongoDB `$sort→$group→$slice` aggregation and an in-process cache, documented and verified.
6. **Deployment platform migration** — free-tier cold starts caused intermittent 30s timeouts. The failure data forced a mid-build migration from Render to EdgeOne — an infrastructure decision driven by the loop.

The repository includes **3 committed failure bundles** (`.testsprite/failure-*`) with screenshots, DOM snapshots, and root-cause analysis — receipts of genuine iteration, not one-shot generation.

I also wrote a **backend security test** (`--type backend`) proving the boundaries no browser test can reach: mutations require auth (401), AI prompt-injection is blocked by the guardrail (400), Zod email validation rejects malformed input (400), and the public config endpoint exposes no secrets.

---

**CI/CD (+5 Bonus Points)**

The GitHub Actions pipeline gates every push through **three stages**: Vitest unit suite (70 tests) → Python backend security checks against the live app → TestSprite CLI full suite rerun. The backend security job is drift-immune and costs 0 credits at run time.

```yaml
name: StatusPulse — TestSprite Verification
on: [pull_request, push]
jobs:
  unit:         # 70 Vitest tests
  backend-security:  # Python boundary checks (auth, guardrail, validation)
  testsprite:   # needs: [unit, backend-security] — TestSprite full suite
```

---

**What the loop shaped**

- **Dual test type coverage** — frontend (14 browser flows) + backend (1 Python REST boundary check). The backend test proves the security *rejects* what the browser test proves *renders*.
- **Performance fix directly from loop data** — the dashboard 5.3s TTFB was discovered during a demo recording investigation, documented in LOOP.md with per-endpoint measurements, and fixed with server-side aggregation and TTL caching.
- **Honesty enforced by the loop** — claims in the README that couldn't be verified by a test (unimplemented email delivery, unmeasured "6 global regions") were removed. The loop made over-claiming uncomfortable.
- **Unit test regression caught** — a DNS pre-check added in a late commit broke 2 existing ping-engine tests. Vitest caught it immediately; the mock sequence was updated. Now gated in CI.

---

**CLI Contributions**

1 PR submitted to `testsprite-cli`:
- [#233](https://github.com/TestSprite/testsprite-cli/pull/233) — `fix(config): normalize empty/whitespace TESTSPRITE_PROFILE to unset` — treat a blank `TESTSPRITE_PROFILE` env var as unset (matching existing behavior for `TESTSPRITE_API_URL`/`TESTSPRITE_API_KEY`), preventing a confusing VALIDATION_ERROR.

---

**Lessons the loop taught me**

- **Verification catches what code review misses.** The maintenance window "end < start" bug and the copy-all-badges bug both passed visual review. Only automated E2E with specific assertions found them.
- **The checker tells you WHAT is wrong, not WHY.** A 3-hour debugging session traced an "AI returns empty responses" TestSprite failure to one missing `await` on an EdgeOne edge runtime. The loop flagged it; engineering found the fix.
- **Backend tests prove what the browser can't see.** Auth gates, prompt-injection guardrails, and secret hygiene are invisible from the UI. The `--type backend` test exercises these boundaries as an anonymous client.
- **A loop forces honesty.** Claims you can't verify with a test (email delivery, infrastructure numbers, dependency names) start to look dishonest. I removed three over-claims from the README.
- **UI additions break selectors.** Adding one accent picker button broke 3 tests because `button` matched 3 elements instead of 1. From that point on, every plan used explicit CSS attribute selectors (`button[data-value='down']`).

---

**Eligibility**

✅ Following @Test_Sprite on X
✅ Discord member with S3 badge
✅ Public deployment throughout build period
✅ All tests generated from submitting account
✅ Genuine multi-iteration loop (not one-shot)
✅ LOOP.md is agent-written and complete
✅ README includes live URL + loop summary
✅ CI/CD integration wired (GitHub Actions)

---

**Bonus: Reproducible Demo**

All README screenshots are generated automatically — no manual editing:
```
npm run demo
```
Outputs: 6 sequential screenshots + a video recording capturing the full AI chat flow.
