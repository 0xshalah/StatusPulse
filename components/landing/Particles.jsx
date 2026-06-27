'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

// Subtle lime dots drifting upward in the hero background.
export default function Particles({ count = 18 }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        drift: (Math.random() - 0.5) * 60,
        duration: 3 + Math.random() * 5,
        delay: Math.random() * 5,
        opacity: 0.25 + Math.random() * 0.45,
      })),
    [count]
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full bg-lime"
          style={{ left: `${d.left}%`, bottom: -10, width: d.size, height: d.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [-20, -420], x: [0, d.drift], opacity: [0, d.opacity, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
