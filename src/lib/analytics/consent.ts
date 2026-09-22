/**
 * Süti-hozzájárulás (CLAUDE.md 10. pont: hozzájárulás előtt nincs analitika vagy marketing-pixel).
 * Három kategória: szükséges (mindig), analitika, marketing. A süti csak a döntést tárolja; a naplót a
 * `consents` tábla (csak hozzáfűzés).
 */
import { z } from 'zod'

export const CONSENT_COOKIE = 'jv_consent'
/** A süti-tájékoztató verziója: ha változik, újra megkérdezzük a látogatót. */
export const CONSENT_VERSION = '2026-09-v1'
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180

export const CookieConsentSchema = z.object({
  v: z.string(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  at: z.string(),
})
export type CookieConsent = z.infer<typeof CookieConsentSchema>

export function parseConsent(raw: string | undefined | null): CookieConsent | null {
  if (!raw) return null
  try {
    const parsed = CookieConsentSchema.safeParse(JSON.parse(decodeURIComponent(raw)))
    if (!parsed.success || parsed.data.v !== CONSENT_VERSION) return null
    return parsed.data
  } catch {
    return null
  }
}

export function serializeConsent(c: Omit<CookieConsent, 'v' | 'at'>, now = new Date()): string {
  return encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, analytics: c.analytics, marketing: c.marketing, at: now.toISOString() }))
}
