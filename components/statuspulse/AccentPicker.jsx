'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'
import useAccent, { ACCENTS } from '@/hooks/useAccent'

const ACCENT_LIST = Object.entries(ACCENTS)

export default function AccentPicker() {
  const { accent, changeAccent } = useAccent()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Change accent color"
      >
        <Palette className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover p-3 shadow-xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Accent Color
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_LIST.map(([key, { primary }]) => (
              <button
                key={key}
                onClick={() => { changeAccent(key); setOpen(false) }}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: `hsl(${primary})` }}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              >
                {accent === key && (
                  <Check className="h-4 w-4 text-white drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
