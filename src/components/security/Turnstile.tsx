'use client'

import Script from 'next/script'

/**
 * Cloudflare Turnstile widget. Kulcs nélkül (fejlesztés, teszt) nem jelenik meg — a szerver akkor
 * fejlesztésben átenged, production-ben elutasít (lib/security/turnstile).
 */
export function Turnstile({ nonce, className }: { nonce?: string; className?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} async defer />
      <div className={['cf-turnstile', className].filter(Boolean).join(' ')} data-sitekey={siteKey} data-language="hu" data-theme="auto" />
    </>
  )
}
