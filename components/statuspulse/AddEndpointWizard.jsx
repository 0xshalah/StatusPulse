'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Globe, Settings2, ClipboardCheck, Loader2, Activity, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, statusOf, fmtMs } from '@/lib/statuspulse'

const STEPS = [
  { id: 1, title: 'Identity', icon: Globe },
  { id: 2, title: 'Settings', icon: Settings2 },
  { id: 3, title: 'Review', icon: ClipboardCheck },
  { id: 4, title: 'Test', icon: Activity },
]
const STATUS_CODES = ['200', '201', '202', '204', '301', '302', '401', '403', '404', '500']
const INTERVALS = [
  { v: 30, l: '30s' }, { v: 60, l: '60s' }, { v: 300, l: '5m' },
  { v: 900, l: '15m' }, { v: 1800, l: '30m' }, { v: 3600, l: '1h' },
]
const empty = { name: '', url: '', expectedStatus: '200', interval: 60 }

export default function AddEndpointWizard({ open, onOpenChange, onSaved, editing }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [customStatus, setCustomStatus] = useState(false)
  const [dup, setDup] = useState(false)
  const [testState, setTestState] = useState({ status: 'idle', result: null })
  const isEdit = Boolean(editing)

  useEffect(() => {
    if (open) {
      setStep(1); setDup(false); setTestState({ status: 'idle', result: null })
      if (editing) {
        const sc = String(editing.expectedStatus)
        setCustomStatus(!STATUS_CODES.includes(sc))
        setForm({ name: editing.name, url: editing.url, expectedStatus: sc, interval: Number(editing.interval) })
      } else { setCustomStatus(false); setForm(empty) }
    }
  }, [open, editing])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const validUrl = (() => { try { const u = new URL(form.url); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false } })()
  const step1Valid = form.name.trim().length >= 2 && validUrl
  const step2Valid = Number(form.expectedStatus) >= 100 && Number(form.expectedStatus) <= 599 && Number(form.interval) >= 10 && Number(form.interval) <= 3600

  const checkDup = async () => {
    if (!validUrl || (editing && editing.url === form.url)) { setDup(false); return }
    try { const r = await api('/check-duplicate', { method: 'POST', body: JSON.stringify({ url: form.url }) }); setDup(r.exists) } catch {}
  }
  const runTest = async () => {
    setTestState({ status: 'loading', result: null })
    try {
      const r = await api('/test-url', { method: 'POST', body: JSON.stringify({ url: form.url, expectedStatus: Number(form.expectedStatus) }) })
      setTestState({ status: 'done', result: r })
    } catch { setTestState({ status: 'done', result: { verdict: 'down', errored: true, statusCode: 0, responseTime: 0 } }) }
  }
  useEffect(() => { if (step === 4 && testState.status === 'idle') runTest() }, [step]) // eslint-disable-line

  const next = () => {
    if (step === 1 && !step1Valid) { toast.error('Enter a name and a valid http(s) URL'); return }
    if (step === 2 && !step2Valid) { toast.error('Pick a valid status code and interval'); return }
    setStep((s) => Math.min(4, s + 1))
  }
  const back = () => setStep((s) => Math.max(1, s - 1))
  const submit = async () => {
    setSaving(true)
    try {
      const payload = { name: form.name, url: form.url, expectedStatus: Number(form.expectedStatus), interval: Math.max(10, Number(form.interval) || 60) }
      if (isEdit) { await api(`/endpoints/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }); toast.success('Endpoint updated') }
      else { await api('/endpoints', { method: 'POST', body: JSON.stringify(payload) }); toast.success('Endpoint added — monitoring started') }
      onOpenChange(false); onSaved && onSaved()
    } catch (e) { toast.error(e.message || 'Failed to save') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle className="font-display text-xl text-center">{isEdit ? 'Edit endpoint' : 'Add endpoint'}</DialogTitle></DialogHeader>

        <div className="mx-auto flex max-w-[420px] items-center justify-between py-1.5 mt-1">
          {STEPS.map((s, i) => {
            const active = step === s.id, done = step > s.id, Icon = s.icon
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${done ? 'border-primary bg-primary text-primary-foreground' : active ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.title}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`mx-1.5 h-px flex-1 ${step > s.id ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            )
          })}
        </div>

        <div className="min-h-[170px] mt-5">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Slide key="s1">
                <div className="space-y-1.5"><Label htmlFor="name">Display name</Label><Input id="name" placeholder="e.g. Payments API" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input id="url" placeholder="https://api.example.com/health" value={form.url} onChange={(e) => set('url', e.target.value)} onBlur={checkDup} className="font-mono text-sm" />
                  {form.url && !validUrl && <p className="text-xs text-status-down">Enter a valid http:// or https:// URL</p>}
                  {dup && <p className="flex items-center gap-1.5 text-xs text-status-degraded"><AlertTriangle className="h-3.5 w-3.5" /> This endpoint is already being monitored</p>}
                </div>
              </Slide>
            )}
            {step === 2 && (
              <Slide key="s2">
                <div className="space-y-1.5">
                  <Label>Expected status code</Label>
                  <div className="flex gap-2">
                    <Select value={customStatus ? 'custom' : form.expectedStatus} onValueChange={(v) => { if (v === 'custom') setCustomStatus(true); else { setCustomStatus(false); set('expectedStatus', v) } }}>
                      <SelectTrigger className="font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_CODES.map((c) => <SelectItem key={c} value={c} className="font-mono">{c}</SelectItem>)}<SelectItem value="custom">Custom…</SelectItem></SelectContent>
                    </Select>
                    {customStatus && <Input type="number" className="w-28 font-mono" value={form.expectedStatus} onChange={(e) => set('expectedStatus', e.target.value)} placeholder="e.g. 418" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Check interval</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTERVALS.map((i) => (
                      <button key={i.v} type="button" onClick={() => set('interval', i.v)} className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${Number(form.interval) === i.v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{i.l}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Label className="text-xs text-muted-foreground">Custom (seconds)</Label>
                    <Input type="number" min={5} className="w-28 font-mono" value={form.interval || ''} onChange={(e) => set('interval', Math.max(5, Number(e.target.value) || 60))} />
                  </div>
                </div>
              </Slide>
            )}
            {step === 3 && (
              <Slide key="s3">
                <div className="space-y-2">
                <Review label="Name" value={form.name} />
                <Review label="URL" value={form.url} mono />
                <Review label="Expected status" value={form.expectedStatus} mono />
                <Review label="Interval" value={`${form.interval}s`} mono />
                </div>
              </Slide>
            )}
            {step === 4 && (
              <Slide key="s4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  {testState.status === 'loading' && <div className="flex flex-col items-center gap-2 py-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /><p className="text-sm">Pinging {form.url}…</p></div>}
                  {testState.status === 'done' && testState.result && (() => {
                    const v = statusOf(testState.result.verdict)
                    return (
                      <div className="flex flex-col items-center gap-2 py-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${v.color}22`, color: v.color }}><Activity className="h-5 w-5" /></div>
                        <p className="font-display text-base font-semibold" style={{ color: v.color }}>{v.label}</p>
                        <div className="flex gap-4 font-mono text-sm">
                          <span>status <b>{testState.result.statusCode || 'ERR'}</b></span>
                          <span>time <b>{fmtMs(testState.result.responseTime)}</b></span>
                        </div>
                        <Button variant="outline" size="sm" onClick={runTest} className="mt-0.5 gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Re-test</Button>
                      </div>
                    )
                  })()}
                </div>
              </Slide>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-1"><ChevronLeft className="h-4 w-4" /> Back</Button>
          {step < 4 ? (
            <Button onClick={next} disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)} className="gap-1">Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={saving} className="gap-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isEdit ? 'Save changes' : 'Add endpoint'}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
function Slide({ children }) {
  return <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">{children}</motion.div>
}
function Review({ label, value, mono }) {
  return <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"><span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span><span className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span></div>
}
