'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ORDER = ['dark', 'light', 'system']
const ICONS = { dark: Moon, light: Sun, system: Monitor }
const LABELS = { dark: 'Dark', light: 'Light', system: 'System' }

function supportsViewTransition() {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const ticking = useRef(false)
  useEffect(() => setMounted(true), [])

  const toggle = useCallback((e) => {
    if (ticking.current) return
    ticking.current = true

    const current = theme && ORDER.includes(theme) ? theme : 'system'
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]

    if (!supportsViewTransition()) {
      setTheme(next)
      ticking.current = false
      return
    }

    const x = e.clientX
    const y = e.clientY
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    // Determine actual visual transition: resolve system preference
    const html = document.documentElement
    const isCurrentlyDark = html.classList.contains('dark')
    const willBeDark = next === 'dark' || (next === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    const isSunrise = isCurrentlyDark && !willBeDark

    // Set CSS vars + attribute BEFORE taking snapshot
    html.style.setProperty('--tx-x', `${x}px`)
    html.style.setProperty('--tx-y', `${y}px`)
    html.style.setProperty('--tx-radius', `${maxRadius}px`)
    html.setAttribute('data-transition-mode', isSunrise ? 'sunrise' : 'sunset')

    // Force browser to apply styles before snapshot
    void html.offsetHeight

    const transition = document.startViewTransition(() => {
      setTheme(next)
    })

    transition.finished.then(() => {
      html.removeAttribute('data-transition-mode')
      html.style.removeProperty('--tx-x')
      html.style.removeProperty('--tx-y')
      html.style.removeProperty('--tx-radius')
      ticking.current = false
    })
  }, [theme, setTheme])

  if (!mounted) return <div className="h-9 w-9" />
  const current = theme && ORDER.includes(theme) ? theme : 'system'
  const Icon = ICONS[current]
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${LABELS[current]}. Switch to ${LABELS[next]}`}
      title={`Theme: ${LABELS[current]} → ${LABELS[next]}`}
      onClick={toggle}
      className="rounded-full text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-[18px] w-[18px]" />
    </Button>
  )
}
