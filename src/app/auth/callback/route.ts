import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/db/server'

/** Only a same-origin relative path is a safe redirect target. Anything else is an open redirect. */
function safeNext(next: string | null): string {
  if (!next) return '/games'
  if (!next.startsWith('/') || next.startsWith('//')) return '/games'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await getSupabaseServerClient()
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
