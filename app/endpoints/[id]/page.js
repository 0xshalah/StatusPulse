'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Gauge, Activity, Timer, Zap, Pause, Play, Pencil, Trash2, CalendarClock, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Navbar from '@/components/statuspulse/Navbar'
import StatusDot from '@/components/statuspulse/StatusDot'
import AddEndpointWizard from '@/components/statuspulse/AddEndpointWizard'
import { api, statusOf, fmtMs, fmtPct, fmtDuration, timeAgo } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useRouter } from 'next/navigation'

export default function EndpointDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [maintStart, setMaintStart] = useState('')
  const [maintEnd, setMaintEnd] = useState('')
  const [maintError, setMaintError] = useState('')

  const load = useCallback(async () => {
    try { setD(await api(`/endpoints/${id}/detail`)) } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [id])
  useEffect(() => {
    var cancelled = false
    async function fetchWithRetry(attempt) {
      attempt = attempt || 0
      try {
        var detail = await api(`/endpoints/${id}/detail`)
        if (!cancelled) { setD(detail); setLoading(false) }
      } catch (e) {
        if (!cancelled && attempt < 3) {
          setTimeout(function () { fetchWithRetry(attempt + 1) }, attempt * 1500)
        } else if (!cancelled) {
          toast.error('Failed to load'); setLoading(false)
        }
      }
    }
    fetchWithRetry()
    var pollInterval = 10000
    var failCount = 0
    var timer
    function doPoll() {
      timer = setTimeout(async function () {
        try {
          if (!cancelled) { setD(await api(`/endpoints/${id}/detail`)); failCount = 0; pollInterval = 10000 }
        } catch (e) { failCount++; pollInterval = Math.min(60000, pollInterval * 1.5) }
        if (!cancelled) doPoll()
      }, pollInterval)
    }
    setTimeout(doPoll, 10000)
    return function () { cancelled = true; clearTimeout(timer) }
  }, [load])

  if (loading) return <Shell><div className="h-96 animate-pulse rounded-2xl border border-border bg-card" /></Shell>
  if (!d) return <Shell><p className="text-muted-foreground">Endpoint not found.</p></Shell>

  const ep = d.endpoint
  const s = statusOf(d.verdict)
  const chartData = d.history.map((p) => ({ t: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), rt: p.responseTime, verdict: p.verdict }))

  const test = async () => { await api(`/endpoints/${id}/test`, { method: 'POST' }); toast.success('Re-checked'); load() }
  const pause = async () => { await api(`/endpoints/${id}/pause`, { method: 'POST', body: JSON.stringify({ paused: !ep.paused }) }); load() }
  const del = async () => { await api(`/endpoints/${id}`, { method: 'DELETE' }); toast.success('Deleted'); router.push('/dashboard') }
  const saveMaintenance = async () => {
    setMaintError('')
    if (maintStart && maintEnd && new Date(maintEnd) <= new Date(maintStart)) {
      setMaintError('End time must be after start time')
      return
    }
    await api(`/endpoints/${id}`, { method: 'PUT', body: JSON.stringify({ maintenanceStart: maintStart, maintenanceEnd: maintEnd }) })
    toast.success('Maintenance window saved')
    load()
  }

  return (
    <Shell>
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">StatusPulse</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground truncate max-w-[200px]">{ep.name}</span>
      </nav>
      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-1"><StatusDot verdict={d.verdict} /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">{ep.name}</h1>
            <a href={ep.url} target="_blank" rel="noreferrer" className="font-mono text-sm text-muted-foreground hover:text-primary">{ep.url}</a>
          </div>
          <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: `${s.color}22`, color: s.color }}>{s.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={test} className="gap-1.5"><Zap className="h-4 w-4" /> Test now</Button>
          <Button variant="outline" size="sm" onClick={pause} className="gap-1.5">{ep.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {ep.paused ? 'Resume' : 'Pause'}</Button>
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 text-status-down"><Trash2 className="h-4 w-4" /> Delete</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete “{ep.name}”?</AlertDialogTitle><AlertDialogDescription>This removes the endpoint and all history.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-status-down text-white" onClick={del}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="p50" value={fmtMs(d.percentiles.p50)} icon={Gauge} />
        <Stat label="p95" value={fmtMs(d.percentiles.p95)} icon={Gauge} />
        <Stat label="p99" value={fmtMs(d.percentiles.p99)} icon={Gauge} />
        <Stat label="Uptime 24h" value={fmtPct(d.uptime.h24)} icon={Activity} />
        <Stat label="Uptime 7d" value={fmtPct(d.uptime.d7)} icon={Activity} />
        <Stat label="Uptime 30d" value={fmtPct(d.uptime.d30)} icon={Activity} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5 text-lime" /> Maintenance Window</h2>
        {ep.maintenanceStart && ep.maintenanceEnd ? (
          <p className="mt-2 font-mono text-sm">
            Scheduled maintenance: <span className="text-primary">{new Date(ep.maintenanceStart).toLocaleString()}</span> → <span className="text-primary">{new Date(ep.maintenanceEnd).toLocaleString()}</span>
          </p>
        ) : <p className="mt-2 text-sm text-muted-foreground">No maintenance window set.</p>}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="maint-start" className="mb-1 block text-xs font-medium text-muted-foreground">Start (datetime-local)</label>
            <input id="maint-start" type="datetime-local" value={maintStart} onChange={(e) => setMaintStart(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label htmlFor="maint-end" className="mb-1 block text-xs font-medium text-muted-foreground">End (datetime-local)</label>
            <input id="maint-end" type="datetime-local" value={maintEnd} onChange={(e) => setMaintEnd(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
        {maintError && <p className="mt-2 text-sm text-status-down" id="maint-error">{maintError}</p>}
        <Button onClick={saveMaintenance} size="sm" className="mt-3 gap-1.5"><CalendarClock className="h-4 w-4" /> Save Window</Button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Response time · last 24h</h2>
        <div className="mt-4">
          {chartData.length < 2 ? <div className="flex h-64 items-center justify-center"><Empty>Collecting data… the server scheduler pings every {ep.interval}s.</Empty></div> : (
            <RtChart data={chartData} />
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Uptime · last 30 days</h2>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {d.heatmap.map((cell) => {
            const c = cell.uptime === null ? 'hsl(var(--muted))' : cell.uptime >= 100 ? '#34D399' : cell.uptime >= 95 ? '#FBBF24' : cell.uptime >= 90 ? '#FB923C' : '#F87171'
            return <div key={cell.date} title={`${cell.date}: ${cell.uptime === null ? 'no data' : cell.uptime + '%'}`} className="h-6 w-6 rounded" style={{ background: c }} />
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <Legend c="#34D399" t="100%" /><Legend c="#FBBF24" t="95-99%" /><Legend c="#FB923C" t="90-94%" /><Legend c="#F87171" t="<90%" />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Recent incidents</h2>
        {d.incidents.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No incidents recorded.</p> : (
          <ul className="mt-3 space-y-2">
            {d.incidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{new Date(inc.start).toLocaleString()} {inc.end ? `→ recovered` : '— ongoing'}</span>
                <span className="font-mono text-xs" style={{ color: inc.resolved ? '#34D399' : '#F87171' }}>{inc.resolved ? `resolved · ${fmtDuration(inc.durationMs)}` : 'ongoing'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {d.verdict === 'down' && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                Deep Verify with TestSprite
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">Innovation</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                StatusPulse detected this endpoint is down. TestSprite CLI can provide deeper analysis that ping monitoring alone cannot.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg bg-card/60 p-3">
                  <span className="mt-0.5 text-xs">📸</span>
                  <div>
                    <p className="text-xs font-semibold">Browser Screenshot</p>
                    <p className="text-[11px] text-muted-foreground">See exactly what users see when your endpoint fails</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-card/60 p-3">
                  <span className="mt-0.5 text-xs">🧬</span>
                  <div>
                    <p className="text-xs font-semibold">DOM Snapshot</p>
                    <p className="text-[11px] text-muted-foreground">Readable DOM structure at point of failure</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-card/60 p-3">
                  <span className="mt-0.5 text-xs">🎯</span>
                  <div>
                    <p className="text-xs font-semibold">Root Cause</p>
                    <p className="text-[11px] text-muted-foreground">AI-powered analysis of what broke and why</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-card/60 p-3">
                  <span className="mt-0.5 text-xs">🔧</span>
                  <div>
                    <p className="text-xs font-semibold">Fix Suggestion</p>
                    <p className="text-[11px] text-muted-foreground">Actionable code-level fix for your agent</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                From terminal: <code className="rounded bg-muted px-1">testsprite test create --project dc688ee6 --plan-from plan.json --run --wait</code>
                <br />→ returns one self-consistent failure bundle your agent can act on.
              </p>
            </div>
          </div>
        </div>
      )}

      <AddEndpointWizard open={wizardOpen} onOpenChange={setWizardOpen} editing={ep} onSaved={load} />
    </Shell>
  )
}

function Shell({ children }) {
  return <div className="min-h-screen bg-background"><Navbar /><div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">{children}</div></div>
}
function Stat({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-border bg-card p-3"><div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div><p className="mt-1 font-mono text-lg font-semibold font-mono-nums">{value}</p></div>
}
function Empty({ children }) { return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{children}</div> }
function Legend({ c, t }) { return <span className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: c }} /> {t}</span> }

// Lightweight interactive SVG area chart (replaces heavy recharts in dev)
function RtChart({ data }) {
  const [hover, setHover] = useState(null)
  const W = 760, H = 240, padL = 44, padB = 24, padT = 12
  const rts = data.map((d) => d.rt)
  const max = Math.max(...rts), min = Math.min(...rts)
  const range = max - min || 1
  const iw = W - padL - 8, ih = H - padB - padT
  const x = (i) => padL + (i / (data.length - 1)) * iw
  const y = (v) => padT + ih - ((v - min) / range) * ih
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.rt).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${padT + ih} L${padL},${padT + ih} Z`
  const ticks = [max, Math.round((max + min) / 2), min]
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - padL) / iw) * (data.length - 1))
    if (i >= 0 && i < data.length) setHover(i)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 256 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs><linearGradient id="rtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E1567C" stopOpacity="0.4" /><stop offset="100%" stopColor="#E1567C" stopOpacity="0" /></linearGradient></defs>
      {ticks.map((t, i) => {
        const yy = padT + (i / 2) * ih
        return <g key={i}><line x1={padL} y1={yy} x2={W - 8} y2={yy} stroke="hsl(var(--border))" strokeDasharray="3 3" /><text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))" fontFamily="JetBrains Mono, monospace">{t}ms</text></g>
      })}
      <path d={area} fill="url(#rtg)" />
      <path d={line} fill="none" stroke="#E1567C" strokeWidth="2" strokeLinejoin="round" />
      {hover !== null && (
        <g>
          <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + ih} stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <circle cx={x(hover)} cy={y(data[hover].rt)} r="4" fill="#E1567C" stroke="hsl(var(--card))" strokeWidth="2" />
          <text x={Math.min(W - 80, Math.max(padL, x(hover)))} y={padT + 2} textAnchor="middle" fontSize="11" fill="hsl(var(--foreground))" fontFamily="JetBrains Mono, monospace">{data[hover].rt}ms · {data[hover].t}</text>
        </g>
      )}
    </svg>
  )
}

