'use server'

import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { CONSENT_COOKIE, CONSENT_MAX_AGE, CONSENT_VERSION, serializeConsent } from '@/lib/analytics/consent'
import { db } from '@/lib/db/client'
import { consents } from '@/lib/db/schema'
import { clientIp, hashIdentifier } from '@/lib/security/ip'
import { rateLimit, RULES } from '@/lib/security/ratelimit'

const Input = z.object({ analytics: z.boolean(), marketing: z.boolean() })

/** A süti-sáv döntése: süti + napló a consents táblába (típusonként egy sor, csak hozzáfűzés). */
export async function saveCookieConsent(raw: unknown): Promise<{ ok: boolean }> {
  const input = Input.safeParse(raw)
  if (!input.success) return { ok: false }
  const h = await headers()
  const limit = await rateLimit(RULES.consent, hashIdentifier(clientIp(h)))
  if (!limit.ok) return { ok: false }

  const jar = await cookies()
  jar.set(CONSENT_COOKIE, serializeConsent(input.data), {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CONSENT_MAX_AGE,
    httpOnly: false, // a kliensoldali PostHog-kapu is olvassa
  })

  // névtelen azonosító a döntés igazolásához (szükséges süti, a döntéskor jön létre)
  let anonId = jar.get('jv_anon')?.value
  if (!anonId || !/^[0-9a-f-]{36}$/.test(anonId)) {
    anonId = crypto.randomUUID()
    jar.set('jv_anon', anonId, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  try {
    await db.insert(consents).values(
      (['analytics', 'marketing'] as const).map((type) => ({
        anonId,
        type,
        granted: input.data[type],
        version: CONSENT_VERSION,
        source: 'cookie_banner',
      })),
    )
  } catch (e) {
    // a süti akkor is érvényes, ha a napló átmenetileg nem írható; a hibát jelezzük
    console.error('consents napló sikertelen', (e as Error).message)
  }
  return { ok: true }
}
