'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Pencil, Trash2, Code2, Timer, Gauge } from 'lucide-react'
import StatusDot from './StatusDot'
import Sparkline from './Sparkline'
import { statusOf, fmtMs, fmtPct, timeAgo } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function EndpointCard({ endpoint, onEdit, onDelete, index = 0 }) {
  const s = statusOf(endpoint.verdict)
  const [copied, setCopied] = useState(false)

  const copyBadge = () => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const md = `![${endpoint.name}](${base}/api/badge/${endpoint.id})`
    navigator.clipboard.writeText(md)
    setCopied(true)
    toast.success('Badge markdown copied')
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5"
    >
      <div
        className="absolute inset-x-0 top-0 h-[3px] opacity-80"
        style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <StatusDot verdict={endpoint.verdict} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold leading-tight">{endpoint.name}</h3>
            <a
              href={endpoint.url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 flex items-center gap-1 truncate font-mono text-xs text-muted-foreground hover:text-primary"
            >
              <span className="truncate">{endpoint.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </div>
        <span
          className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25px]"
          style={{ backgroundColor: `${s.color}22`, color: s.color }}
        >
          {s.label}
        </span>
      </div>

      <div className="mt-4">
        <Sparkline pings={endpoint.pings} verdict={endpoint.verdict} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric icon={Gauge} label="Response" value={fmtMs(endpoint.latest?.responseTime)} />
        <Metric icon={Activity2} label="Uptime 24h" value={fmtPct(endpoint.uptime24h)} />
        <Metric icon={Timer} label="Checked" value={timeAgo(endpoint.latest?.timestamp)} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <button
          onClick={copyBadge}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <Code2 className="h-3.5 w-3.5" />
          {copied ? 'Copied!' : 'Copy badge'}
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(endpoint)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-status-down">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{endpoint.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the endpoint and all its ping history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-status-down text-white hover:bg-status-down/90"
                  onClick={() => onDelete(endpoint)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-0.5 font-mono text-sm font-semibold font-mono-nums">{value}</p>
    </div>
  )
}

// tiny inline icon to avoid extra import name clash
function Activity2(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
