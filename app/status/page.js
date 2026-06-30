'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle, Clock, ArrowUpCircle, Bell, Wrench, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Navbar from '@/components/statuspulse/Navbar'
import StatusDot from '@/components/statuspulse/StatusDot'
import { api, statusOf, fmtPct, fmtDuration, timeAgo } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function StatusPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  const load = useCallback(async () => {
    try { setData(await api('/status')); setError(false) } catch { setError(true) } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let cancelled = false
    async function fetchWithRetry(attempt) {
      attempt = attempt || 0
      try {
        var result = await api('/status')
        if (!cancelled) { setData(result); setError(false); setLoading(false) }
      } catch (e) {
        if (!cancelled && attempt < 3) {
          setTimeout(function () { fetchWithRetry(attempt + 1) }, attempt * 1500)
        } else if (!cancelled) {
          setError(true); setLoading(false)
        }
      }
    }
    fetchWithRetry()
    var pollInterval = 20000
    var failCount = 0
    var timer
    function doPoll() {
      timer = setTimeout(async function () {
        try {
          if (!cancelled) { setData(await api('/status')); failCount = 0; pollInterval = 20000 }
        } catch (e) { failCount++; pollInterval = Math.min(120000, pollInterval * 1.5) }
        if (!cancelled) doPoll()
      }, pollInterval)
    }
    setTimeout(doPoll, 20000)
    return function () { cancelled = true; clearTimeout(timer) }
  }, [])

  const subscribe = async () => {
    setSubscribing(true)
    try { await api('/subscribe', { method: 'POST', body: JSON.stringify({ email }) }); toast.success('Subscribed to incident alerts'); setEmail('') }
    catch (e) { toast.error(e.message || 'Subscription failed') } finally { setSubscribing(false) }
  }

  const overall = data?.overall || 'unknown'
  const banner = {
    up: { icon: CheckCircle2, text: 'All systems operational', color: '#34D399' },
    degraded: { icon: AlertTriangle, text: 'Some systems degraded', color: '#FBBF24' },
    down: { icon: XCircle, text: 'Active incident in progress', color: '#F87171' },
    unknown: { icon: Clock, text: 'Awaiting data', color: '#9CA3AF' },
  }[overall]
  const BannerIcon = banner.icon

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="dark:starfield border-b border-border">
        <div className="mx-auto max-w-[900px] px-4 py-12 text-center sm:px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto flex max-w-xl flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${banner.color}22`, color: banner.color }}><BannerIcon className="h-9 w-9" /></div>
            <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl" style={{ color: banner.color }}>{banner.text}</h1>
            {data && <p className="mt-2 font-mono text-sm text-muted-foreground">{data.health.healthy}/{data.health.total} services healthy · updated {timeAgo(data.updatedAt)}</p>}
            <div className="mt-6 flex w-full max-w-md items-center gap-2">
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
              <Button onClick={subscribe} disabled={subscribing || !email} className="gap-1.5"><Bell className="h-4 w-4" /> Get alerts</Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <h2 className="font-display text-lg font-semibold">Services</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="font-mono text-sm text-muted-foreground">Loading status data…</p>
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 w-full animate-pulse rounded-2xl border border-border bg-card" />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
              <XCircle className="h-10 w-10 text-status-down" />
              <p className="mt-3 font-display text-lg font-semibold">Failed to load status</p>
              <Button variant="ghost" size="sm" onClick={load} className="mt-2 gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
            </div>
          ) : data?.endpoints.map((ep, i) => {
              const s = statusOf(ep.verdict)
              return (
                <motion.div key={ep.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, borderColor: 'rgba(225,86,124,0.3)' }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card p-4 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <StatusDot verdict={ep.verdict} />
                      <div><p className="font-medium">{ep.name}</p><p className="flex items-center gap-1 font-mono text-xs" style={{ color: s.color }}>{ep.verdict === 'maintenance' && <Wrench className="h-3 w-3" />}{s.label}</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 sm:gap-8"><Uptime label="24h" value={ep.uptime.h24} /><Uptime label="7d" value={ep.uptime.d7} /><Uptime label="30d" value={ep.uptime.d30} /></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1" title="Last 30 days">
                    {ep.heatmap.map((c) => {
                      const col = c.uptime === null ? 'hsl(var(--muted))' : c.uptime >= 100 ? '#34D399' : c.uptime >= 95 ? '#FBBF24' : c.uptime >= 90 ? '#FB923C' : '#F87171'
                      return <div key={c.date} title={`${c.date}: ${c.uptime === null ? 'no data' : c.uptime + '%'}`} className="h-4 flex-1 rounded-sm" style={{ background: col, minWidth: 4 }} />
                    })}
                  </div>
                </motion.div>
              )
            })}
        </div>

        <h2 className="mt-10 font-display text-lg font-semibold">Incident timeline</h2>
        <div className="mt-4">
          {!loading && (!data?.incidents || data.incidents.length === 0) ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-status-up" /><p className="mt-2 text-sm text-muted-foreground">No incidents recorded recently.</p></div>
          ) : (
            <div className="relative space-y-4 border-l border-border pl-6">
              {data?.incidents.map((inc) => (
                <motion.div key={inc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative">
                  <span className="absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: inc.resolved ? '#34D39922' : '#F8717122' }}>{inc.resolved ? <ArrowUpCircle className="h-4 w-4 text-status-up" /> : <XCircle className="h-4 w-4 text-status-down" />}</span>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{inc.endpointName} <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: inc.resolved ? '#34D39922' : '#F8717122', color: inc.resolved ? '#34D399' : '#F87171' }}>{inc.resolved ? 'Resolved' : 'Ongoing'}</span></p>
                      <span className="font-mono text-xs text-muted-foreground">lasted {fmtDuration(inc.durationMs)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Down from {new Date(inc.start).toLocaleString()} {inc.end ? `→ recovered ${timeAgo(inc.end)}` : '— still down'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
function Uptime({ label, value }) {
  const color = value === null ? '#9CA3AF' : value >= 99 ? '#34D399' : value >= 90 ? '#FBBF24' : '#F87171'
  return <div className="text-center"><p className="font-mono text-sm font-semibold font-mono-nums" style={{ color }}>{fmtPct(value)}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p></div>
}
