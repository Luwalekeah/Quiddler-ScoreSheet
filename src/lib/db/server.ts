/**
 * @supabase/ssr server client. Used only by the auth callback route and
 * middleware, never for data fetching. Data fetching happens client-side
 * against IndexedDB and the browser client, per section 4 of the spec.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSupabaseConfigured } from './config'

export async function getSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      db: { schema: 'quiddler' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component. Middleware refreshes the
            // session on every request, so this is safe to ignore.
          }
        },
      },
    },
  )
}
