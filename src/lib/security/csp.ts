/**
 * Content-Security-Policy nonce-szal (CLAUDE.md 11. pont, ARCHITECTURE 8. pont). A `proxy.ts` hívja
 * minden oldal-kérésre új, véletlen nonce-szal. A feedből jövő HTML soha nem markup, a script csak nonce-szal fut.
 */
export interface CspOptions {
  nonce: string
  dev?: boolean
  supabaseUrl?: string | null
  posthogHost?: string | null
  sentryDsn?: string | null
  /** alapból minden nem-fejlesztői környezetben be van kapcsolva */
  upgradeInsecureRequests?: boolean
}

function origin(url?: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export function buildCsp(o: CspOptions): string {
  const supabase = origin(o.supabaseUrl)
  const posthog = origin(o.posthogHost)
  const posthogAssets = posthog?.replace('://eu.i.', '://eu-assets.i.').replace('://us.i.', '://us-assets.i.')
  const sentry = origin(o.sentryDsn ? o.sentryDsn.replace(/\/\/[^@]*@/, '//') : null)
  const connect = ["'self'", supabase, supabase?.replace(/^http/, 'ws'), posthog, posthogAssets, sentry]
  const directives: Record<string, (string | null | undefined | false)[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${o.nonce}'`,
      "'strict-dynamic'",
      // régebbi, strict-dynamic-et nem ismerő böngészőknek
      'https://challenges.cloudflare.com',
      o.dev && "'unsafe-eval'",
    ],
    // a stílus-attribútumokhoz (Radix, next/image) inline stílus kell; script-injekció ettől nem nyílik
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': connect,
    'frame-src': ['https://challenges.cloudflare.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  }
  const parts = Object.entries(directives).map(
    ([k, v]) => `${k} ${[...new Set(v.filter((x): x is string => Boolean(x)))].join(' ')}`,
  )
  if (o.upgradeInsecureRequests ?? !o.dev) parts.push('upgrade-insecure-requests')
  return parts.join('; ')
}

/** Kriptografikusan véletlen nonce (Edge- és Node-futtatókörnyezetben is). */
export function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
