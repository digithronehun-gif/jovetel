import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  appliedMigrations,
  listMigrations,
  migrateDown,
  migrateUp,
} from '../../src/lib/db/migrator'
import * as schema from '../../src/lib/db/schema'
import { createTestDatabase } from './prepare'

let sql: postgres.Sql

async function publicTables(): Promise<string[]> {
  const rows = await sql<{ t: string }[]>`
    select table_name as t from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> 'app_migrations'
      and table_name not like 'price_daily_%'`
  return rows.map((r) => r.t).sort()
}

beforeAll(async () => {
  const url = await createTestDatabase('jovetel_test_migrations', { migrate: false })
  sql = postgres(url, { max: 1, onnotice: () => {} })
})
afterAll(async () => {
  await sql?.end()
})

describe('migrációk (F1 elfogadási kritérium: fel és vissza is lefut)', () => {
  it('fel → vissza → fel', async () => {
    const all = listMigrations().map((m) => m.name)
    expect(await migrateUp(sql)).toEqual(all)
    const tablesUp = await publicTables()
    expect(tablesUp.length).toBeGreaterThanOrEqual(32)

    expect(await migrateDown(sql, { all: true })).toEqual([...all].reverse())
    expect(await publicTables()).toEqual([])
    expect(await appliedMigrations(sql)).toEqual([])

    expect(await migrateUp(sql)).toEqual(all)
    expect(await publicTables()).toEqual(tablesUp)
  })

  it('lépésenkénti visszavonás és újra-alkalmazás', async () => {
    const last = listMigrations().at(-1)!.name
    expect(await migrateDown(sql, { steps: 1 })).toEqual([last])
    expect(await migrateUp(sql)).toEqual([last])
  })

  it('a Drizzle séma pontosan tükrözi az adatbázist (nincs drift)', async () => {
    const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable))
    expect(tables.length).toBeGreaterThanOrEqual(32)
    for (const t of tables) {
      const cfg = getTableConfig(t)
      const schemaName = cfg.schema ?? 'public'
      if (schemaName === 'auth') continue
      const cols = await sql<{ c: string; nullable: string }[]>`
        select column_name as c, is_nullable as nullable from information_schema.columns
        where table_schema = ${schemaName} and table_name = ${cfg.name}`
      const dbCols = new Map(cols.map((c) => [c.c, c.nullable === 'YES']))
      expect([...dbCols.keys()].sort(), cfg.name).toEqual(cfg.columns.map((c) => c.name).sort())
      for (const c of cfg.columns) {
        if (c.generated) continue
        expect(dbCols.get(c.name), `${cfg.name}.${c.name} nullable`).toBe(!c.notNull)
      }
    }
  })

  it('price_daily havi partíciókkal', async () => {
    const [r] = await sql<
      { n: number }[]
    >`select count(*)::int as n from pg_inherits where inhparent = 'public.price_daily'::regclass`
    expect(r!.n).toBeGreaterThanOrEqual(18)
  })

  it('RLS minden public táblán be van kapcsolva', async () => {
    const rows = await sql<{ relname: string }[]>`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
        and c.relname <> 'app_migrations'`
    expect(rows.map((r) => r.relname)).toEqual([])
  })
})
