'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate, useScroll, useSpring, useMotionValue, useReducedMotion } from 'framer-motion'

// Emergent ease
export const EASE = [0.16, 1, 0.3, 1]

// Shared variants for DRY animations
export const VARIANTS = {
  fadeUp: { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } },
  fadeDown: { initial: { opacity: 0, y: -24 }, animate: { opacity: 1, y: 0 } },
  fadeLeft: { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 } },
  fadeRight: { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 } },
  scaleIn: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
  cardHover: { whileHover: { y: -4, boxShadow: '0 18px 44px -18px rgba(225,86,124,0.45)' } },
  cardTap: { whileTap: { scale: 0.97 } },
  buttonTap: { whileTap: { scale: 0.96 } },
  linkHover: { whileHover: { x: 3, color: '#E1567C' } },
}

// Respects prefers-reduced-motion: returns reduced variants if user prefers less motion
function useRespectMotion() {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) {
    return {
      initial: {},
      animate: {},
      exit: {},
      whileHover: {},
      whileTap: {},
      whileInView: {},
      transition: { duration: 0 },
    }
  }
  return null
}

export function Reveal({ children, delay = 0, y = 24, className = '' }) {
  const reduced = useRespectMotion()
  return (
    <motion.div
      initial={reduced?.initial || { opacity: 0, y }}
      whileInView={reduced?.whileInView || { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={reduced?.transition || { duration: 0.6, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function CountUp({ to, suffix = '', prefix = '', decimals = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(0)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (!inView) return
    if (prefersReduced) { setVal(to); return }
    const controls = animate(0, to, {
      duration: 1.7,
      ease: EASE,
      onUpdate: (v) => setVal(v),
    })
    return () => controls.stop()
  }, [inView, to, prefersReduced])

  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()
  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

// Magnetic wrapper — follows cursor slightly. Auto-disabled on touch + reduced motion.
export function MagneticButton({ children, className = '', strength = 0.4 }) {
  const ref = useRef(null)
  const prefersReduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 })

  const onMove = (e) => {
    if (prefersReduced) return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0); y.set(0)
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      whileTap={VARIANTS.buttonTap.whileTap}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 top-0 z-[60] h-0.5 w-full origin-left bg-primary"
      aria-hidden="true"
    />
  )
}

// Page transition wrapper for layout
export function PageTransition({ children, className = '' }) {
  const reduced = useRespectMotion()
  return (
    <motion.div
      initial={reduced?.initial || { opacity: 0, y: 8 }}
      animate={reduced?.animate || { opacity: 1, y: 0 }}
      transition={reduced?.transition || { duration: 0.35, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
