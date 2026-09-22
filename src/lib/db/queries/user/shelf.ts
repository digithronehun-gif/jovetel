import { and, eq } from 'drizzle-orm'
import { db } from '../../client'
import { shelfItems } from '../../schema'

export type ShelfItem = typeof shelfItems.$inferSelect

export async function listShelfItems(userId: string, status: ShelfItem['status'] = 'active') {
  return db
    .select()
    .from(shelfItems)
    .where(and(eq(shelfItems.userId, userId), eq(shelfItems.status, status)))
}
