import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the session cookie on every request and guards /games/*.
 *
 * When no backend is configured (NEXT_PUBLIC_SUPABASE_URL unset) this is a
 * pass-through: the app runs local-first with no account, which is the
 * only honest behaviour while the tunnel and schema are not deployed.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    db: { schema: 'quiddler' },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (!user && pathname.startsWith('/games')) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/games', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/|sw\\.js|manifest\\.webmanifest|icons/|apple-touch-icon\\.png|offline|favicon\\.ico).*)',
  ],
}
