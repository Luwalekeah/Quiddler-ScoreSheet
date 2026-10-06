/**
 * Browser Supabase client. Returns null when NEXT_PUBLIC_SUPABASE_URL is
 * unset so the app can degrade to local-only mode instead of crashing.
 * Every caller in the sync layer must handle a null client by skipping the
 * network call, not by throwing.
 */

import { createBrowserClient } from '@supabase/ssr'
import { isSupabaseConfigured } from './config'

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>

let client: SupabaseBrowserClient | null = null

export function getSupabaseBrowserClient(): SupabaseBrowserClient | null {
  if (!isSupabaseConfigured()) return null
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { db: { schema: 'quiddler' } },
  )
  return client
}
