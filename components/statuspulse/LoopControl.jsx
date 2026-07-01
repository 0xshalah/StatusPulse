'use client'

import { useState, useCallback } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'

const RERUN_URL = 'https://api.testsprite.com/v1/tests'

export default function LoopControl({ projectId }) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const rerunAll = useCallback(async () => {
    setRunning(true)
    setError('')
    setResults(null)
    try {
      const res = await fetch(`${RERUN_URL}?projectId=${projectId}&action=rerun-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const data = await res.json()
      const tests = data.items || data.tests || []
      setResults({
        total: tests.length,
        passed: tests.filter(t => t.status === 'passed').length,
        failed: tests.filter(t => t.status === 'failed').length,
        running: tests.filter(t => t.status === 'running').length,
        dashboardUrl: `https://www.testsprite.com/dashboard/tests/${projectId}`,
      })
    } catch (e) {
      setError(e.message)
    }
    setRunning(false)
  }, [projectId])

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2px] text-muted-foreground">
          Loop Control
        </span>
        {running && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-status-degraded">
            <Loader2 className="h-3 w-3 animate-spin" />
            running…
          </span>
        )}
      </div>

      <button
        onClick={rerunAll}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime/15 border border-lime/30 px-4 py-3 text-sm font-semibold text-lime transition-all hover:bg-lime/25 hover:shadow-[0_0_28px_-6px_rgba(194,239,78,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {running ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Verifying with TestSprite…</>
        ) : (
          <><RefreshCw className="h-4 w-4" /> Verify All Endpoints</>
        )}
      </button>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-status-down">
          <XCircle className="h-3 w-3" />
          CLI available in terminal: <code className="rounded bg-muted px-1">testsprite test rerun --all</code>
        </p>
      )}

      {results && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tests rerun</span>
            <span className="font-mono">{results.total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono text-xs text-status-up">
              <CheckCircle2 className="h-3 w-3" /> {results.passed} passed
            </span>
            {results.failed > 0 && (
              <span className="flex items-center gap-1 font-mono text-xs text-status-down">
                <XCircle className="h-3 w-3" /> {results.failed} failed
              </span>
            )}
          </div>
          <a
            href={results.dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-lime"
          >
            View on TestSprite <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <p className="mt-3 font-mono text-[10px] text-muted-foreground/60 text-center">
        Or run in terminal: <code className="rounded bg-muted px-1">testsprite test rerun --all --project {projectId}</code>
      </p>
    </div>
  )
}
