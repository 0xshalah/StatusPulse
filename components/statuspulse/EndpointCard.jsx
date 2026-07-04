'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Pencil, Trash2, Code2, Timer, Gauge, Activity, ArrowUpRight, Pause, Play, Zap } from 'lucide-react'
import StatusDot from './StatusDot'
import Sparkline from './Sparkline'
import { statusOf, fmtMs, fmtPct, timeAgo } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { VARIANTS, EASE } from '@/components/landing/helpers'

export default function EndpointCard({ endpoint, onEdit, onDelete, onPause, onTest, index = 0 }) {
  const s = statusOf(endpoint.verdict)
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState(false)
  const paused = endpoint.paused

  const copyBadge = () => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    navigator.clipboard.writeText(`![${endpoint.name}](${base}/api/badge/${endpoint.id})`)
    setCopied(true)
    toast.success('Badge markdown copied')
    setTimeout(() => setCopied(false), 1500)
  }
  const test = async () => {
    setTesting(true)
    try { await onTest(endpoint); toast.success('Re-checked ' + endpoint.name) } finally { setTesting(false) }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -4, boxShadow: '0 18px 44px -14px rgba(225,86,124,0.35)', borderColor: 'rgba(225,86,124,0.4)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3), boxShadow: { duration: 0.3, ease: EASE } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors"
    >
      <div className="absolute inset-x-0 top-0 h-[3px] opacity-80" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-1 shrink-0"><StatusDot verdict={endpoint.verdict} /></div>
          <div className="min-w-0 flex-1">
            <Link href={`/endpoints/${endpoint.id}`} className="block truncate font-display text-base font-semibold leading-tight hover:text-primary">
              {endpoint.name}
            </Link>
            <a href={endpoint.url} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              <span className="truncate font-mono">{endpoint.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0 hidden sm:inline" />
            </a>
          </div>
        </div>
        <span className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25px] whitespace-nowrap" style={{ backgroundColor: `${s.color}22`, color: s.color }}>
          {s.label}
        </span>
      </div>

      <div className="mt-4"><Sparkline pings={endpoint.pings} verdict={endpoint.verdict} /></div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric icon={Gauge} label="Response" value={fmtMs(endpoint.latest?.responseTime)} />
        <Metric icon={Activity} label="Uptime 24h" value={fmtPct(endpoint.uptime24h)} />
        <Metric icon={Timer} label="Checked" value={timeAgo(endpoint.latest?.timestamp)} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <button onClick={copyBadge} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
          <Code2 className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Badge'}
        </button>
        <div className="flex items-center gap-0.5">
          <IconBtn label="Test now" onClick={test} disabled={testing}><Zap className={`h-4 w-4 ${testing ? 'animate-pulse text-primary' : ''}`} /></IconBtn>
          <IconBtn label={paused ? 'Resume' : 'Pause'} onClick={() => onPause(endpoint)} className="hidden sm:inline-flex">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</IconBtn>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex" title="View details">
            <Link href={`/endpoints/${endpoint.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
          </Button>
          <IconBtn label="Edit" onClick={() => onEdit(endpoint)} className="hidden sm:inline-flex"><Pencil className="h-4 w-4" /></IconBtn>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-status-down hidden sm:inline-flex" title="Delete"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{endpoint.name}”?</AlertDialogTitle>
                <AlertDialogDescription>This removes the endpoint and all its ping history. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-status-down text-white hover:bg-status-down/90" onClick={() => onDelete(endpoint)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  )
}

function IconBtn({ children, label, className, ...props }) {
  return (
    <Button variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-foreground ${className || ''}`} title={label} aria-label={label} {...props}>
      {children}
    </Button>
  )
}
function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <p className="mt-0.5 font-mono text-sm font-semibold font-mono-nums">{value}</p>
    </div>
  )
}
