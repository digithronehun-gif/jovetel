import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { posthogConfig } from '@/lib/analytics/posthog'
import { buildCsp, createNonce } from '@/lib/security/csp'

/** Supabase-session süti (`sb-<projekt>-auth-token`, darabolva `.0`, `.1` …). */
const isAuthCookie = (name: string) => name.startsWith('sb-') && name.includes('-auth-token')

/**
 * Minden oldal-kérés előtt fut (Next 16: a `middleware` utódja):
 *  - szigorú CSP új nonce-szal (a Next.js a saját scriptjeire automatikusan ráteszi);
 *  - a bejelentkezett felhasználó sessionjének frissítése (lejárt access token → új token a sütiben). Server
 *    Componentből süti nem írható, ezért ez itt történik (`@supabase/ssr` ajánlása). Csak akkor fut, ha már van
 *    auth-süti: névtelen látogatónál nincs hálózati hívás, és süti sem jön létre (hozzájárulás előtt sem).
 * A jogosultságot SOHA nem itt döntjük el (4. vasszabály): ez csak kényelmi réteg.
 */
export async function proxy(request: NextRequest) {
  const nonce = createNonce()
  const dev = process.env.NODE_ENV === 'development'
  const csp = buildCsp({
    nonce,
    dev,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    posthogHost: posthogConfig()?.host,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // helyi `next start` (http) alatt a kérések felminősítése elrontaná a helyi Supabase-hívásokat
    upgradeInsecureRequests: request.nextUrl.protocol === 'https:',
  })

  const forward = () => {
    const headers = new Headers(request.headers)
    headers.set('x-nonce', nonce)
    headers.set('content-security-policy', csp)
    const res = NextResponse.next({ request: { headers } })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }
  let response = forward()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anonKey && request.cookies.getAll().some((c) => isAuthCookie(c.name))) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          // a frissített süti a mostani kérés Server Componentjeihez és a válaszhoz is eljut
          for (const { name, value } of list) request.cookies.set(name, value)
          response = forward()
          for (const { name, value, options } of list) response.cookies.set(name, value, options)
        },
      },
    })
    try {
      await supabase.auth.getUser()
    } catch {
      // az Auth szerver elérhetetlensége nem akadályozhatja az oldal kiszolgálását
    }
  }
  return response
}

export const config = {
  matcher: [
    {
      // az előtagok perjellel: egy későbbi `/gondolatok` vagy `/brandek` útvonal ne veszítse el a CSP-t
      source: '/((?!api/|go/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/|brand/|robots.txt|sitemap).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
