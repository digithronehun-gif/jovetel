import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { migrateUp } from '../../src/lib/db/migrator'
import { adminDatabaseUrl, ROOT_DIR, withDatabase } from './env'

/** Friss teszt-adatbázis: bootstrap (szerepkörök) + auth-shim + (opcionálisan) minden migráció. */
export async function createTestDatabase(
  name: string,
  opts: { migrate?: boolean } = {},
): Promise<string> {
  const adminUrl = adminDatabaseUrl()
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} })
  try {
    await admin.unsafe(`drop database if exists "${name}" with (force)`)
    await admin.unsafe(`create database "${name}"`)
  } finally {
    await admin.end()
  }
  const url = withDatabase(adminUrl, name)
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await sql.unsafe(readFileSync(join(ROOT_DIR, 'scripts/local-stack/bootstrap.sql'), 'utf8'))
    await sql.unsafe(readFileSync(join(ROOT_DIR, 'scripts/local-stack/auth-shim.sql'), 'utf8'))
    if (opts.migrate !== false) await migrateUp(sql)
  } finally {
    await sql.end()
  }
  return url
}
