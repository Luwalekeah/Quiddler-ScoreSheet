import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/db/config'
import { getSupabaseServerClient } from '@/lib/db/server'

export default async function Home() {
  if (!isSupabaseConfigured()) {
    // No backend deployed yet: the app runs local-first with no account.
    redirect('/games')
  }

  const supabase = await getSupabaseServerClient()
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  redirect(data.user ? '/games' : '/login')
}
