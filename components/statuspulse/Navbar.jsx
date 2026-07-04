'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Activity, Github, LogIn, User } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import AccentPicker from './AccentPicker'
import { Button } from '@/components/ui/button'

export default function Navbar({ children }) {
  const { data: session } = useSession()
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
            <Link href="/dashboard" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Dashboard</Link>
            <Link href="/status" className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Public Status</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {children}
          <ThemeToggle />
          <span className="hidden sm:contents"><AccentPicker /></span>
          {session ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 pl-3 pr-2 py-1.5">
              {session.user?.image ? (
                <img src={session.user.image} alt="" className="h-5 w-5 rounded-full" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{session.user?.name?.split(' ')[0] || 'User'}</span>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Link href="/auth/signin">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
            <a href="https://github.com/0xshalah/StatusPulse" target="_blank" rel="noreferrer" aria-label="GitHub">
              <Github className="h-[18px] w-[18px]" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
