/**
 * Whether a Supabase backend is configured at all. The tunnel and schema
 * are not deployed yet, so this is false in every environment right now,
 * and the app must run fully local-first against IndexedDB when it is.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
