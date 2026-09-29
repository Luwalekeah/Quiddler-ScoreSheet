'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isSupabaseConfigured } from '@/lib/db/config'
import { getSupabaseBrowserClient } from '@/lib/db/supabase'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Accounts aren&apos;t set up yet</h1>
        <p className="max-w-sm text-muted">
          This device isn&apos;t connected to a server. You can still score a full
          game. It saves on this phone and will sync once accounts are
          available.
        </p>
        <Link
          href="/games"
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg bg-accent px-6 font-medium text-accent-contrast"
        >
          Continue without an account
        </Link>
      </main>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    const supabase = getSupabaseBrowserClient()
    const next = searchParams.get('next')
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
        : undefined

    // Signup is disabled server-side, so an unknown address errors quietly.
    // Never reveal whether an address has an account: show the same
    // confirmation screen either way.
    await supabase?.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })

    router.push('/login/check-email')
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Sign in to Quiddler ScoreSheet</h1>
        <p className="mt-2 text-muted">We&apos;ll email you a link. No password to remember.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-touch rounded-lg border border-control bg-surface px-4 text-foreground"
            placeholder="you@example.com"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-touch min-w-touch rounded-lg bg-accent font-medium text-accent-contrast disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send me a link'}
        </button>
      </form>
    </main>
  )
}
