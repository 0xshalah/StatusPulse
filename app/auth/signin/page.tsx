import { Github, AlertTriangle } from 'lucide-react'

export default function SignIn() {
  const gitHubConfigured = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)

  if (!gitHubConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">Authentication Not Configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            GitHub OAuth credentials are not set. Sign in is unavailable.
          </p>
          <div className="mt-6 rounded-lg bg-muted/50 p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground">To enable authentication:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
              <li>Create a GitHub OAuth App</li>
              <li>Set <code className="rounded bg-muted px-1 font-mono">AUTH_GITHUB_ID</code></li>
              <li>Set <code className="rounded bg-muted px-1 font-mono">AUTH_GITHUB_SECRET</code></li>
              <li>Set <code className="rounded bg-muted px-1 font-mono">AUTH_SECRET</code> (random 64-char string)</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">StatusPulse</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your endpoints</p>
        <form
          action={async () => {
            'use server'
            const { signIn } = await import('@/auth')
            await signIn('github', { redirectTo: '/dashboard' })
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[0_0_28px_-6px_rgba(225,86,124,0.7)]"
          >
            <Github className="h-5 w-5" />
            Sign in with GitHub
          </button>
        </form>
      </div>
    </div>
  )
}
