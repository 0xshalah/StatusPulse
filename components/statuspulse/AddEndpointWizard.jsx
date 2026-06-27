'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Globe, Settings2, ClipboardCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/statuspulse'

const STEPS = [
  { id: 1, title: 'Identity', icon: Globe },
  { id: 2, title: 'Settings', icon: Settings2 },
  { id: 3, title: 'Review', icon: ClipboardCheck },
]

const STATUS_CODES = ['200', '201', '202', '204', '301', '302', '400', '401', '403', '404', '500']
const INTERVALS = [
  { v: '30', l: '30 seconds' },
  { v: '60', l: '60 seconds' },
  { v: '120', l: '2 minutes' },
  { v: '300', l: '5 minutes' },
]

const empty = { name: '', url: '', expectedStatus: '200', interval: '60' }

export default function AddEndpointWizard({ open, onOpenChange, onSaved, editing }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(editing)

  useEffect(() => {
    if (open) {
      setStep(1)
      if (editing) {
        setForm({
          name: editing.name,
          url: editing.url,
          expectedStatus: String(editing.expectedStatus),
          interval: String(editing.interval),
        })
      } else {
        setForm(empty)
      }
    }
  }, [open, editing])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validUrl = (() => {
    try {
      const u = new URL(form.url)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  })()

  const step1Valid = form.name.trim().length >= 2 && validUrl
  const step2Valid = Boolean(form.expectedStatus && form.interval)

  const next = () => {
    if (step === 1 && !step1Valid) {
      toast.error('Enter a name and a valid http(s) URL')
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }
  const back = () => setStep((s) => Math.max(1, s - 1))

  const submit = async () => {
    setSaving(true)
    try {
      if (isEdit) {
        await api(`/endpoints/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) })
        toast.success('Endpoint updated')
      } else {
        await api('/endpoints', { method: 'POST', body: JSON.stringify(form) })
        toast.success('Endpoint added — first check running')
      }
      onOpenChange(false)
      onSaved && onSaved()
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? 'Edit endpoint' : 'Add endpoint'}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-1 py-2">
          {STEPS.map((s, i) => {
            const active = step === s.id
            const done = step > s.id
            const Icon = s.icon
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                      done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : active
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-2 h-px flex-1 ${step > s.id ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="min-h-[190px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" placeholder="e.g. Payments API" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    placeholder="https://api.example.com/health"
                    value={form.url}
                    onChange={(e) => set('url', e.target.value)}
                    className="font-mono text-sm"
                  />
                  {form.url && !validUrl && (
                    <p className="text-xs text-status-down">Enter a valid http:// or https:// URL</p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Expected status code</Label>
                  <Select value={form.expectedStatus} onValueChange={(v) => set('expectedStatus', v)}>
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_CODES.map((c) => (
                        <SelectItem key={c} value={c} className="font-mono">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Check interval</Label>
                  <Select value={form.interval} onValueChange={(v) => set('interval', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map((i) => (
                        <SelectItem key={i.v} value={i.v}>
                          {i.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <Review label="Name" value={form.name} />
                <Review label="URL" value={form.url} mono />
                <Review label="Expected status" value={form.expectedStatus} mono />
                <Review label="Interval" value={`${form.interval}s`} mono />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={next} disabled={step === 1 ? !step1Valid : !step2Valid} className="gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isEdit ? 'Save changes' : 'Add endpoint'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Review({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
