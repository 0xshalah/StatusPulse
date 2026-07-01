'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, RotateCcw, ServerCrash, Radio, Bell, X, Code2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Navbar from '@/components/statuspulse/Navbar'
import HealthScore from '@/components/statuspulse/HealthScore'
import EndpointCard from '@/components/statuspulse/EndpointCard'
import AddEndpointWizard from '@/components/statuspulse/AddEndpointWizard'
import AlertSettings from '@/components/statuspulse/SlackSettings'
import TestSpriteWidget from '@/components/statuspulse/TestSpriteWidget'
import LoopControl from '@/components/statuspulse/LoopControl'
import LoopDiagram from '@/components/statuspulse/LoopDiagram'
import { useStatusStream } from '@/hooks/useStatusStream'
import { api, timeAgo } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

function App() {
  const [data, setData] = useState({ endpoints: [], health: { healthy: 0, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [lastSweep, setLastSweep] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const onData = useCallback((res) => {
    if (res && res.endpoints) {
      setData(res)
      setLastSweep(new Date())
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchWithRetry(attempt = 0) {
      try {
        const res = await api('/dashboard')
        if (!cancelled) { onData(res); setLoading(false) }
      } catch (e) {
        if (!cancelled && attempt < 3) {
          setTimeout(() => fetchWithRetry(attempt + 1), attempt * 1500)
        } else if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchWithRetry()
    return () => { cancelled = true }
  }, [onData])
  useStatusStream(onData)

  const load = useCallback(async () => {
    try { onData(await api('/dashboard')); setLoading(false) } catch { setLoading(false) }
  }, [onData])

  const reseed = async () => {
    try { await api('/reset', { method: 'POST' }); await load(); toast.success('Demo data reset') }
    catch { toast.error('Reset failed') }
  }
  const handleDelete = async (ep) => {
    try { await api(`/endpoints/${ep.id}`, { method: 'DELETE' }); toast.success(`Deleted ${ep.name}`); load() }
    catch { toast.error('Delete failed') }
  }
  const handlePause = async (ep) => {
    try { await api(`/endpoints/${ep.id}/pause`, { method: 'POST', body: JSON.stringify({ paused: !ep.paused }) }); toast.success(ep.paused ? 'Resumed' : 'Paused'); load() }
    catch { toast.error('Action failed') }
  }
  const handleTest = async (ep) => {
    await api(`/endpoints/${ep.id}/test`, { method: 'POST' }); load()
  }

  const counts = useMemo(() => {
    const c = { all: data.endpoints.length, up: 0, degraded: 0, down: 0 }
    data.endpoints.forEach((e) => { if (c[e.verdict] !== undefined) c[e.verdict]++ })
    return c
  }, [data])

  const filtered = useMemo(() =>
    data.endpoints.filter((e) => {
      const ms = e.name.toLowerCase().includes(search.toLowerCase()) || e.url.toLowerCase().includes(search.toLowerCase())
      const mf = filter === 'all' || e.verdict === filter
      return ms && mf
    }), [data, search, filter])

  return (
    <div className="min-h-screen bg-background">
      <Navbar>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="rounded-full text-muted-foreground hover:text-foreground" aria-label="Alert settings">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        <Button onClick={() => { setEditing(null); setWizardOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add endpoint</span>
        </Button>
      </Navbar>

      <div className="dark:starfield border-b border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2px] text-muted-foreground">
                <Radio className="h-3 w-3 animate-pulse text-lime" /> Server scheduler live · SSE stream
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${data.health.down === 0 ? 'bg-lime animate-pulse' : 'bg-status-down animate-pulse'}`} />
                {data.health.down === 0 ? 'All systems operational' : `${data.health.down} endpoint(s) down`}
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                Monitor every endpoint.<br /><span className="text-primary">Catch incidents</span> before users do.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Pings run server-side per endpoint interval — no browser tab required. Updates stream in real-time.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={reseed} className="gap-1.5 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Reset demo data</Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  if (!data.endpoints.length) return toast.error('No endpoints to copy')
                  const base = typeof window !== 'undefined' ? window.location.origin : ''
                  const badges = data.endpoints.map((ep) => `![${ep.name}](${base}/api/badge/${ep.id})`).join('\n')
                  navigator.clipboard.writeText(badges).then(
                    () => toast.success(`Copied ${data.endpoints.length} badge markdown(s)`),
                    () => toast.error('Copy failed')
                  )
                }} className="gap-1.5 text-muted-foreground"><Code2 className="h-3.5 w-3.5" /> Copy badge markdown (all)</Button>
              </div>
            </div>
            <div className="lg:w-[360px] space-y-4">
              <HealthScore health={data.health} lastPing={lastSweep ? timeAgo(lastSweep) : null} />
              <LoopControl projectId="dc688ee6-3d53-4cd9-a8a2-21229ef20a01" />
              <TestSpriteWidget />
              <LoopDiagram />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search endpoints…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-8" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {(search || filter !== 'all') && (
              <button onClick={() => { setSearch(''); setFilter('all') }} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Reset filters">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All <Count n={counts.all} /></TabsTrigger>
              <TabsTrigger value="up">Up <Count n={counts.up} color="#34D399" /></TabsTrigger>
              <TabsTrigger value="degraded">Degraded <Count n={counts.degraded} color="#FBBF24" /></TabsTrigger>
              <TabsTrigger value="down">Down <Count n={counts.down} color="#F87171" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-mono text-sm text-muted-foreground">Connecting to server…</p>
                  <Button variant="ghost" size="sm" onClick={load} className="text-xs text-muted-foreground">Retry</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />)}</div>
            </div>
          ) : filtered.length === 0 ? (
            data.endpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Plus className="h-7 w-7" />
                </div>
                <p className="mt-4 font-display text-xl font-bold">Start monitoring your APIs</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">Add your first endpoint and StatusPulse will ping it every 60 seconds from our server-side scheduler.</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1 font-mono">1. Click Add endpoint</span>
                  <span className="hidden sm:inline text-muted-foreground/40">→</span>
                  <span className="rounded-full bg-muted px-3 py-1 font-mono">2. Paste your API URL</span>
                  <span className="hidden sm:inline text-muted-foreground/40">→</span>
                  <span className="rounded-full bg-muted px-3 py-1 font-mono">3. Watch it go live</span>
                </div>
                <Button className="mt-6 gap-1.5" onClick={() => { setEditing(null); setWizardOpen(true) }}><Plus className="h-4 w-4" /> Add endpoint</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                <Search className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">No matching endpoints</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilter('all') }} className="mt-2 gap-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Reset filters</Button>
              </div>
            )
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((ep, i) => (
                  <EndpointCard key={ep.id} endpoint={ep} index={i}
                    onEdit={(e) => { setEditing(e); setWizardOpen(true) }}
                    onDelete={handleDelete} onPause={handlePause} onTest={handleTest} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <AddEndpointWizard open={wizardOpen} onOpenChange={setWizardOpen} editing={editing} onSaved={load} />
      <AlertSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
function Count({ n, color }) {
  return <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold" style={{ backgroundColor: color ? `${color}22` : 'hsl(var(--muted))', color: color || 'inherit' }}>{n}</span>
}
export default App
