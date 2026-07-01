'use client'

import { GitBranch, ArrowRight, Check, X, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function LoopDiagram() {
  const steps = [
    { label: 'Code', desc: 'Claude Code', icon: GitBranch, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Deploy', desc: 'EdgeOne', icon: GitBranch, color: 'text-lime', bg: 'bg-lime/10' },
    { label: 'Test', desc: 'TestSprite CLI', icon: RefreshCw, color: 'text-status-degraded', bg: 'bg-status-degraded/10' },
    { label: 'Verify', desc: 'Pass/Fail', icon: Check, color: 'text-status-up', bg: 'bg-status-up/10' },
    { label: 'Fix', desc: 'Agent repairs', icon: RefreshCw, color: 'text-primary', bg: 'bg-primary/10' },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="h-3.5 w-3.5 text-lime" />
        <span className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">Build Loop</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Link
          href="https://github.com/0xshalah/StatusPulse/actions"
          target="_blank"
          className="font-mono text-[11px] text-muted-foreground hover:text-lime transition-colors"
        >
          github.com/0xshalah/StatusPulse/actions →
        </Link>
        <span className="flex items-center gap-1 font-mono text-[11px] text-lime">
          <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
          CI/CD active
        </span>
      </div>
    </div>
  )
}
