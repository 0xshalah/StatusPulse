'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Github, Loader2, AlertCircle } from 'lucide-react'

export default function SignInButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = () => {
    setLoading(true)
    setError('')
    signIn('github', { callbackUrl: '/dashboard' })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-down/10 border border-status-down/20 p-3 text-xs text-status-down">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#24292e] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#2f363d] hover:shadow-[0_8px_30px_-8px_rgba(36,41,46,0.6)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirecting to GitHub…
          </>
        ) : (
          <>
            <Github className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            Sign in with GitHub
          </>
        )}
      </button>
    </div>
  )
}
