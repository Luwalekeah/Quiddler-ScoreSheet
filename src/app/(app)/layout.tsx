'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { startSyncLoop } from '@/lib/sync/engine'
import { isSupabaseConfigured } from '@/lib/db/config'
import { getSupabaseBrowserClient } from '@/lib/db/supabase'
import InstallPrompt from '@/components/InstallPrompt'

/**
 * Everything under (app) is a client component. The data lives in
 * IndexedDB, which a server component cannot read, and server-rendering a
 * stale server copy would flash the wrong scores before the local copy
 * hydrates. This layout owns the two cross-screen concerns: the
 * reconnect loop and the client-side auth guard.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = startSyncLoop()
    return unsubscribe
  }, [])

  useEffect(() => {
    // No backend configured: local-only mode, nothing to guard.
    if (!isSupabaseConfigured()) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    const { data } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => data.subscription.unsubscribe()
  }, [router])

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <InstallPrompt />
      {children}
    </div>
  )
}
