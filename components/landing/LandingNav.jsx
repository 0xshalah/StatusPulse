'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Menu, X, ArrowRight } from 'lucide-react'
import ThemeToggle from '@/components/statuspulse/ThemeToggle'
import { Button } from '@/components/ui/button'
import { MagneticButton } from './helpers'

const LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'Compare', href: '#compare' },
  { label: 'FAQ', href: '#faq' },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-border bg-background/80 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="StatusPulse home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">StatusPulse</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="group relative px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-lime transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/status" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
            Status
          </Link>
          <ThemeToggle />
          <MagneticButton className="hidden sm:inline-block">
            <Button asChild className="gap-1.5 transition-shadow duration-300 hover:shadow-[0_0_28px_-6px_rgba(225,86,124,0.7)]">
              <Link href="/dashboard">Start Monitoring Free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </MagneticButton>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-border bg-background/95 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  {l.label}
                </a>
              ))}
              <Link href="/status" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                Public Status
              </Link>
              <Button asChild className="mt-2 w-full gap-1.5">
                <Link href="/dashboard" onClick={() => setOpen(false)}>Start Monitoring Free <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
