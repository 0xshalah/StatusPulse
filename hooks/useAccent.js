'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'statuspulse-accent'
const DEFAULT_ACCENT = 'pink'

export const ACCENTS = {
  pink:    { primary: '344 70% 55%', primaryForeground: '0 0% 100%', chart4: '344 70% 61%' },
  violet:  { primary: '263 60% 55%', primaryForeground: '0 0% 100%', chart4: '263 60% 61%' },
  blue:    { primary: '217 70% 55%', primaryForeground: '0 0% 100%', chart4: '217 70% 61%' },
  emerald: { primary: '160 60% 45%', primaryForeground: '0 0% 100%', chart4: '160 60% 51%' },
  amber:   { primary: '43 90% 48%', primaryForeground: '0 0% 10%',   chart4: '43 90% 54%' },
  red:     { primary: '0 65% 55%',   primaryForeground: '0 0% 100%', chart4: '0 65% 61%' },
  cyan:    { primary: '187 70% 45%', primaryForeground: '0 0% 100%', chart4: '187 70% 51%' },
  slate:   { primary: '215 16% 45%', primaryForeground: '0 0% 100%', chart4: '215 16% 51%' },
}

const ACCENT_KEYS = ['--primary', '--primary-foreground', '--accent', '--ring', '--chart-4']

function applyAccent(name, style) {
  const a = ACCENTS[name] || ACCENTS[DEFAULT_ACCENT]
  const values = [a.primary, a.primaryForeground, a.primary, a.primary, a.chart4]
  ACCENT_KEYS.forEach((key, i) => {
    style.setProperty(key, values[i])
  })
}

function getStored() {
  if (typeof window === 'undefined') return DEFAULT_ACCENT
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ACCENT
  } catch { return DEFAULT_ACCENT }
}

export default function useAccent() {
  const [accent, setAccent] = useState(DEFAULT_ACCENT)

  useEffect(() => {
    const stored = getStored()
    setAccent(stored)
    applyAccent(stored, document.documentElement.style)
  }, [])

  const changeAccent = useCallback((name) => {
    if (!ACCENTS[name]) return
    setAccent(name)
    applyAccent(name, document.documentElement.style)
    try { localStorage.setItem(STORAGE_KEY, name) } catch {}
  }, [])

  return { accent, changeAccent, accents: ACCENTS }
}
