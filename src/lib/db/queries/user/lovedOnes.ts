import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../client'
import { lovedOnes } from '../../schema'

export type LovedOne = typeof lovedOnes.$inferSelect
export type LovedOneInput = Omit<
  typeof lovedOnes.$inferInsert,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>

export async function listLovedOnes(userId: string): Promise<LovedOne[]> {
  return db
    .select()
    .from(lovedOnes)
    .where(eq(lovedOnes.userId, userId))
    .orderBy(asc(lovedOnes.createdAt))
}

export async function getLovedOne(userId: string, id: string): Promise<LovedOne | null> {
  const [row] = await db
    .select()
    .from(lovedOnes)
    .where(and(eq(lovedOnes.userId, userId), eq(lovedOnes.id, id)))
    .limit(1)
  return row ?? null
}

export async function createLovedOne(userId: string, input: LovedOneInput): Promise<LovedOne> {
  const [row] = await db
    .insert(lovedOnes)
    .values({ ...input, userId })
    .returning()
  return row!
}

export async function updateLovedOne(userId: string, id: string, patch: Partial<LovedOneInput>) {
  const [row] = await db
    .update(lovedOnes)
    .set(patch)
    .where(and(eq(lovedOnes.userId, userId), eq(lovedOnes.id, id)))
    .returning()
  return row ?? null
}

export async function deleteLovedOne(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(lovedOnes)
    .where(and(eq(lovedOnes.userId, userId), eq(lovedOnes.id, id)))
    .returning({ id: lovedOnes.id })
  return rows.length > 0
}
