import { randomUUID } from 'node:crypto'
import postgres from 'postgres'

export function testSql() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) throw new Error('Nincs TEST_DATABASE_URL (a global-setup állítja be).')
  return postgres(url, { max: 4, prepare: false, onnotice: () => {} })
}

/** Teszt-felhasználó az auth-shimben + profil. */
export async function createUser(sql: postgres.Sql, email = `${randomUUID()}@teszt.local`) {
  const [u] = await sql<
    { id: string }[]
  >`insert into auth.users (email) values (${email}) returning id`
  await sql`insert into public.profiles (user_id, first_name) values (${u!.id}, 'Teszt')`
  return u!.id
}

export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]!
}
