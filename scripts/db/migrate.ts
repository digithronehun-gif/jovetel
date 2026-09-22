/**
 * pnpm db:migrate            — minden függő migráció felfelé
 * pnpm db:rollback           — az utolsó migráció visszavonása  (--steps N | --all)
 * pnpm tsx scripts/db/migrate.ts status
 * A migrációk a DIRECT_DATABASE_URL-en futnak (pooler nélkül), ha az nincs: DATABASE_URL.
 */
import postgres from 'postgres'
import {
  appliedMigrations,
  listMigrations,
  migrateDown,
  migrateUp,
} from '../../src/lib/db/migrator'
import { deploymentEnv } from '../../src/lib/env'
import { requireEnv } from '../_env'

const [cmd = 'up', ...rest] = process.argv.slice(2)
const url = process.env.DIRECT_DATABASE_URL || requireEnv('DATABASE_URL')
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })

try {
  if (cmd === 'up') {
    const done = await migrateUp(sql, { log: (m) => console.log(m) })
    console.log(done.length ? `Kész: ${done.length} migráció.` : 'Nincs függő migráció.')
  } else if (cmd === 'down') {
    if (deploymentEnv() === 'production' && !rest.includes('--force-production')) {
      console.error('Production adatbázison a visszavonás tiltott (--force-production nélkül).')
      process.exit(1)
    }
    const all = rest.includes('--all')
    const i = rest.indexOf('--steps')
    const steps = i >= 0 ? Number(rest[i + 1]) : 1
    const done = await migrateDown(sql, { all, steps, log: (m) => console.log(m) })
    console.log(`Visszavonva: ${done.length} migráció.`)
  } else if (cmd === 'status') {
    const applied = new Set(await appliedMigrations(sql))
    for (const m of listMigrations()) console.log(`${applied.has(m.name) ? '✓' : '·'} ${m.name}`)
  } else {
    console.error(`Ismeretlen parancs: ${cmd}`)
    process.exit(1)
  }
} finally {
  await sql.end()
}
