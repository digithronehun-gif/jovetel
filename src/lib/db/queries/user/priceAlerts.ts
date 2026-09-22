import { and, eq } from 'drizzle-orm'
import { db } from '../../client'
import { priceAlerts } from '../../schema'

export type PriceAlert = typeof priceAlerts.$inferSelect

export async function listPriceAlerts(userId: string): Promise<PriceAlert[]> {
  return db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId))
}

export async function upsertPriceAlert(userId: string, productId: string, targetPriceHuf: number) {
  const [row] = await db
    .insert(priceAlerts)
    .values({ userId, productId, targetPriceHuf, isActive: true })
    .onConflictDoUpdate({
      target: [priceAlerts.userId, priceAlerts.productId],
      set: { targetPriceHuf, isActive: true },
    })
    .returning()
  return row!
}

export async function deletePriceAlert(userId: string, alertId: string): Promise<boolean> {
  const rows = await db
    .delete(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.id, alertId)))
    .returning({ id: priceAlerts.id })
  return rows.length > 0
}
