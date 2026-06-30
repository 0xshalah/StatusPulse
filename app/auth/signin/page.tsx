import { signIn } from '@/auth'
import { Github } from 'lucide-react'

export default function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">StatusPulse</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your endpoints</p>
        <form
          action={async () => {
            'use server'
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
