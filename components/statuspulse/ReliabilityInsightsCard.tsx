'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, AlertTriangle, Clock, Zap, Sparkles } from 'lucide-react'
import type { ReliabilityInsight } from '@/lib/ai/insights'

const severityStyles = {
  critical: {
    border: 'border-red-500/30 hover:border-red-500/50',
    bg: 'bg-red-500/[0.06]',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
    label: 'CRITICAL',
  },
  warning: {
    border: 'border-amber-500/30 hover:border-amber-500/50',
    bg: 'bg-amber-500/[0.06]',
    icon: TrendingUp,
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
    label: 'WARNING',
  },
  info: {
    border: 'border-violet-500/20 hover:border-violet-500/30',
    bg: 'bg-violet-500/[0.04]',
    icon: Clock,
    iconColor: 'text-violet-400',
    badge: 'bg-violet-500/15 text-violet-400',
    label: 'PATTERN',
  },
}

interface Props {
  insights: ReliabilityInsight[]
  onAskAI?: (question: string) => void
}

const iconMap: Record<string, React.ComponentType<any>> = {
  recurring: Clock,
  trending: TrendingUp,
  correlated: AlertTriangle,
  window: Zap,
}

export function ReliabilityInsightsCard({ insights, onAskAI }: Props) {
  if (!insights || insights.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/50 p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="font-display text-sm font-semibold">Reliability Insights</span>
        <span className="text-[10px] text-muted-foreground">AI-powered · pro bono</span>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const sev = severityStyles[insight.severity] ?? severityStyles.info
            const Icon = iconMap[insight.type] ?? AlertTriangle

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
                className={`rounded-xl border ${sev.border} ${sev.bg} p-3 cursor-pointer transition-colors`}
                onClick={() => onAskAI?.(insight.suggestion)}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 shrink-0 rounded-lg p-1 ${sev.badge}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{insight.title}</span>
                      <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${sev.badge}`}>
                        {sev.label}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{insight.detail}</p>
                    <p className="text-[11px] mt-1.5 text-violet-400/70 font-medium">
                      💡 Tap to ask AI: "{insight.suggestion}"
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </AnimatePresence>
    </motion.div>
  )
}
