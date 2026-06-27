'use client'

import { motion } from 'framer-motion'
import { statusOf } from '@/lib/statuspulse'

export default function StatusDot({ verdict = 'unknown', size = 10 }) {
  const s = statusOf(verdict)
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size + 8, height: size + 8 }}>
      <motion.span
        className="absolute rounded-full"
        style={{ width: size, height: size, backgroundColor: s.color }}
        animate={{ boxShadow: [`0 0 0 0px ${s.glow}`, `0 0 0 7px rgba(0,0,0,0)`] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
      />
      <span className="relative rounded-full" style={{ width: size, height: size, backgroundColor: s.color }} />
    </span>
  )
}
