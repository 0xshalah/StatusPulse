'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, RotateCcw, ServerCrash, Radio, Bell } from 'lucide-react'
import { toast } from 'sonner'
import Navbar from '@/components/statuspulse/Navbar'
import HealthScore from '@/components/statuspulse/HealthScore'
import EndpointCard from '@/components/statuspulse/EndpointCard'
import AddEndpointWizard from '@/components/statuspulse/AddEndpointWizard'
import AlertSettings from '@/components/statuspulse/SlackSettings'
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

  useEffect(() => { api('/dashboard').then(onData).catch(() => setLoading(false)) }, [onData])
  useStatusStream(onData) // SSE real-time (polling fallback built-in)

  const reseed = async () => {
    try { await api('/reset', { method: 'POST' }); onData(await api('/dashboard')); toast.success('Demo data reset') }
    catch { toast.error('Reset failed') }
  }
  const handleDelete = async (ep) => {
    try { await api(`/endpoints/${ep.id}`, { method: 'DELETE' }); toast.success(`Deleted ${ep.name}`); onData(await api('/dashboard')) }
    catch { toast.error('Delete failed') }
  }
  const handlePause = async (ep) => {
    try { await api(`/endpoints/${ep.id}/pause`, { method: 'POST', body: JSON.stringify({ paused: !ep.paused }) }); toast.success(ep.paused ? 'Resumed' : 'Paused'); onData(await api('/dashboard')) }
    catch { toast.error('Action failed') }
  }
  const handleTest = async (ep) => {
    await api(`/endpoints/${ep.id}/test`, { method: 'POST' }); onData(await api('/dashboard'))
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
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                Monitor every endpoint.<br /><span className="text-primary">Catch incidents</span> before users do.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Pings run server-side per endpoint interval — no browser tab required. Updates stream in real-time.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={reseed} className="gap-1.5 text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Reset demo data</Button>
              </div>
            </div>
            <div className="lg:w-[360px]"><HealthScore health={data.health} lastPing={lastSweep ? timeAgo(lastSweep) : null} /></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search endpoints…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <ServerCrash className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-display text-lg font-semibold">No endpoints found</p>
              <p className="mt-1 text-sm text-muted-foreground">{data.endpoints.length === 0 ? 'Add your first endpoint to start monitoring.' : 'Try a different search or filter.'}</p>
              <Button className="mt-4 gap-1.5" onClick={() => { setEditing(null); setWizardOpen(true) }}><Plus className="h-4 w-4" /> Add endpoint</Button>
            </div>
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

      <AddEndpointWizard open={wizardOpen} onOpenChange={setWizardOpen} editing={editing} onSaved={async () => onData(await api('/dashboard'))} />
      <AlertSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
function Count({ n, color }) {
  return <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold" style={{ backgroundColor: color ? `${color}22` : 'hsl(var(--muted))', color: color || 'inherit' }}>{n}</span>
}
export default App
