'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Bell,
  BarChart3,
  Globe,
  Code2,
  Clock,
  Moon,
  Check,
  X,
  Zap,
  Plus,
  Terminal,
  Mail,
  MessageSquare,
  Hash,
  ShieldCheck,
  Server,
  Sparkles,
  Database,
} from 'lucide-react'
import LandingNav from './LandingNav'
import { Reveal, CountUp, MagneticButton, ScrollProgress, EASE } from './helpers'
import StatusDot from '@/components/statuspulse/StatusDot'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

/* ----------------------------------- DATA ---------------------------------- */
const STEPS = [
  { icon: Plus, title: 'Paste your API endpoint URL', body: 'Drop in any HTTP(S) URL and set the expected status code in a 30-second wizard.' },
  { icon: Zap, title: 'We ping it every 60 seconds', body: 'Automated checks run around the clock from 6 global regions, recording latency and verdict.' },
  { icon: Bell, title: 'Get alerts when things break', body: 'Instant notifications via Slack, Email, or Discord the moment an endpoint degrades or goes down.' },
]

const FEATURES = [
  { icon: Globe, title: 'Public status page', body: 'A shareable /status page with 24h / 7d / 30d uptime for your users.' },
  { icon: Code2, title: 'Embeddable SVG badge', body: 'Drop a live up/degraded/down badge into any README with one line.' },
  { icon: Clock, title: 'Incident timeline', body: 'Automatic detection of when endpoints went down and recovered.' },
  { icon: Bell, title: 'Multi-channel alerts', body: 'Slack, Email & Discord notifications before customers notice.' },
  { icon: Moon, title: 'Dark & light mode', body: 'A terminal-grade theme that respects system preference.' },
]

const DEMO_BULLETS = [
  'Animated status grid — green / amber / red pulses',
  'Response-time sparkline for the last 30 checks',
  'Live health score across all endpoints',
  'Search & filter by status in one click',
]

const COMPARE_ROWS = [
  'Real-time dashboard',
  'Public status page',
  'Embeddable SVG badges',
  'Incident timeline',
  'Slack / Discord / Email alerts',
  'Open source',
  'Unlimited endpoints (free)',
]
const COMPARE_COLS = [
  { name: 'StatusPulse', price: 'Free forever', highlight: true, values: [true, true, true, true, true, true, true] },
  { name: 'UptimeRobot', price: 'from $7/mo', values: [true, true, false, true, true, false, false] },
  { name: 'BetterStack', price: 'from $25/mo', values: [true, true, true, true, true, false, false] },
]

const METRICS = [
  { to: 1200, suffix: '+', decimals: 0, label: 'Endpoints monitored' },
  { to: 99.99, suffix: '%', decimals: 2, label: 'Average uptime' },
  { to: 500, suffix: 'K+', decimals: 0, label: 'Pings per day' },
  { to: 6, suffix: '', decimals: 0, label: 'Global regions' },
]
const LOGOS = ['Stripe', 'Vercel', 'Linear', 'GitHub', 'Notion']

const BUILT_WITH = [
  { icon: Code2, label: 'Next.js' },
  { icon: Sparkles, label: 'Tailwind CSS' },
  { icon: Activity, label: 'Framer Motion' },
  { icon: Database, label: 'MongoDB' },
]

const FAQ = [
  { q: 'How much does StatusPulse cost?', a: 'StatusPulse is free forever during beta — every feature, unlimited endpoints, no credit card required.' },
  { q: 'How is my data secured?', a: 'We only store endpoint URLs and response metadata (status code, latency). No request bodies or credentials are ever logged, and all traffic is encrypted in transit.' },
  { q: 'Can I self-host StatusPulse?', a: 'Yes. StatusPulse is open source and ships on a Next.js + MongoDB stack you can deploy anywhere in minutes.' },
  { q: 'Which alert channels are supported?', a: 'Get notified the moment an endpoint degrades or goes down via Slack, Discord, or Email — with more channels on the way.' },
  { q: 'Does it integrate with my stack?', a: 'StatusPulse monitors any HTTP(S) endpoint and exposes a REST API plus embeddable SVG badges for your README, docs, or dashboards.' },
  { q: 'Is there an uptime SLA?', a: 'Monitoring runs 24/7 across 6 regions. During beta we target 99.99% availability for the monitoring layer itself.' },
]

const ALERT_ICONS = [MessageSquare, Mail, Hash]

/* --------------------------------- HELPERS --------------------------------- */
function MiniSpark({ color = '#34D399', data = [20, 16, 22, 10, 18, 8, 16, 12, 18, 6, 14], h = 36 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 200
  const step = w / (data.length - 1)
  const pts = data.map((d, i) => [i * step, h - ((d - min) / range) * (h - 6) - 3])
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const gid = `mg-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: h }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function MockDashboard() {
  const rows = [
    { name: 'API Gateway', v: 'up', rt: '182ms', color: '#34D399', data: [16, 14, 18, 12, 20, 10, 16, 13, 19, 9, 15] },
    { name: 'Payments API', v: 'down', rt: '1.04s', color: '#F87171', data: [10, 18, 9, 20, 11, 19, 8, 21, 10, 18, 12] },
    { name: 'Search Service', v: 'degraded', rt: '905ms', color: '#FBBF24', data: [8, 20, 9, 22, 7, 21, 8, 20, 6, 19, 9] },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card glow-pink">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-status-down/70" />
        <span className="h-3 w-3 rounded-full bg-status-degraded/70" />
        <span className="h-3 w-3 rounded-full bg-status-up/70" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">statuspulse.app/dashboard</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">System health</div>
          <div className="font-mono text-sm font-semibold">
            <span className="text-status-up">2</span>
            <span className="text-muted-foreground">/3 healthy</span>
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
              <StatusDot verdict={r.v} size={8} />
              <span className="w-28 shrink-0 truncate text-xs font-semibold">{r.name}</span>
              <div className="flex-1">
                <MiniSpark color={r.color} data={r.data} h={26} />
              </div>
              <span className="font-mono text-[11px]" style={{ color: r.color }}>{r.rt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BentoTile({ icon: Icon, title, body, className = '', delay = 0, big = false, children }) {
  return (
    <Reveal delay={delay} className={className}>
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="group relative h-full min-h-[170px] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-border to-lime/20 p-px transition-all duration-300 group-hover:from-primary/60"
      >
        <div className="relative flex h-full flex-col rounded-2xl bg-card p-5 transition-shadow duration-300 group-hover:shadow-[0_18px_44px_-18px_rgba(225,86,124,0.5)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className={`mt-4 font-display font-semibold ${big ? 'text-xl sm:text-2xl' : 'text-lg'}`}>{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          {children}
        </div>
      </motion.article>
    </Reveal>
  )
}

/* ----------------------------------- PAGE ---------------------------------- */
export default function LandingClient() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <LandingNav />

      <main id="main">
        {/* ============================= HERO ============================= */}
        <section className="relative overflow-hidden dark:starfield">
          <div className="pointer-events-none absolute inset-0 grid-overlay" aria-hidden="true" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[860px] -translate-x-1/2 rounded-full bg-primary/15 blur-[130px]" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1100px] px-4 pb-16 pt-28 text-center sm:px-6 sm:pb-20 sm:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2px] text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> Open-source uptime monitoring
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
              className="mx-auto mt-6 max-w-3xl font-display text-3xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Your APIs{' '}
              <span className="inline-block -rotate-2 rounded-full bg-lime px-3 py-0.5 text-[#1B102D]">never sleep</span>.
              <br className="hidden sm:block" /> Neither should{' '}
              <span className="inline-block rotate-1 rounded-full bg-lime px-3 py-0.5 text-[#1B102D]">your monitoring</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
              className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Real-time monitoring, instant alerts, and beautiful status pages — all in one open-source tool.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <MagneticButton>
                <Button asChild size="lg" className="gap-2 px-7 text-sm font-semibold uppercase tracking-[0.2px] transition-shadow duration-300 hover:shadow-[0_0_36px_-6px_rgba(225,86,124,0.7)]">
                  <Link href="/dashboard">Start Monitoring Free <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </MagneticButton>
              <Button asChild size="lg" variant="outline" className="gap-2 px-7">
                <Link href="/status">View live status</Link>
              </Button>
            </motion.div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">No credit card · Free forever · 2-minute setup</p>

            {/* Floating product mock */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
              className="mx-auto mt-16 max-w-2xl"
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                <MockDashboard />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ========================== HOW IT WORKS ======================== */}
        <section id="how" className="border-t border-border">
          <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-lime">How it works</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Live in under a minute</h2>
            </Reveal>
            <div className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE }}
                className="absolute left-[16%] right-[16%] top-7 hidden h-px origin-left bg-gradient-to-r from-primary via-lime to-primary md:block"
                aria-hidden="true"
              />
              {STEPS.map((s, i) => (
                <Reveal key={i} delay={i * 0.12} className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 font-mono text-xs text-lime">STEP {i + 1}</div>
                  <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{s.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ LIVE DEMO ========================= */}
        <section id="demo" className="border-t border-border bg-muted/20">
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <MockDashboard />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-lime">Live dashboard</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Watch your endpoints in real-time</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                A terminal-grade dashboard that updates every sweep. Spot a slow endpoint before it becomes an outage.
              </p>
              <ul className="mt-6 space-y-3">
                {DEMO_BULLETS.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <MagneticButton className="mt-7">
                <Button asChild className="gap-2">
                  <Link href="/dashboard">Open the dashboard <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </MagneticButton>
            </motion.div>
          </div>
        </section>

        {/* ============================= FEATURES ========================= */}
        <section id="features" className="border-t border-border">
          <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-lime">Features</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Everything you need to stay up</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                A complete observability surface for your endpoints — without the enterprise price tag.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[190px]">
              {/* Big tile */}
              <BentoTile
                icon={BarChart3}
                title="Real-time dashboard"
                body="Animated status grid with response-time sparklines and a live health score across every endpoint."
                big
                className="sm:col-span-2 lg:col-span-2 lg:row-span-2"
                delay={0}
              >
                <div className="mt-auto pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-background/40 p-2"><MiniSpark color="#34D399" h={30} /></div>
                    <div className="rounded-lg border border-border bg-background/40 p-2"><MiniSpark color="#FBBF24" data={[8, 20, 9, 22, 7, 21, 8, 20, 6, 19, 9]} h={30} /></div>
                    <div className="rounded-lg border border-border bg-background/40 p-2"><MiniSpark color="#F87171" data={[10, 18, 9, 20, 11, 19, 8, 21, 10, 18, 12]} h={30} /></div>
                  </div>
                </div>
              </BentoTile>
              {FEATURES.map((f, i) => (
                <BentoTile key={f.title} icon={f.icon} title={f.title} body={f.body} delay={(i + 1) * 0.1} />
              ))}
            </div>
          </div>
        </section>

        {/* =========================== COMPARISON ========================= */}
        <section id="compare" className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-lime">Why StatusPulse</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">How we compare</h2>
            </Reveal>
            <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
              {COMPARE_COLS.map((col, ci) => (
                <Reveal key={col.name} delay={ci * 0.12}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                      col.highlight ? 'border-primary/50 bg-card glow-pink' : 'border-border bg-card/60'
                    }`}
                  >
                    {col.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1B102D]">
                        Recommended
                      </span>
                    )}
                    <div className="text-center">
                      <h3 className={`font-display text-lg font-semibold ${col.highlight ? 'text-primary' : ''}`}>{col.name}</h3>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">{col.price}</p>
                    </div>
                    <ul className="mt-6 space-y-3">
                      {COMPARE_ROWS.map((row, ri) => (
                        <li key={ri} className="flex items-center gap-3 text-sm">
                          {col.values[ri] ? (
                            <Check className="h-4 w-4 shrink-0 text-status-up" />
                          ) : (
                            <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}
                          <span className={col.values[ri] ? '' : 'text-muted-foreground/50'}>{row}</span>
                        </li>
                      ))}
                    </ul>
                    {col.highlight && (
                      <MagneticButton className="mt-6">
                        <Button asChild className="w-full gap-2">
                          <Link href="/dashboard">Start Monitoring Free <ArrowRight className="h-4 w-4" /></Link>
                        </Button>
                      </MagneticButton>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ METRICS =========================== */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {METRICS.map((m, i) => (
                <Reveal key={m.label} delay={i * 0.1} className="text-center">
                  <div className="font-display text-4xl font-bold text-primary sm:text-5xl">
                    <CountUp to={m.to} suffix={m.suffix} decimals={m.decimals} className="font-mono-nums" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{m.label}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.2} className="mt-16 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">Trusted by developers from</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
                {LOGOS.map((l) => (
                  <span key={l} className="font-display text-xl font-bold tracking-tight text-foreground/70 grayscale transition-colors hover:text-foreground">
                    {l}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ======================== SETUP / TERMINAL ====================== */}
        <section id="setup" className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-[760px] px-4 py-20 sm:px-6">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-lime">Developer-first</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Set it up in seconds</h2>
            </Reveal>
            <Reveal delay={0.1} className="mt-10">
              <div className="overflow-hidden rounded-xl border border-border bg-[#150f23]">
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                  <Terminal className="h-4 w-4 text-lime" />
                  <span className="font-mono text-xs text-muted-foreground">bash</span>
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
<code>
<span className="text-muted-foreground">$ </span><span className="text-foreground">npx statuspulse add https://api.example.com</span>{'\n'}
<span className="text-lime">✓</span> <span className="text-muted-foreground">Endpoint added · expecting 200</span>{'\n'}
<span className="text-muted-foreground">$ </span><span className="text-foreground">statuspulse monitor --interval 60s</span>{'\n'}
<span className="text-lime">✓</span> <span className="text-muted-foreground">Endpoint healthy (201ms)</span>{'\n'}
<span className="text-lime">✓</span> <span className="text-muted-foreground">Endpoint healthy (188ms)</span>
</code>
                </pre>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="mt-8">
              <p className="text-center text-xs uppercase tracking-[0.2px] text-muted-foreground">Built with</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {BUILT_WITH.map((b) => (
                  <span key={b.label} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                    <b.icon className="h-4 w-4 text-primary" /> {b.label}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ============================== FAQ ============================= */}
        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-[760px] px-4 py-20 sm:px-6">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-lime">FAQ</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Questions, answered</h2>
            </Reveal>
            <Reveal delay={0.1} className="mt-10">
              <Accordion type="single" collapsible className="w-full">
                {FAQ.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border">
                    <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                      <span className="flex items-center gap-3">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-lime" />
                        {item.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-5 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* =========================== FINAL CTA ========================== */}
        <section className="relative border-t border-border dark:starfield">
          <Squiggle />
          <div className="relative mx-auto max-w-[900px] px-4 py-20 text-center sm:px-6">
            <Reveal>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Start monitoring in <span className="inline-block -rotate-1 rounded-full bg-lime px-3 py-0.5 text-[#1B102D]">60 seconds</span>.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
                No setup, no credit card. Add your first endpoint and watch it go live.
              </p>
              <MagneticButton className="mt-8">
                <Button asChild size="lg" className="gap-2 px-8 text-sm font-semibold uppercase tracking-[0.2px] transition-shadow duration-300 hover:shadow-[0_0_36px_-6px_rgba(225,86,124,0.7)]">
                  <Link href="/dashboard">Start Monitoring Free <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </MagneticButton>
              <p className="mt-3 font-mono text-xs text-muted-foreground">No credit card · Free forever · 2-minute setup</p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function Squiggle() {
  return (
    <svg viewBox="0 0 1200 12" preserveAspectRatio="none" className="absolute -top-1.5 left-0 h-3 w-full text-lime" aria-hidden="true">
      <path
        d="M0,6 Q30,0 60,6 T120,6 T180,6 T240,6 T300,6 T360,6 T420,6 T480,6 T540,6 T600,6 T660,6 T720,6 T780,6 T840,6 T900,6 T960,6 T1020,6 T1080,6 T1140,6 T1200,6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  )
}

function Footer() {
  const cols = [
    { title: 'Product', links: [['Dashboard', '/dashboard'], ['Public Status', '/status'], ['Pricing', '#'], ['Changelog', '#']] },
    { title: 'Resources', links: [['Docs', '#'], ['API Reference', '#'], ['SVG Badges', '#'], ['Blog', '#']] },
    { title: 'Company', links: [['About', '#'], ['Open Source', '#'], ['Contact', '#'], ['Status', '/status']] },
  ]
  return (
    <footer className="relative border-t border-border">
      <Squiggle />
      <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="StatusPulse home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">StatusPulse</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Open-source uptime monitoring, status pages and badges for developers who ship.
            </p>
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono text-xs">SOC-friendly · Encrypted in transit</span>
            </div>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">{c.title}</p>
              <ul className="mt-4 space-y-2">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-foreground/80 transition-colors hover:text-lime">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">© {new Date().getFullYear()} StatusPulse. All systems go.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="/status" className="hover:text-foreground">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
