import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')

/** A DB-tesztek alap-kapcsolata: TEST_DATABASE_ADMIN_URL, vagy a helyi stack (pnpm local:up). */
export function adminDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_ADMIN_URL) return process.env.TEST_DATABASE_ADMIN_URL
  const file = join(ROOT, '.local/stack.env')
  if (existsSync(file)) {
    const m = readFileSync(file, 'utf8').match(/^DATABASE_URL=(.+)$/m)
    if (m) return m[1]!.trim()
  }
  return 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
}

export function withDatabase(url: string, dbName: string): string {
  const u = new URL(url)
  u.pathname = `/${dbName}`
  return u.toString()
}

export const ROOT_DIR = ROOT
