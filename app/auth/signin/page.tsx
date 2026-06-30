import { Github, AlertTriangle, Shield, Lock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import SignInButton from '@/components/auth/SignInButton'

export default function SignIn() {
  const gitHubConfigured = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left: Brand + Trust */}
      <div className="hidden flex-1 flex-col justify-between bg-muted/30 p-12 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </span>
            <span className="font-display text-xl font-bold tracking-tight">StatusPulse</span>
          </Link>
          <div className="mt-16 max-w-sm">
            <h1 className="font-display text-3xl font-bold leading-tight">
              Monitor your APIs.<br />
              <span className="text-primary">Never miss a beat.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Sign in to manage your endpoints, configure alerts, and embed live status badges.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-status-up" />
            <div>
              <p className="text-sm font-semibold">Secure by default</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We use GitHub OAuth. Your credentials are never stored — only your public profile info.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-status-up" />
            <div>
              <p className="text-sm font-semibold">Open source</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Self-host or use the managed service. Apache 2.0 licensed. Your data, your rules.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
            {' '}and{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </span>
            <span className="font-display text-xl font-bold tracking-tight">StatusPulse</span>
          </Link>

          {!gitHubConfigured ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-xl font-bold">Authentication Not Configured</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                GitHub OAuth credentials are not set in the environment variables.
              </p>
              <div className="mt-6 rounded-xl bg-muted/50 p-4 text-left">
                <p className="text-xs font-semibold">Setup instructions:</p>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs text-muted-foreground">
                  <li>
                    <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                      Create a GitHub OAuth App <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Callback URL: <code className="rounded bg-muted px-1 font-mono text-[11px]">{process.env.NEXT_PUBLIC_BASE_URL || 'https://statuspulse.edgeone.dev'}/api/auth/callback/github</code></li>
                  <li>Set <code className="rounded bg-muted px-1 font-mono text-[11px]">AUTH_GITHUB_ID</code></li>
                  <li>Set <code className="rounded bg-muted px-1 font-mono text-[11px]">AUTH_GITHUB_SECRET</code></li>
                  <li>Set <code className="rounded bg-muted px-1 font-mono text-[11px]">AUTH_SECRET</code> (run <code className="rounded bg-muted px-1 font-mono text-[11px]">openssl rand -base64 32</code>)</li>
                  <li>Redeploy the application</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold">Welcome back</h2>
                <p className="mt-2 text-sm text-muted-foreground">Sign in to your account to continue</p>
              </div>
              <div className="mt-8">
                <SignInButton />
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 text-status-up" />
                  We only access your public profile — no repo access needed.
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-status-up" />
                  Your data stays private. We never store GitHub tokens.
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            By signing in, you agree to our{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
            {' '}and{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
