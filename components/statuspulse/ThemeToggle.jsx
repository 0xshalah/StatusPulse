'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Tri-state: Dark -> Light -> System -> Dark
const ORDER = ['dark', 'light', 'system']
const ICONS = { dark: Moon, light: Sun, system: Monitor }
const LABELS = { dark: 'Dark', light: 'Light', system: 'System' }

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
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
      onClick={() => setTheme(next)}
      className="rounded-full text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-[18px] w-[18px]" />
    </Button>
  )
}
