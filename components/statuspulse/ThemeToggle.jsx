'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

    const html = document.documentElement
    const isCurrentlyDark = html.classList.contains('dark')
    const next = isCurrentlyDark ? 'light' : 'dark'

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
    const isSunrise = isCurrentlyDark // dark→light = sunrise

    html.style.setProperty('--tx-x', `${x}px`)
    html.style.setProperty('--tx-y', `${y}px`)
    html.style.setProperty('--tx-radius', `${maxRadius}px`)
    html.setAttribute('data-transition-mode', isSunrise ? 'sunrise' : 'sunset')

    void html.offsetHeight

    const transition = document.startViewTransition(() => setTheme(next))
    transition.finished.then(() => {
      html.removeAttribute('data-transition-mode')
      html.style.removeProperty('--tx-x')
      html.style.removeProperty('--tx-y')
      html.style.removeProperty('--tx-radius')
      ticking.current = false
    })
  }, [setTheme])

  if (!mounted) return <div className="h-9 w-9" />
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : Sun
  const label = isDark ? 'Switch to light' : 'Switch to dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={toggle}
      className="rounded-full text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-[18px] w-[18px]" />
    </Button>
  )
}
