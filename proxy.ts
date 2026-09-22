import { NextResponse, type NextRequest } from 'next/server'
import { buildCsp, createNonce } from '@/lib/security/csp'

/**
 * Minden oldal-kérés előtt fut (Next 16: a `middleware` utódja):
 *  - szigorú CSP új nonce-szal (a Next.js a saját scriptjeire automatikusan ráteszi).
 * Sütit itt NEM állítunk: hozzájárulás előtt csak a szükséges sütik jöhetnek létre, azok is csak döntéskor.
 * A jogosultságot SOHA nem itt döntjük el (4. vasszabály): ez csak kényelmi réteg.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce()
  const dev = process.env.NODE_ENV === 'development'
  const csp = buildCsp({
    nonce,
    dev,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|go|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons|brand|robots.txt|sitemap).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
