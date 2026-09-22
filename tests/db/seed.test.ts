import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { runSeed } from '../../src/lib/db/seed/run'
import { testSql } from './helpers'

const sql = testSql()
afterAll(async () => {
  await sql.end()
})

async function createAuthUser(email: string) {
  const [u] = await sql<{ id: string }[]>`insert into auth.users (email) values (${email})
    on conflict (email) do update set email = excluded.email returning id`
  return u!.id
}

describe('seed (DATA_MODEL 6. pont)', () => {
  it('lefut, és a várt mennyiségeket hozza létre', async () => {
    const res = await runSeed(sql, {
      products: 300,
      adminEmail: 'admin@teszt.local',
      createAuthUser,
      withNamedays: false,
    })
    expect(res.productIds).toHaveLength(300)
    const [m] = await sql<{ n: number; demo: number }[]>`
      select count(*)::int as n, count(*) filter (where name like '[DEMO]%')::int as demo from public.merchants`
    expect(m!.n).toBe(3)
    expect(m!.demo).toBe(3)
    const [h] = await sql<
      { days: number }[]
    >`select max(c)::int as days from (select count(*) c from public.price_daily group by offer_id) x`
    expect(h!.days).toBe(45)
    const [g] = await sql<
      { n: number }[]
    >`select count(*)::int as n from public.lists where type = 'editorial'`
    expect(g!.n).toBe(3)
    const [adm] = await sql<
      { role: string }[]
    >`select p.role from public.profiles p join auth.users u on u.id = p.user_id where u.email = 'admin@teszt.local'`
    expect(adm!.role).toBe('admin')
  })

  it('idempotens: újrafuttatva sem duplikál', async () => {
    await runSeed(sql, { products: 300, createAuthUser, withNamedays: false })
    const [p] = await sql<
      { n: number }[]
    >`select count(*)::int as n from public.products where slug not like 'fp-%'`
    expect(p!.n).toBe(300)
  })

  it('production-nek jelölt adatbázison nem fut', async () => {
    const one = postgres(process.env.TEST_DATABASE_URL!, { max: 1, onnotice: () => {} })
    try {
      await one.unsafe(`set app.environment = 'production'`)
      await expect(runSeed(one, { products: 1, withNamedays: false })).rejects.toThrow(/production/)
    } finally {
      await one.end()
    }
  })
})
