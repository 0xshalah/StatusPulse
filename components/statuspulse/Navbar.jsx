'use client'

import Link from 'next/link'
import { Activity, Github } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'

export default function Navbar({ children }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">StatusPulse</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/status"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Public Status
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {children}
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
              <Github className="h-[18px] w-[18px]" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
