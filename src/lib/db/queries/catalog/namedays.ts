import { asc, eq, sql } from 'drizzle-orm'
import { db } from '../../client'
import { namedays } from '../../schema'

export type NamedayRow = typeof namedays.$inferSelect

/** A keresztnév összes névnapja, ékezet- és kisbetű-függetlenül (a rangsorolás a lib/occasions-ben). */
export async function findNamedayRows(firstName: string): Promise<NamedayRow[]> {
  const trimmed = firstName.trim()
  if (!trimmed) return []
  return db
    .select()
    .from(namedays)
    .where(eq(namedays.nameNormalized, sql`public.f_normalize(${trimmed})`))
    .orderBy(asc(namedays.month), asc(namedays.day))
}
