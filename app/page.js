'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, RefreshCw, RotateCcw, ServerCrash } from 'lucide-react'
import { toast } from 'sonner'
import Navbar from '@/components/statuspulse/Navbar'
import HealthScore from '@/components/statuspulse/HealthScore'
import EndpointCard from '@/components/statuspulse/EndpointCard'
import AddEndpointWizard from '@/components/statuspulse/AddEndpointWizard'
import { useScheduler } from '@/hooks/useScheduler'
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
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api('/dashboard')
      setData(res)
    } catch (e) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  // initial: seed (idempotent) then load
  useEffect(() => {
    ;(async () => {
      try {
        await api('/seed', { method: 'POST' })
      } catch {}
      await load()
    })()
  }, [load])

  // poll UI every 15s
  useEffect(() => {
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  // background ping scheduler every 60s
  useScheduler({
    intervalMs: 60000,
    onTick: () => {
      setLastSweep(new Date())
      load()
    },
  })

  const manualRefresh = async () => {
    setRefreshing(true)
    try {
      await api('/ping-all', { method: 'POST' })
      setLastSweep(new Date())
      await load()
      toast.success('Endpoints re-checked')
    } catch {
      toast.error('Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  const reseed = async () => {
    setRefreshing(true)
    try {
      await api('/reset', { method: 'POST' })
      await load()
      toast.success('Demo data reset')
    } catch {
      toast.error('Reset failed')
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async (ep) => {
    try {
      await api(`/endpoints/${ep.id}`, { method: 'DELETE' })
      toast.success(`Deleted ${ep.name}`)
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const counts = useMemo(() => {
    const c = { all: data.endpoints.length, up: 0, degraded: 0, down: 0 }
    data.endpoints.forEach((e) => {
      if (c[e.verdict] !== undefined) c[e.verdict]++
    })
    return c
  }, [data])

  const filtered = useMemo(() => {
    return data.endpoints.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.url.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || e.verdict === filter
      return matchSearch && matchFilter
    })
  }, [data, search, filter])

  return (
    <div className="min-h-screen bg-background">
      <Navbar>
        <Button onClick={() => { setEditing(null); setWizardOpen(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add endpoint</span>
        </Button>
      </Navbar>

      {/* hero strip */}
      <div className="dark:starfield border-b border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2px] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live monitoring · 60s sweep
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                Monitor every endpoint.
                <br />
                <span className="text-primary">Catch incidents</span> before users do.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Real-time pings, response-time sparklines, uptime tracking and embeddable badges — all in one
                terminal-grade dashboard.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={manualRefresh} disabled={refreshing} className="gap-1.5">
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Re-check now
                </Button>
                <Button variant="ghost" size="sm" onClick={reseed} disabled={refreshing} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
                </Button>
              </div>
            </div>
            <div className="lg:w-[360px]">
              <HealthScore
                healthy={data.health.healthy}
                total={data.health.total}
                lastPing={lastSweep ? timeAgo(lastSweep) : null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search endpoints…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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

        {/* grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <ServerCrash className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-display text-lg font-semibold">No endpoints found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.endpoints.length === 0 ? 'Add your first endpoint to start monitoring.' : 'Try a different search or filter.'}
              </p>
              <Button className="mt-4 gap-1.5" onClick={() => { setEditing(null); setWizardOpen(true) }}>
                <Plus className="h-4 w-4" /> Add endpoint
              </Button>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((ep, i) => (
                  <EndpointCard
                    key={ep.id}
                    endpoint={ep}
                    index={i}
                    onEdit={(e) => { setEditing(e); setWizardOpen(true) }}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <AddEndpointWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  )
}

function Count({ n, color }) {
  return (
    <span
      className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold"
      style={{ backgroundColor: color ? `${color}22` : 'hsl(var(--muted))', color: color || 'inherit' }}
    >
      {n}
    </span>
  )
}

export default App
