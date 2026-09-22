import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../client'
import { consents, type CONSENT_TYPES } from '../../schema'

type ConsentType = (typeof CONSENT_TYPES)[number]

/** Csak hozzáfűzés: minden változás új sor (DATA_MODEL 3. pont). */
export async function recordConsent(
  userId: string,
  input: { type: ConsentType; granted: boolean; version: string; source: string },
) {
  const [row] = await db
    .insert(consents)
    .values({ ...input, userId })
    .returning()
  return row!
}

/** Típusonként a legutolsó sor az érvényes állapot. */
export async function currentConsents(
  userId: string,
): Promise<Partial<Record<ConsentType, boolean>>> {
  const rows = await db
    .select()
    .from(consents)
    .where(and(eq(consents.userId, userId)))
    .orderBy(desc(consents.createdAt))
  const out: Partial<Record<ConsentType, boolean>> = {}
  for (const r of rows) if (out[r.type] === undefined) out[r.type] = r.granted
  return out
}
