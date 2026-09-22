/**
 * Várólista (PRODUCT_SPEC 3.11): double opt-in. A megerősítő tokent csak hash-ként tároljuk.
 * Nem felhasználói (userId-s) tábla: az e-mail-cím a kulcs.
 */
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../client'
import { consents, waitlist } from '../schema'

export const WAITLIST_TOKEN_TTL_DAYS = 7
export const WAITLIST_CONSENT_VERSION = 'waitlist-2026-09-v1'

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex')

export type SubscribeResult =
  | { status: 'pending'; token: string; email: string }
  | { status: 'already_confirmed'; email: string }

export async function subscribeWaitlist(input: {
  email: string
  useCase: 'gifts' | 'beauty' | 'both' | null
  marketingConsent: boolean
  source: Record<string, string>
}): Promise<SubscribeResult> {
  const email = input.email.trim().toLowerCase()
  const [existing] = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1)
  if (existing?.confirmedAt) return { status: 'already_confirmed', email }
  const token = randomBytes(32).toString('base64url')
  const values = {
    email,
    useCase: input.useCase,
    marketingConsent: input.marketingConsent,
    source: input.source,
    confirmTokenHash: hashToken(token),
  }
  await db
    .insert(waitlist)
    .values(values)
    .onConflictDoUpdate({
      target: waitlist.email,
      set: {
        useCase: values.useCase,
        marketingConsent: values.marketingConsent,
        confirmTokenHash: values.confirmTokenHash,
        updatedAt: new Date(),
      },
    })
  return { status: 'pending', token, email }
}

export type ConfirmResult = { ok: true; email: string; alreadyConfirmed?: boolean } | { ok: false; reason: 'invalid' | 'expired' }

export async function confirmWaitlist(token: string, now = new Date()): Promise<ConfirmResult> {
  if (!token || token.length < 20) return { ok: false, reason: 'invalid' }
  const hash = hashToken(token)
  const [row] = await db.select().from(waitlist).where(eq(waitlist.confirmTokenHash, hash)).limit(1)
  if (!row) return { ok: false, reason: 'invalid' }
  if (row.confirmedAt) return { ok: true, email: row.email, alreadyConfirmed: true }
  const age = now.getTime() - row.updatedAt.getTime()
  if (age > WAITLIST_TOKEN_TTL_DAYS * 864e5) return { ok: false, reason: 'expired' }
  const updated = await db
    .update(waitlist)
    .set({ confirmedAt: now })
    .where(and(eq(waitlist.id, row.id), isNull(waitlist.confirmedAt)))
    .returning({ id: waitlist.id })
  if (updated.length) {
    // a marketing-hozzájárulás a megerősítéssel igazolt (double opt-in), csak hozzáfűzés
    await db.insert(consents).values({
      email: row.email,
      type: 'marketing_email',
      granted: row.marketingConsent,
      version: WAITLIST_CONSENT_VERSION,
      source: 'waitlist_confirm',
    })
  }
  return { ok: true, email: row.email }
}
