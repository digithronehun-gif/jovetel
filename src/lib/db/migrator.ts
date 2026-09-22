/**
 * Egyszerű, kétirányú SQL-migrációs futtató. A fájlok: `migrations/NNNN_nev.up.sql` + `.down.sql`.
 * Minden migráció külön tranzakcióban fut; a napló a `public.app_migrations` tábla.
 * (A Drizzle migrátora nem ismeri a visszafelé irányt, ezért saját — lásd DATA_MODEL / F1.)
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Sql } from 'postgres'

export const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations')

export interface Migration {
  name: string
  up: string
  down: string
}

export function listMigrations(dir = MIGRATIONS_DIR): Migration[] {
  const files = readdirSync(dir)
  const names = [
    ...new Set(files.filter((f) => f.endsWith('.up.sql')).map((f) => f.replace(/\.up\.sql$/, ''))),
  ].sort()
  return names.map((name) => {
    const downFile = `${name}.down.sql`
    if (!files.includes(downFile))
      throw new Error(`Hiányzik a visszafelé irányú migráció: ${downFile}`)
    return {
      name,
      up: readFileSync(join(dir, `${name}.up.sql`), 'utf8'),
      down: readFileSync(join(dir, downFile), 'utf8'),
    }
  })
}

async function ensureLog(sql: Sql) {
  await sql`create table if not exists public.app_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`
}

export async function appliedMigrations(sql: Sql): Promise<string[]> {
  await ensureLog(sql)
  const rows = await sql<{ name: string }[]>`select name from public.app_migrations order by name`
  return rows.map((r) => r.name)
}

export async function migrateUp(sql: Sql, opts: { dir?: string; log?: (m: string) => void } = {}) {
  const log = opts.log ?? (() => {})
  const applied = new Set(await appliedMigrations(sql))
  const done: string[] = []
  for (const m of listMigrations(opts.dir)) {
    if (applied.has(m.name)) continue
    await sql.begin(async (tx) => {
      await tx.unsafe(m.up)
      await tx`insert into public.app_migrations (name) values (${m.name})`
    })
    log(`↑ ${m.name}`)
    done.push(m.name)
  }
  return done
}

export async function migrateDown(
  sql: Sql,
  opts: { dir?: string; steps?: number; all?: boolean; log?: (m: string) => void } = {},
) {
  const log = opts.log ?? (() => {})
  const applied = await appliedMigrations(sql)
  const byName = new Map(listMigrations(opts.dir).map((m) => [m.name, m]))
  const count = opts.all ? applied.length : Math.min(opts.steps ?? 1, applied.length)
  const targets = applied.slice(-count).reverse()
  const done: string[] = []
  for (const name of targets) {
    const m = byName.get(name)
    if (!m) throw new Error(`A(z) ${name} migráció fájlja hiányzik, nem vonható vissza.`)
    await sql.begin(async (tx) => {
      await tx.unsafe(m.down)
      await tx`delete from public.app_migrations where name = ${name}`
    })
    log(`↓ ${name}`)
    done.push(name)
  }
  return done
}
