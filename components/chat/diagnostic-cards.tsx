'use client'

import { motion } from 'framer-motion'

const severityColors: Record<string, string> = {
  'CRITICAL': 'text-status-down',
  'HIGH': 'text-status-degraded',
  'MEDIUM': 'text-status-unknown',
  'LOW': 'text-status-up',
}

export function DiagnosticCard({ content, isDark }: { content: string; isDark?: boolean }) {
  if (!content.includes('🏥')) return null

  const lines = content.split('\n')
  const title = lines[0]?.replace(/\*+/g, '').trim() || ''
  const endpointLine = lines.find(l => l.includes('Endpoint:'))
  const typeLine = lines.find(l => l.includes('Type:'))
  const severityLine = lines.find(l => l.includes('Severity:'))
  const severityText = severityLine?.match(/🔴|🟠|🟡|🟢\s*(CRITICAL|HIGH|MEDIUM|LOW)/)?.[1] || 'MEDIUM'

  const findingsStart = lines.findIndex(l => l.includes('Findings:'))
  const recommendationsStart = lines.findIndex(l => l.includes('Recommendation:'))

  const findings = lines.slice(findingsStart + 1, recommendationsStart > -1 ? recommendationsStart : undefined)
    .filter(l => l.trim().startsWith('•'))
    .map(l => l.replace('•', '').trim())

  const recommendations = lines.slice(recommendationsStart + 1)
    .filter(l => l.trim().length > 0 && !l.includes('---'))
    .join(' ').replace(/\*+/g, '').trim()

  const severityClass = severityColors[severityText] || severityColors.MEDIUM

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} p-3 my-2`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🏥</span>
        <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Incident Diagnostic</span>
        <span className={`text-[10px] font-bold uppercase ${severityClass}`}>{severityText}</span>
      </div>

      {endpointLine && (
        <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'} mb-2`}>
          {endpointLine.replace(/\*+/g, '').trim()}
          {typeLine && ` · ${typeLine.replace(/\*+/g, '').trim()}`}
        </p>
      )}

      {findings.length > 0 && (
        <div className="mb-2">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'} mb-1`}>Findings</p>
          {findings.map((f, i) => (
            <p key={i} className={`text-[11px] ${isDark ? 'text-white/70' : 'text-gray-600'} ml-1`}>• {f}</p>
          ))}
        </div>
      )}

      {recommendations && (
        <div className={`rounded-lg ${isDark ? 'bg-primary/10 border border-primary/20' : 'bg-primary/5 border border-primary/10'} p-2`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">Recommendation</p>
          <p className={`text-[11px] ${isDark ? 'text-white/80' : 'text-gray-700'} leading-relaxed`}>{recommendations}</p>
        </div>
      )}
    </motion.div>
  )
}

export function KnowledgeBaseCard({ content, isDark }: { content: string; isDark?: boolean }) {
  if (!content.includes('📚')) return null

  const lines = content.split('\n')
  const docBlocks: { title: string; source: string; snippet: string }[] = []

  let current: Partial<typeof docBlocks[0]> = {}
  for (const line of lines) {
    if (line.startsWith('**') && line.includes('.**')) {
      if (current.title) docBlocks.push(current as any)
      current = { title: line.replace(/\*+/g, '').replace(/^\d+\.\s*/, '').trim() }
    } else if (line.startsWith('_Source:')) {
      current.source = line.replace(/_Source:\s*|_/g, '').trim()
    } else if (line.startsWith('```')) {
      // skip code fence markers
    } else if (line.trim().length > 0 && current.snippet !== undefined) {
      current.snippet = (current.snippet || '') + line.trim() + ' '
    } else if (line.trim().length > 0 && current.title) {
      current.snippet = line.trim() + ' '
    }
  }
  if (current.title) docBlocks.push(current as any)

  if (docBlocks.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} p-3 my-2`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📚</span>
        <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Knowledge Base</span>
        <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{docBlocks.length} document{docBlocks.length > 1 ? 's' : ''}</span>
      </div>
      {docBlocks.map((doc, i) => (
        <div key={i} className={`${i > 0 ? 'mt-2 pt-2 border-t ' + (isDark ? 'border-white/5' : 'border-gray-200') : ''}`}>
          <p className={`text-[11px] font-semibold ${isDark ? 'text-lime' : 'text-primary'} mb-0.5`}>{doc.title}</p>
          <p className={`text-[10px] ${isDark ? 'text-white/35' : 'text-gray-400'} mb-1`}>{doc.source}</p>
          <p className={`text-[11px] ${isDark ? 'text-white/60' : 'text-gray-500'} leading-relaxed line-clamp-3`}>{doc.snippet}</p>
        </div>
      ))}
    </motion.div>
  )
}
