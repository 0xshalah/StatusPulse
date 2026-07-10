'use client'

import { motion } from 'framer-motion'
import { Pause, Play, Zap } from 'lucide-react'

const severityBadge: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'CRITICAL' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'HIGH' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'MEDIUM' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'LOW' },
}

const priorityBadge: Record<string, string> = {
  P1: 'bg-status-down text-white dark:bg-red-500 dark:text-white',
  P2: 'bg-status-degraded text-white',
  P3: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
}

interface ActionPlanItem {
  priority: string
  label: string
  detail: string
}

interface SafeAction {
  label: string
  description: string
  toolName: string
}

interface ResolutionCardProps {
  content: string
  isDark?: boolean
  onToolAction?: (toolName: string, params: Record<string, string>) => void
}

/**
 * Renders a styled resolution card inside the AI chat. Detects the 📋 prefix
 * and parses the action plan + safe actions from the Markdown content produced
 * by formatResolutionCard().
 *
 * Inherits the same Framer Motion entrance animation as the diagnostic card
 * for a consistent chat experience.
 */
export function ResolutionCard({ content, isDark, onToolAction }: ResolutionCardProps) {
  if (!content.includes('📋')) return null

  const lines = content.split('\n')
  const title = lines[0]?.replace(/\*+/g, '').trim() || ''

  const severityLine = lines.find((l) => /🔴|🟠|🟡|🟢/.test(l))
  const severityLevel =
    severityLine?.includes('CRITICAL') ? 'critical' :
    severityLine?.includes('HIGH') ? 'high' :
    severityLine?.includes('MEDIUM') ? 'medium' : 'low'

  const sev = severityBadge[severityLevel] ?? severityBadge.medium

  const summaryStart = lines.findIndex((l) => l.includes('📋 **Action Plan:**'))
  const summary = lines.slice(1, summaryStart > -1 ? summaryStart : undefined)
    .filter((l) => l.trim() && !l.includes('🔴') && !l.includes('🟠') && !l.includes('🟡') && !l.includes('🟢'))
    .join(' ')
    .replace(/\*+/g, '')
    .trim()

  const toolStart = lines.findIndex((l) => l.includes('💡 **I can help'))
  const actionLines = lines.slice(
    summaryStart + 1,
    toolStart > -1 ? toolStart : undefined,
  )

  const actions: ActionPlanItem[] = []
  let current: ActionPlanItem | null = null
  for (const line of actionLines) {
    const priorityMatch = line.match(/\*\*(P[123]):\*\*\s*(.+)/)
    if (priorityMatch) {
      if (current) actions.push(current)
      current = { priority: priorityMatch[1]!, label: priorityMatch[2]!.trim(), detail: '' }
    } else if (current && line.includes('_')) {
      current.detail = line.replace(/[_]/g, '').trim()
    }
  }
  if (current) actions.push(current)

  const tools: SafeAction[] = []
  if (toolStart > -1) {
    const toolLines = lines.slice(toolStart + 1)
    for (const line of toolLines) {
      const toolMatch = line.match(/-\s*(.+?):\s*(.+)/)
      if (toolMatch) {
        const label = toolMatch[1]!.trim()
        const toolName =
          label.includes('Pause') ? 'pause_endpoint' :
          label.includes('Test') ? 'test_endpoint' : ''
        tools.push({
          label: toolMatch[1]!.trim(),
          description: toolMatch[2]!.trim(),
          toolName,
        })
      }
    }
  }

  if (actions.length === 0 && tools.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={`rounded-xl border ${isDark ? 'border-violet-500/20 bg-violet-500/[0.04]' : 'border-violet-200 bg-violet-50'} p-4 my-3`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📋</span>
        <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
          Incident Resolution
        </span>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.bg} ${sev.text}`}>
          {sev.label}
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-500'} mb-3`}>
          {summary}
        </p>
      )}

      {/* Action Plan */}
      {actions.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'} mb-2`}>
            Action Plan
          </p>
          <div className="space-y-2">
            {actions.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.2 }}
                className="flex gap-2"
              >
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${priorityBadge[a.priority] ?? 'bg-gray-500/20 text-gray-400'} shrink-0 h-fit mt-0.5`}>
                  {a.priority}
                </span>
                <div>
                  <p className={`text-[12px] font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                    {a.label}
                  </p>
                  {a.detail && (
                    <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-400'} mt-0.5`}>
                      {a.detail}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Safe Tool Actions */}
      {tools.length > 0 && (
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'} mb-2`}>
            AI can help
          </p>
          <div className="flex flex-wrap gap-2">
            {tools.map((t, i) => (
              <button
                key={i}
                onClick={() => onToolAction?.(t.toolName, {})}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {t.toolName === 'pause_endpoint' ? (
                  <Pause className="h-3 w-3" />
                ) : t.toolName === 'test_endpoint' ? (
                  <Zap className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className={`text-[10px] mt-3 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
        💡 Ask me to execute any safe action — or apply the steps above manually.
      </p>
    </motion.div>
  )
}
