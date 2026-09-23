/**
 * A süti-sáv döntésének naplója a névtelen azonosítóhoz (`consents.anon_id`) — bejelentkezés nélkül is
 * igazolható, mikor és mire adott hozzájárulást a látogató. Csak hozzáfűzés (UPDATE triggerrel tiltva).
 * Ha van bejelentkezett felhasználó, a sor az ő `userId`-jához is kötődik.
 */
import { db } from '../../client'
import { consents } from '../../schema'

export async function recordCookieConsent(input: {
  anonId: string
  userId: string | null
  analytics: boolean
  marketing: boolean
  version: string
}): Promise<void> {
  await db.insert(consents).values(
    (['analytics', 'marketing'] as const).map((type) => ({
      anonId: input.anonId,
      userId: input.userId,
      type,
      granted: input[type],
      version: input.version,
      source: 'cookie_banner',
    })),
  )
}
