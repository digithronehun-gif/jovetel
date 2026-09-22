import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../client'
import { lists } from '../../schema'

export type List = typeof lists.$inferSelect

export async function listMyLists(userId: string): Promise<List[]> {
  return db
    .select()
    .from(lists)
    .where(and(eq(lists.ownerId, userId)))
    .orderBy(desc(lists.updatedAt))
}

export async function getMyList(userId: string, listId: string): Promise<List | null> {
  const [row] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.ownerId, userId), eq(lists.id, listId)))
    .limit(1)
  return row ?? null
}
