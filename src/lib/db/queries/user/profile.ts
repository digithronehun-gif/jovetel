import { eq } from 'drizzle-orm'
import { db } from '../../client'
import { profiles } from '../../schema'

export type Profile = typeof profiles.$inferSelect
export type ProfilePatch = Partial<
  Omit<typeof profiles.$inferInsert, 'userId' | 'role' | 'createdAt' | 'updatedAt'>
>

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  return row ?? null
}

/** Első belépéskor létrehozza a profilt (ha már van, nem módosít). */
export async function ensureProfile(userId: string, init: ProfilePatch = {}): Promise<Profile> {
  await db
    .insert(profiles)
    .values({ ...init, userId })
    .onConflictDoNothing({ target: profiles.userId })
  const p = await getProfile(userId)
  if (!p) throw new Error('A profil nem jött létre.')
  return p
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile | null> {
  const [row] = await db.update(profiles).set(patch).where(eq(profiles.userId, userId)).returning()
  return row ?? null
}
