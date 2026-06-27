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
  Plus,
  Zap,
  Quote,
} from 'lucide-react'
import Navbar from '@/components/statuspulse/Navbar'
import { Button } from '@/components/ui/button'
import StatusDot from '@/components/statuspulse/StatusDot'

// Scroll reveal wrapper
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const STEPS = [
  {
    icon: Plus,
    title: 'Add your endpoint',
    body: 'Paste any URL, set the expected status code and check interval in a 30-second wizard.',
  },
  {
    icon: Zap,
    title: 'We ping every 60s',
    body: 'A background scheduler hits your endpoint, records response time and computes a health verdict.',
  },
  {
    icon: Bell,
    title: 'Get alerts & badges',
    body: 'Watch the live dashboard, share a public status page, and embed an always-fresh SVG badge.',
  },
]

const FEATURES = [
  { icon: BarChart3, title: 'Real-time dashboard', body: 'Animated status grid with response-time sparklines and a live health score.' },
  { icon: Globe, title: 'Public status page', body: 'A shareable /status page with 24h / 7d / 30d uptime for your users.' },
  { icon: Code2, title: 'Embeddable SVG badge', body: 'Drop a live up/degraded/down badge into any GitHub README with one line.' },
  { icon: Clock, title: 'Incident timeline', body: 'Automatic detection of when endpoints went down and recovered.' },
  { icon: Bell, title: 'Multi-channel alerts', body: 'Know the moment something breaks — before your customers tweet about it.' },
  { icon: Moon, title: 'Dark mode', body: 'A terminal-grade dark theme that respects your system preference.' },
]

const QUOTES = [
  {
    quote: 'We replaced three dashboards with StatusPulse. The sparklines alone caught a memory leak we’d been chasing for weeks.',
    name: 'Maya Chen',
    role: 'Staff SRE, Northwind',
  },
  {
    quote: 'The public status page took five minutes to set up and instantly cut our “is the API down?” tickets in half.',
    name: 'Dev Patel',
    role: 'Founder, ShipFast',
  },
  {
    quote: 'Embeddable badges in our READMEs make our OSS look alive. Customers trust what they can see.',
    name: 'Lina Okafor',
    role: 'DX Lead, Quanta',
  },
]

const PLAN_FEATURES = [
  'Unlimited endpoints',
  '60-second checks',
  'Real-time dashboard',
  'Public status page',
  'Embeddable SVG badges',
  'Incident timeline',
  'Uptime: 24h / 7d / 30d',
  'Dark & light mode',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar>
        <Button asChild className="gap-1.5">
          <Link href="/dashboard">
            <span className="hidden sm:inline">Start Monitoring</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Navbar>

      {/* HERO */}
      <section className="relative overflow-hidden dark:starfield">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative mx-auto max-w-[1100px] px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2px] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Uptime monitoring for developers
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl"
          >
            Your APIs never sleep.{' '}
            <span className="text-primary">Neither should your monitoring.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            StatusPulse pings every endpoint around the clock — tracking response times, uptime and
            incidents — so you catch problems before your users ever notice.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="gap-2 px-7 text-sm font-semibold uppercase tracking-[0.2px]">
              <Link href="/dashboard">
                Start Monitoring Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 px-7">
              <Link href="/status">View live status</Link>
            </Button>
          </motion.div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">No credit card · Free forever</p>

          {/* Product UI mock */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mx-auto mt-14 max-w-3xl"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card glow-pink">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-status-down/70" />
                <span className="h-3 w-3 rounded-full bg-status-degraded/70" />
                <span className="h-3 w-3 rounded-full bg-status-up/70" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">statuspulse.app/dashboard</span>
              </div>
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
                {[
                  { name: 'API Gateway', v: 'up', rt: '182ms' },
                  { name: 'Payments API', v: 'down', rt: '1.04s' },
                  { name: 'Search Service', v: 'degraded', rt: '905ms' },
                ].map((e, i) => (
                  <MockCard key={i} {...e} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2px] text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Live in under a minute</h2>
          </Reveal>
          <div className="relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
            {STEPS.map((s, i) => (
              <Reveal key={i} delay={i * 0.12} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 font-mono text-xs text-muted-foreground">STEP {i + 1}</div>
                <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2px] text-primary">Features</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Everything you need to stay up</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              A complete observability surface for your endpoints — without the enterprise price tag.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2px] text-primary">Loved by builders</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Trusted by fast-moving teams</h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {QUOTES.map((q, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <Quote className="h-7 w-7 text-primary/60" />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
                    “{q.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
                      {q.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{q.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{q.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2px] text-primary">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">One plan. Everything included.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              StatusPulse is free while we’re in beta — every feature, no limits.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mx-auto mt-12 max-w-md">
            <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-card p-8 glow-pink">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2px] text-primary">
                <Activity className="h-3.5 w-3.5" /> Free Beta
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-6xl font-bold">$0</span>
                <span className="pb-2 text-sm text-muted-foreground">/ forever</span>
              </div>
              <ul className="mt-6 space-y-3">
                {PLAN_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-up/20 text-status-up">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-8 w-full gap-2 text-sm font-semibold uppercase tracking-[0.2px]">
                <Link href="/dashboard">
                  Start Monitoring Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-border dark:starfield">
        <div className="mx-auto max-w-[900px] px-4 py-20 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Start monitoring in <span className="text-primary">60 seconds</span>.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              No setup, no credit card. Add your first endpoint and watch it go live.
            </p>
            <Button asChild size="lg" className="mt-7 gap-2 px-8 text-sm font-semibold uppercase tracking-[0.2px]">
              <Link href="/dashboard">
                Start Monitoring Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}

function MockCard({ name, v, rt }) {
  const color = { up: '#34D399', degraded: '#FBBF24', down: '#F87171' }[v]
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot verdict={v} size={8} />
          <span className="text-xs font-semibold">{name}</span>
        </div>
        <span className="font-mono text-[10px]" style={{ color }}>{rt}</span>
      </div>
      <svg viewBox="0 0 120 28" className="mt-3 w-full" style={{ height: 28 }}>
        <path
          d="M0,20 L15,16 L30,22 L45,10 L60,18 L75,8 L90,16 L105,12 L120,18"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function Footer() {
  const cols = [
    { title: 'Product', links: [['Dashboard', '/dashboard'], ['Public Status', '/status'], ['Pricing', '/']] },
    { title: 'Resources', links: [['Docs', '/'], ['SVG Badges', '/'], ['Changelog', '/']] },
    { title: 'Company', links: [['About', '/'], ['Blog', '/'], ['Contact', '/']] },
  ]
  return (
    <footer className="border-t border-border">
      {/* lime-style squiggle divider, recolored to brand pink */}
      <svg viewBox="0 0 1200 12" preserveAspectRatio="none" className="h-3 w-full text-primary">
        <path
          d="M0,6 Q30,0 60,6 T120,6 T180,6 T240,6 T300,6 T360,6 T420,6 T480,6 T540,6 T600,6 T660,6 T720,6 T780,6 T840,6 T900,6 T960,6 T1020,6 T1080,6 T1140,6 T1200,6"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.7"
        />
      </svg>
      <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">StatusPulse</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Uptime monitoring, status pages and badges for developers who ship.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">{c.title}</p>
              <ul className="mt-4 space-y-2">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-foreground/80 transition-colors hover:text-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">© {new Date().getFullYear()} StatusPulse. All systems go.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Privacy</Link>
            <Link href="/" className="hover:text-foreground">Terms</Link>
            <Link href="/status" className="hover:text-foreground">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
