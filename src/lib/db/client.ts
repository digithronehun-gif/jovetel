/**
 * Alkalmazás-kliens (`db`): szerveroldali Drizzle, a Supabase pooleren át (`prepare: false`).
 * Csak lekérdező függvényekből használd; felhasználói táblát CSAK `queries/user/*` olvas, userId-val.
 */
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema'

export type Db = PostgresJsDatabase<typeof schema>

interface Cached {
  sql?: Sql
  db?: Db
}
const g = globalThis as typeof globalThis & { __jovetelDb?: Cached }
const cache: Cached = (g.__jovetelDb ??= {})

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('Hiányzik a DATABASE_URL (helyben: pnpm local:up, majd pnpm dev:local).')
  }
  return url
}

export function getSql(): Sql {
  cache.sql ??= postgres(databaseUrl(), {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  })
  return cache.sql
}

export function getDb(): Db {
  cache.db ??= drizzle(getSql(), { schema, casing: 'snake_case' })
  return cache.db
}

/** Lusta proxy: az első használatkor kapcsolódik (a build nem igényel adatbázist). */
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>
    const value = real[prop]
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value
  },
})

export async function closeDb(): Promise<void> {
  if (cache.sql) await cache.sql.end({ timeout: 5 })
  cache.sql = undefined
  cache.db = undefined
}

export { schema }
